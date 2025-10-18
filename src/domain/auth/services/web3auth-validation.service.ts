import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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

@Injectable()
export class Web3AuthValidationService {
    private jwksClient: jwksClient.JwksClient;

    constructor(
        private configService: ConfigService,
        private jwtService: JwtService,
        private userService: UserService,
        private authService: AuthService,
        private walletService: WalletService,
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
     */
    async validateAndCreateUser(web3AuthUser: Web3AuthUser): Promise<any> {
        try {
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
                // Create new user based on login method
                if (this.isCompleteUser(web3AuthUser)) {
                    user = await this.createCompleteUser(
                        web3AuthUser,
                        authProvider,
                    );
                } else {
                    user = await this.createIncompleteUser(
                        web3AuthUser,
                        authProvider,
                    );
                }

                // Create Web3Auth MPC wallet for new user
                if (web3AuthUser.walletAddresses && user) {
                    await this.createWeb3AuthWallet(
                        user.id,
                        web3AuthUser.walletAddresses,
                    );
                }
            } else {
                // Update existing user information
                await this.userService.update(user.id, {
                    email: web3AuthUser.email || user.email,
                    phone: web3AuthUser.phone || user.phone,
                    firstName: web3AuthUser.firstName || user.firstName,
                    lastName: web3AuthUser.lastName || user.lastName,
                });

                // Update wallet addresses if provided
                if (web3AuthUser.walletAddresses) {
                    await this.updateWeb3AuthWallet(
                        user.id,
                        web3AuthUser.walletAddresses,
                    );
                }
            }

            // Update last login
            if (user) {
                await this.userService.updateLastLogin(user.id);
            }

            return user;
        } catch (error) {
            throw new BadRequestException('Failed to validate and create user');
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
     * Creates a Web3Auth MPC wallet for a new user
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
            // Use the primary address (ed25519_app_key) as the main wallet address
            const primaryAddress =
                walletAddresses.ed25519_app_key ||
                walletAddresses.secp256k1_app_key ||
                Object.values(walletAddresses)[0];

            if (!primaryAddress) {
                throw new BadRequestException('No valid wallet address found');
            }

            await this.walletService.create(
                userId,
                primaryAddress,
                primaryAddress, // Use the same value for publicKey
                WalletType.WEB3AUTH_MPC,
                walletAddresses, // Pass all addresses for JSONB storage
            );
        } catch (error) {
            // Log error but don't fail user creation
            console.error('Failed to create Web3Auth wallet:', error);
        }
    }

    /**
     * Updates Web3Auth MPC wallet addresses for existing user
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
            // Find existing wallet
            const existingWallet =
                await this.walletService.findByUserId(userId);

            if (existingWallet) {
                // Update wallet addresses in the database
                await this.walletService.updateWalletAddresses(
                    existingWallet.id,
                    walletAddresses,
                );
            } else {
                // Create wallet if it doesn't exist
                await this.createWeb3AuthWallet(userId, walletAddresses);
            }
        } catch (error) {
            // Log error but don't fail user update
            console.error('Failed to update Web3Auth wallet:', error);
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
}
