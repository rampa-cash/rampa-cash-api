import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, QueryRunner } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { UserService } from '../../user/services/user.service';
import { AuthService } from './auth.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletType } from '../../wallet/entities/wallet.entity';
import {
    UserVerificationStatus,
    UserStatus,
    Language,
} from '../../user/entities/user.entity';
import { AddressUtils } from '../../solana/utils/address.utils';

export interface Web3AuthJwtPayload {
    iat: number;
    aud: string;
    nonce: string;
    iss: string;
    wallets: Array<{
        public_key: string;
        type: string;
        curve: string;
    }>;
    email: string;
    name: string;
    profileImage?: string;
    verifier: string;
    authConnectionId: string;
    verifierId: string;
    userId: string;
    aggregateVerifier?: string;
    groupedAuthConnectionId?: string;
    exp: number;
}

export interface Web3AuthUser {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    verifier: string;
    verifierId: string;
    typeOfLogin: string;
    aggregateVerifier?: string;
    aggregateVerifierId?: string;
    loginMethod?: string;
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };
}

// Custom error types for wallet creation failures
export class WalletCreationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly retryable: boolean = false,
    ) {
        super(message);
        this.name = 'WalletCreationError';
    }
}

export class AddressValidationError extends Error {
    constructor(
        message: string,
        public readonly address: string,
    ) {
        super(message);
        this.name = 'AddressValidationError';
    }
}

export class AddressConflictError extends Error {
    constructor(
        message: string,
        public readonly address: string,
    ) {
        super(message);
        this.name = 'AddressConflictError';
    }
}

@Injectable()
export class Web3AuthValidationService {
    private jwksClient: jwksClient.JwksClient;
    private readonly logger = new Logger(Web3AuthValidationService.name);

    // Simple metrics tracking
    private walletCreationMetrics = {
        totalAttempts: 0,
        successfulCreations: 0,
        failedCreations: 0,
        retryAttempts: 0,
        averageRetryTime: 0,
    };

    constructor(
        private configService: ConfigService,
        private jwtService: JwtService,
        private userService: UserService,
        private authService: AuthService,
        private walletService: WalletService,
        private dataSource: DataSource,
    ) {
        // Initialize JWKS client for Web3Auth
        this.jwksClient = jwksClient({
            jwksUri:
                this.configService.get<string>('WEB3AUTH_JWKS_URI') ||
                'https://api-auth.web3auth.io/jwks',
            cache: true,
            cacheMaxAge: 600000, // 10 minutes
            rateLimit: true,
            jwksRequestsPerMinute: 5,
        });
    }

    /**
     * Validates a Web3Auth JWT token using JWKS (recommended approach)
     */
    async validateWeb3AuthJWT(token: string): Promise<Web3AuthUser> {
        try {
            // Get the key ID from the JWT header
            const decodedHeader = jwt.decode(token, { complete: true });
            if (!decodedHeader || !decodedHeader.header.kid) {
                throw new UnauthorizedException('Invalid token header');
            }

            // Get the signing key from JWKS
            const key = await this.getSigningKey(decodedHeader.header.kid);

            // Verify the JWT token
            const decoded = jwt.verify(token, key, {
                issuer:
                    this.configService.get<string>('WEB3AUTH_ISSUER') ||
                    'https://api-auth.web3auth.io',
                algorithms: ['ES256'],
            }) as Web3AuthJwtPayload;

            // Validate required fields
            if (!decoded.userId || !decoded.verifierId) {
                throw new UnauthorizedException(
                    'Invalid Web3Auth token: missing required fields',
                );
            }

            // Extract wallet addresses from Web3Auth JWT
            const walletAddresses = this.extractWalletAddresses(
                decoded.wallets,
            );

            // Detect login method from aggregateVerifier
            const loginMethod = this.getLoginMethod(
                decoded.aggregateVerifier || decoded.verifier,
            );

            // Map JWT payload to Web3Auth user format
            const web3AuthUser: Web3AuthUser = {
                id: decoded.userId,
                email: decoded.email,
                phone: this.extractPhoneFromJWT(decoded),
                firstName: decoded.name?.split(' ')[0] || '',
                lastName: decoded.name?.split(' ').slice(1).join(' ') || '',
                profileImage: decoded.profileImage,
                verifier: decoded.verifier,
                verifierId: decoded.verifierId,
                typeOfLogin: decoded.aggregateVerifier || decoded.verifier,
                aggregateVerifier: decoded.aggregateVerifier,
                aggregateVerifierId: decoded.groupedAuthConnectionId,
                loginMethod,
                walletAddresses,
            };

            return web3AuthUser;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedException('Invalid Web3Auth token');
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedException('Web3Auth token expired');
            }
            if (error instanceof jwt.NotBeforeError) {
                throw new UnauthorizedException('Web3Auth token not active');
            }
            throw error;
        }
    }

    /**
     * Gets the signing key from JWKS
     */
    private async getSigningKey(kid: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.jwksClient.getSigningKey(kid, (err, key) => {
                if (err) {
                    reject(new UnauthorizedException('Unable to verify token'));
                } else if (!key) {
                    reject(
                        new UnauthorizedException('Unable to find signing key'),
                    );
                } else {
                    resolve(key.getPublicKey());
                }
            });
        });
    }

    /**
     * Validates Web3Auth user and creates/updates user in database
     * T282-T286: Atomic user + wallet creation with proper rollback logic
     */
    async validateAndCreateUser(web3AuthUser: Web3AuthUser): Promise<any> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(
                `Starting Web3Auth user validation for: ${web3AuthUser.id}`,
            );

            // Map Web3Auth verifier to our AuthProvider enum
            const authProvider = this.mapVerifierToAuthProvider(
                web3AuthUser.verifier,
            );

            // Check if user already exists
            let user = await this.userService.findByAuthProvider(
                authProvider,
                web3AuthUser.verifierId,
            );

            if (!user) {
                // T282: Create new user and wallet atomically
                user = await this.createUserAndWalletAtomic(
                    queryRunner,
                    web3AuthUser,
                    authProvider,
                );
            } else {
                // Update existing user information
                await this.updateExistingUser(queryRunner, user, web3AuthUser);
            }

            // Update last login
            if (user) {
                await this.userService.updateLastLogin(user.id);
                this.logger.log(
                    `Successfully processed Web3Auth user: ${user.id}`,
                );
            }

            // Commit transaction
            await queryRunner.commitTransaction();
            this.logger.log(
                `Transaction committed successfully for user: ${user?.id || 'unknown'}`,
            );

            return user;
        } catch (error) {
            // T283: Rollback transaction on any error
            await queryRunner.rollbackTransaction();
            this.logger.error(
                `Transaction rolled back for Web3Auth user: ${web3AuthUser.id}. Error: ${error.message}`,
                error.stack,
            );

            // T302: Improved error handling with specific error types
            if (error instanceof AddressValidationError) {
                throw new BadRequestException(
                    `Invalid wallet address: ${error.address}. ${error.message}`,
                );
            }

            if (error instanceof AddressConflictError) {
                throw new BadRequestException(
                    `Wallet address conflict: ${error.address}. ${error.message}`,
                );
            }

            if (error instanceof WalletCreationError) {
                if (error.retryable) {
                    throw new InternalServerErrorException(
                        `Temporary wallet creation failure. Please try again. ${error.message}`,
                    );
                } else {
                    throw new BadRequestException(
                        `Wallet creation failed: ${error.message}`,
                    );
                }
            }

            // T306: User-friendly error messages for frontend
            throw new BadRequestException(
                `Failed to process your account. Please try again or contact support if the problem persists.`,
            );
        } finally {
            // Release query runner
            await queryRunner.release();
        }
    }

    /**
     * T282: Creates user and wallet atomically within a transaction
     */
    private async createUserAndWalletAtomic(
        queryRunner: QueryRunner,
        web3AuthUser: Web3AuthUser,
        authProvider: any,
    ): Promise<any> {
        this.logger.log(
            `Creating user and wallet atomically for: ${web3AuthUser.id}`,
        );

        // T284: Create user first within transaction
        let user;
        if (this.isCompleteUser(web3AuthUser)) {
            user = await this.createCompleteUserAtomic(
                queryRunner,
                web3AuthUser,
                authProvider,
            );
        } else {
            user = await this.createIncompleteUserAtomic(
                queryRunner,
                web3AuthUser,
                authProvider,
            );
        }

        // T284: Create wallet as part of the same transaction
        if (web3AuthUser.walletAddresses && user) {
            await this.createWeb3AuthWalletAtomic(
                queryRunner,
                user.id,
                web3AuthUser.walletAddresses,
            );
        }

        this.logger.log(
            `Successfully created user and wallet atomically: ${user.id}`,
        );
        return user;
    }

    /**
     * T284: Creates complete user within transaction
     */
    private async createCompleteUserAtomic(
        queryRunner: QueryRunner,
        web3AuthUser: Web3AuthUser,
        authProvider: any,
    ): Promise<any> {
        const userData = {
            email: web3AuthUser.email,
            phone: web3AuthUser.phone,
            firstName: web3AuthUser.firstName || 'User',
            lastName: web3AuthUser.lastName || 'User',
            authProvider,
            authProviderId: web3AuthUser.verifierId,
            language: Language.EN,
            verificationStatus: UserVerificationStatus.VERIFIED,
            status: UserStatus.ACTIVE,
        };

        // Use queryRunner to create user within transaction
        const userRepository = queryRunner.manager.getRepository('User');
        const user = await userRepository.save(userData);

        this.logger.log(`Created complete user within transaction: ${user.id}`);
        return user;
    }

    /**
     * T284: Creates incomplete user within transaction
     */
    private async createIncompleteUserAtomic(
        queryRunner: QueryRunner,
        web3AuthUser: Web3AuthUser,
        authProvider: any,
    ): Promise<any> {
        const userData = {
            email: web3AuthUser.email,
            phone: web3AuthUser.phone,
            firstName: web3AuthUser.firstName || 'User',
            lastName: web3AuthUser.lastName || 'User',
            authProvider,
            authProviderId: web3AuthUser.verifierId,
            language: Language.EN,
            verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
            status: UserStatus.PENDING_VERIFICATION,
        };

        // Use queryRunner to create user within transaction
        const userRepository = queryRunner.manager.getRepository('User');
        const user = await userRepository.save(userData);

        this.logger.log(
            `Created incomplete user within transaction: ${user.id}`,
        );
        return user;
    }

    /**
     * Updates existing user information
     */
    private async updateExistingUser(
        queryRunner: QueryRunner,
        user: any,
        web3AuthUser: Web3AuthUser,
    ): Promise<void> {
        this.logger.log(`Updating existing user: ${user.id}`);

        // Update user information
        await this.userService.update(user.id, {
            email: web3AuthUser.email || user.email,
            phone: web3AuthUser.phone || user.phone,
            firstName: web3AuthUser.firstName || user.firstName,
            lastName: web3AuthUser.lastName || user.lastName,
        });

        // Update wallet addresses if provided and changed
        if (web3AuthUser.walletAddresses) {
            await this.updateWeb3AuthWallet(
                user.id,
                web3AuthUser.walletAddresses,
            );
        }
    }

    /**
     * Generates our API's JWT token for the user
     */
    async generateApiToken(user: any): Promise<{
        accessToken: string;
        expiresIn: number;
    }> {
        const accessToken = this.authService.generateAccessToken(user);
        const expiresIn = 3600; // 1 hour

        return {
            accessToken,
            expiresIn,
        };
    }

    /**
     * T282-T286: Creates a Web3Auth MPC wallet for a new user (atomic version)
     * T287-T291: Enhanced Solana address validation
     * T292-T296: Address uniqueness checking
     * T304: Retry logic for transient failures
     */
    private async createWeb3AuthWalletAtomic(
        queryRunner: QueryRunner,
        userId: string,
        walletAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<void> {
        const startTime = Date.now();
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        this.walletCreationMetrics.totalAttempts++;
        this.logger.log(`Starting atomic wallet creation for user: ${userId}`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // T287-T291: Enhanced Solana address validation
                this.validateSolanaAddressesEnhanced(walletAddresses);

                // Use the primary address (ed25519_app_key) as the main wallet address
                const primaryAddress =
                    walletAddresses.ed25519_app_key ||
                    walletAddresses.secp256k1_app_key ||
                    Object.values(walletAddresses)[0];

                if (!primaryAddress) {
                    throw new WalletCreationError(
                        'No valid wallet address found',
                        'NO_ADDRESS',
                        false,
                    );
                }

                // T292-T296: Enhanced address uniqueness checking
                const isUnique =
                    await this.isAddressUniqueEnhanced(primaryAddress);
                if (!isUnique) {
                    throw new AddressConflictError(
                        `Wallet address ${primaryAddress} already exists`,
                        primaryAddress,
                    );
                }

                // T285: Enhanced error handling and logging
                this.logger.log(
                    `Creating wallet for user ${userId} with address ${primaryAddress} (attempt ${attempt}/${maxRetries})`,
                );

                // Create wallet within transaction using queryRunner
                const walletData = {
                    userId,
                    address: primaryAddress,
                    publicKey: primaryAddress,
                    walletType: WalletType.WEB3AUTH_MPC,
                    walletAddresses: JSON.stringify(walletAddresses),
                    isActive: true,
                    isPrimary: true,
                    status: 'active',
                };

                const walletRepository =
                    queryRunner.manager.getRepository('Wallet');
                await walletRepository.save(walletData);

                const endTime = Date.now();
                const totalTime = endTime - startTime;

                this.walletCreationMetrics.successfulCreations++;
                this.updateAverageRetryTime(totalTime);

                this.logger.log(
                    `Successfully created Web3Auth wallet for user ${userId}: ${primaryAddress} (${totalTime}ms, ${attempt} attempts)`,
                );
                return; // Success, exit retry loop
            } catch (error) {
                this.logger.warn(
                    `Wallet creation attempt ${attempt}/${maxRetries} failed for user ${userId}: ${error.message}`,
                );

                // T304: Retry logic for transient failures
                if (attempt < maxRetries) {
                    this.walletCreationMetrics.retryAttempts++;

                    // Only retry for retryable errors
                    if (
                        error instanceof WalletCreationError &&
                        error.retryable
                    ) {
                        const delay = retryDelay * Math.pow(2, attempt - 1);
                        this.logger.log(
                            `Retrying wallet creation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, delay),
                        );
                        continue;
                    }
                }

                if (attempt === maxRetries) {
                    // Last attempt failed, throw the error
                    this.walletCreationMetrics.failedCreations++;
                    this.logger.error(
                        `All ${maxRetries} wallet creation attempts failed for user ${userId}`,
                        error.stack,
                    );
                    throw error;
                }
            }
        }
    }

    /**
     * Creates a Web3Auth MPC wallet for a new user (non-atomic version for updates)
     */
    private async createWeb3AuthWallet(
        userId: string,
        walletAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<void> {
        try {
            // Validate Solana addresses before creating wallet
            this.validateSolanaAddresses(walletAddresses);

            // Use the primary address (ed25519_app_key) as the main wallet address
            const primaryAddress =
                walletAddresses.ed25519_app_key ||
                walletAddresses.secp256k1_app_key ||
                Object.values(walletAddresses)[0];

            if (!primaryAddress) {
                throw new BadRequestException('No valid wallet address found');
            }

            // Check for address uniqueness
            const isUnique = await this.isAddressUnique(primaryAddress);
            if (!isUnique) {
                throw new BadRequestException(
                    `Wallet address ${primaryAddress} already exists`,
                );
            }

            await this.walletService.create(
                userId,
                primaryAddress,
                primaryAddress, // Use the same value for publicKey
                walletAddresses, // Pass all addresses for JSONB storage
            );

            this.logger.log(
                `Created Web3Auth wallet for user ${userId}: ${primaryAddress}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to create Web3Auth wallet: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * T297-T301: Smart wallet update logic - only update when addresses actually change
     */
    private async updateWeb3AuthWallet(
        userId: string,
        walletAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<void> {
        try {
            this.logger.log(`Starting smart wallet update for user: ${userId}`);

            // T287-T291: Validate Solana addresses before updating wallet
            this.validateSolanaAddressesEnhanced(walletAddresses);

            // Find existing wallet
            const existingWallet =
                await this.walletService.findByUserId(userId);

            if (existingWallet) {
                // T297: Check if addresses actually changed
                const addressesChanged = this.addressesChanged(
                    existingWallet.walletAddresses,
                    walletAddresses,
                );

                if (!addressesChanged) {
                    this.logger.log(
                        `No address changes detected for user ${userId}, skipping update`,
                    );
                    return;
                }

                this.logger.log(
                    `Address changes detected for user ${userId}, proceeding with update`,
                );

                // T298: Only update when addresses actually change
                const primaryAddress =
                    walletAddresses.ed25519_app_key ||
                    walletAddresses.secp256k1_app_key ||
                    Object.values(walletAddresses)[0];

                // T299: Address comparison logic for existing vs new addresses
                if (
                    primaryAddress &&
                    primaryAddress !== existingWallet.address
                ) {
                    const isUnique =
                        await this.isAddressUniqueEnhanced(primaryAddress);
                    if (!isUnique) {
                        throw new AddressConflictError(
                            `Wallet address ${primaryAddress} already exists`,
                            primaryAddress,
                        );
                    }
                }

                // T300: Optimize wallet update process to avoid unnecessary database writes
                await this.walletService.updateWalletAddresses(
                    existingWallet.id,
                    walletAddresses,
                );

                // T301: Add logging for wallet address updates
                this.logger.log(
                    `Successfully updated Web3Auth wallet for user ${userId} with new addresses`,
                );
            } else {
                // Create wallet if it doesn't exist
                this.logger.log(
                    `No existing wallet found for user ${userId}, creating new wallet`,
                );
                await this.createWeb3AuthWallet(userId, walletAddresses);
            }
        } catch (error) {
            this.logger.error(
                `Failed to update Web3Auth wallet for user ${userId}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * T297: Detects if wallet addresses have actually changed
     */
    private addressesChanged(
        existingAddresses: any,
        newAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): boolean {
        try {
            // Parse existing addresses if they're stored as JSON string
            let existing: any = existingAddresses;
            if (typeof existingAddresses === 'string') {
                existing = JSON.parse(existingAddresses);
            }

            if (!existing) {
                this.logger.log(
                    'No existing addresses found, considering as changed',
                );
                return true;
            }

            // Compare each address type
            const addressTypes = [
                'ed25519_app_key',
                'ed25519_threshold_key',
                'secp256k1_app_key',
                'secp256k1_threshold_key',
            ];

            for (const addressType of addressTypes) {
                const existingAddress =
                    existing[addressType as keyof typeof existing];
                const newAddress =
                    newAddresses[addressType as keyof typeof newAddresses];

                // If both exist and are different, addresses changed
                if (
                    existingAddress &&
                    newAddress &&
                    existingAddress !== newAddress
                ) {
                    this.logger.log(
                        `Address change detected for ${addressType}: ${existingAddress} -> ${newAddress}`,
                    );
                    return true;
                }

                // If one exists and the other doesn't, addresses changed
                if (
                    (existingAddress && !newAddress) ||
                    (!existingAddress && newAddress)
                ) {
                    this.logger.log(
                        `Address presence change detected for ${addressType}`,
                    );
                    return true;
                }
            }

            this.logger.log('No address changes detected');
            return false;
        } catch (error) {
            this.logger.error('Error comparing addresses:', error);
            // If we can't compare, assume addresses changed to be safe
            return true;
        }
    }

    /**
     * Extracts and organizes wallet addresses from Web3Auth JWT
     */
    private extractWalletAddresses(
        wallets: Array<{
            public_key: string;
            type: string;
            curve: string;
        }>,
    ): {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    } {
        const walletAddresses: any = {};

        wallets.forEach((wallet) => {
            const key = `${wallet.curve}_${wallet.type}`;
            walletAddresses[key] = wallet.public_key;
        });

        return walletAddresses;
    }

    /**
     * Maps Web3Auth verifier to our AuthProvider enum
     */
    private mapVerifierToAuthProvider(verifier: string): any {
        const verifierMap: { [key: string]: string } = {
            google: 'google',
            apple: 'apple',
            web3auth: 'web3auth',
            phantom: 'phantom',
            solflare: 'solflare',
        };

        return verifierMap[verifier] || 'web3auth';
    }

    /**
     * Detects login method from aggregateVerifier
     */
    private getLoginMethod(aggregateVerifier: string): string {
        if (aggregateVerifier.includes('sms-passwordless')) return 'phone';
        if (aggregateVerifier.includes('apple')) return 'apple';
        if (aggregateVerifier.includes('google')) return 'google';
        if (aggregateVerifier.includes('email-passwordless')) return 'email';
        return 'unknown';
    }

    /**
     * Extracts phone number from JWT payload (if available)
     */
    private extractPhoneFromJWT(
        decoded: Web3AuthJwtPayload,
    ): string | undefined {
        // Phone number might be in the verifierId for phone login
        if (decoded.aggregateVerifier?.includes('sms-passwordless')) {
            return decoded.verifierId;
        }
        return undefined;
    }

    /**
     * Determines if user has complete information
     */
    private isCompleteUser(web3AuthUser: Web3AuthUser): boolean {
        return !!(
            web3AuthUser.email &&
            web3AuthUser.firstName &&
            web3AuthUser.lastName &&
            web3AuthUser.firstName !== '' &&
            web3AuthUser.lastName !== ''
        );
    }

    /**
     * Creates a complete user with verified status
     */
    private async createCompleteUser(
        web3AuthUser: Web3AuthUser,
        authProvider: any,
    ): Promise<any> {
        return await this.userService.create({
            email: web3AuthUser.email,
            phone: web3AuthUser.phone,
            firstName: web3AuthUser.firstName || 'User',
            lastName: web3AuthUser.lastName || 'User',
            authProvider,
            authProviderId: web3AuthUser.verifierId,
            language: Language.EN,
            verificationStatus: UserVerificationStatus.VERIFIED,
            status: UserStatus.ACTIVE,
        });
    }

    /**
     * Creates an incomplete user with pending verification status
     */
    private async createIncompleteUser(
        web3AuthUser: Web3AuthUser,
        authProvider: any,
    ): Promise<any> {
        return await this.userService.create({
            email: web3AuthUser.email,
            phone: web3AuthUser.phone,
            firstName: web3AuthUser.firstName || 'User',
            lastName: web3AuthUser.lastName || 'User',
            authProvider,
            authProviderId: web3AuthUser.verifierId,
            language: Language.EN,
            verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
            status: UserStatus.PENDING_VERIFICATION,
        });
    }

    /**
     * T287-T291: Enhanced Solana address validation using @solana/web3.js
     */
    private validateSolanaAddressesEnhanced(walletAddresses: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    }): void {
        const addresses = Object.values(walletAddresses).filter(Boolean);

        if (addresses.length === 0) {
            throw new AddressValidationError(
                'No wallet addresses provided',
                'none',
            );
        }

        this.logger.log(`Validating ${addresses.length} Solana addresses`);

        for (const address of addresses) {
            try {
                // T288: Use @solana/web3.js PublicKey for validation
                if (!AddressUtils.isValidAddress(address)) {
                    throw new AddressValidationError(
                        `Invalid Solana address format: ${address}`,
                        address,
                    );
                }

                // Additional validation: ensure it's a valid PublicKey
                AddressUtils.validateAndCreatePublicKey(address);

                this.logger.debug(`Validated Solana address: ${address}`);
            } catch (error) {
                if (error instanceof AddressValidationError) {
                    throw error;
                }

                this.logger.error(
                    `Address validation failed for ${address}:`,
                    error,
                );
                throw new AddressValidationError(
                    `Invalid Solana address: ${address}`,
                    address,
                );
            }
        }

        this.logger.log(
            `Successfully validated all ${addresses.length} Solana addresses`,
        );
    }

    /**
     * Legacy method for backward compatibility
     */
    private validateSolanaAddresses(walletAddresses: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    }): void {
        this.validateSolanaAddressesEnhanced(walletAddresses);
    }

    /**
     * T292-T296: Enhanced address uniqueness checking
     */
    private async isAddressUniqueEnhanced(address: string): Promise<boolean> {
        try {
            this.logger.log(`Checking address uniqueness for: ${address}`);

            // Validate address format first
            if (!AddressUtils.isValidAddress(address)) {
                throw new AddressValidationError(
                    `Invalid address format for uniqueness check: ${address}`,
                    address,
                );
            }

            // Check for existing wallet with this address
            const existingWallet =
                await this.walletService.findByAddress(address);

            if (existingWallet) {
                this.logger.warn(
                    `Address conflict detected: ${address} already exists for wallet ${existingWallet.id}`,
                );
                return false;
            }

            this.logger.debug(`Address is unique: ${address}`);
            return true;
        } catch (error) {
            this.logger.error(
                `Address uniqueness check failed for ${address}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    private async isAddressUnique(address: string): Promise<boolean> {
        return this.isAddressUniqueEnhanced(address);
    }

    /**
     * Updates the average retry time metric
     */
    private updateAverageRetryTime(totalTime: number): void {
        const totalSuccessful = this.walletCreationMetrics.successfulCreations;
        if (totalSuccessful > 0) {
            this.walletCreationMetrics.averageRetryTime =
                (this.walletCreationMetrics.averageRetryTime *
                    (totalSuccessful - 1) +
                    totalTime) /
                totalSuccessful;
        }
    }

    /**
     * Gets wallet creation metrics for monitoring
     */
    getWalletCreationMetrics() {
        return {
            ...this.walletCreationMetrics,
            successRate:
                this.walletCreationMetrics.totalAttempts > 0
                    ? (this.walletCreationMetrics.successfulCreations /
                          this.walletCreationMetrics.totalAttempts) *
                      100
                    : 0,
        };
    }
}
