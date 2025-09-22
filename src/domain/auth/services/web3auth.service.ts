import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { WalletService } from '../../wallet/wallet.service';
import { AuthProvider } from '../../user/entities/user.entity';

export interface Web3AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    verifier: string;
    verifierId: string;
    typeOfLogin: string;
    aggregateVerifier?: string;
    aggregateVerifierId?: string;
}

export interface Web3AuthLoginResponse {
    user: Web3AuthUser;
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class Web3AuthService {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
        private walletService: WalletService,
    ) {}

    async validateWeb3AuthUser(web3AuthUser: Web3AuthUser): Promise<any> {
        try {
            // Validate the Web3Auth user data
            if (
                !web3AuthUser.id ||
                !web3AuthUser.email ||
                !web3AuthUser.verifierId
            ) {
                throw new BadRequestException('Invalid Web3Auth user data');
            }

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
                // Create new user if doesn't exist
                user = await this.userService.create({
                    email: web3AuthUser.email,
                    firstName: web3AuthUser.firstName || '',
                    lastName: web3AuthUser.lastName || '',
                    authProvider,
                    authProviderId: web3AuthUser.verifierId,
                    language: 'en' as any,
                });
            }

            // Update last login
            await this.userService.updateLastLogin(user.id);

            return user;
        } catch (error) {
            throw new UnauthorizedException('Web3Auth validation failed');
        }
    }

    async createOrUpdateWallet(
        userId: string,
        walletData: {
            address: string;
            publicKey: string;
            walletType: string;
        },
    ): Promise<any> {
        try {
            // Check if user already has a wallet
            const existingWallet =
                await this.walletService.findByUserId(userId);

            if (existingWallet) {
                // Update existing wallet if needed
                if (existingWallet.address !== walletData.address) {
                    return await this.walletService.update(existingWallet.id, {
                        address: walletData.address,
                        publicKey: walletData.publicKey,
                    });
                }
                return existingWallet;
            }

            // Create new wallet
            return await this.walletService.create(
                userId,
                walletData.address,
                walletData.publicKey,
                walletData.walletType as any,
            );
        } catch (error) {
            throw new BadRequestException('Failed to create or update wallet');
        }
    }

    async getWeb3AuthConfig(): Promise<any> {
        return {
            clientId: this.configService.get<string>('WEB3AUTH_CLIENT_ID'),
            web3AuthNetwork:
                this.configService.get<string>('WEB3AUTH_NETWORK') || 'testnet',
            chainConfig: {
                chainNamespace: 'solana',
                chainId:
                    this.configService.get<string>('SOLANA_NETWORK') ||
                    'devnet',
                rpcTarget:
                    this.configService.get<string>('SOLANA_RPC_URL') ||
                    'https://api.devnet.solana.com',
                displayName: 'Solana Devnet',
                blockExplorerUrl: 'https://explorer.solana.com/?cluster=devnet',
                ticker: 'SOL',
                tickerName: 'Solana',
            },
            uiConfig: {
                theme: 'light',
                loginMethodsOrder: [
                    'google',
                    'facebook',
                    'twitter',
                    'reddit',
                    'discord',
                    'twitch',
                    'apple',
                    'line',
                    'github',
                    'kakao',
                    'linkedin',
                    'weibo',
                    'wechat',
                    'email_passwordless',
                ],
                defaultLanguage: 'en',
                loginGridCol: 3,
                primaryButton: 'externalLogin',
            },
        };
    }

    async verifySolanaTransaction(transactionHash: string): Promise<boolean> {
        try {
            // In a production environment, you would verify the transaction on Solana
            // For now, we'll just return true
            console.log(`Verifying Solana transaction: ${transactionHash}`);
            return true;
        } catch (error) {
            console.error('Failed to verify Solana transaction:', error);
            return false;
        }
    }

    async getSolanaWalletInfo(address: string): Promise<any> {
        try {
            // In a production environment, you would fetch real wallet info from Solana
            return {
                address,
                balance: 0,
                isActive: true,
            };
        } catch (error) {
            throw new BadRequestException('Failed to fetch wallet info');
        }
    }

    async signMessage(message: string, privateKey: string): Promise<string> {
        try {
            // In a production environment, you would use a proper Solana library
            // For now, we'll just return a mock signature
            console.log(`Signing message: ${message}`);
            return 'mock-signature';
        } catch (error) {
            throw new BadRequestException('Failed to sign message');
        }
    }

    async verifySignature(
        message: string,
        signature: string,
        publicKey: string,
    ): Promise<boolean> {
        try {
            // In a production environment, you would verify the signature
            // For now, we'll just return true
            console.log(`Verifying signature for message: ${message}`);
            return true;
        } catch (error) {
            console.error('Failed to verify signature:', error);
            return false;
        }
    }

    private mapVerifierToAuthProvider(verifier: string): AuthProvider {
        const verifierMap: { [key: string]: AuthProvider } = {
            google: AuthProvider.GOOGLE,
            apple: AuthProvider.APPLE,
            web3auth: AuthProvider.WEB3AUTH,
            phantom: AuthProvider.PHANTOM,
            solflare: AuthProvider.SOLFLARE,
        };

        return verifierMap[verifier] || AuthProvider.WEB3AUTH;
    }

    async getSupportedWallets(): Promise<string[]> {
        return ['phantom', 'solflare', 'web3auth_mpc'];
    }

    async getSupportedAuthProviders(): Promise<string[]> {
        return ['google', 'apple', 'web3auth', 'phantom', 'solflare'];
    }

    async validateWalletConnection(
        walletAddress: string,
        signature: string,
        message: string,
    ): Promise<boolean> {
        try {
            // In a production environment, you would validate the wallet connection
            // by verifying the signature against the wallet address
            return await this.verifySignature(
                message,
                signature,
                walletAddress,
            );
        } catch (error) {
            console.error('Failed to validate wallet connection:', error);
            return false;
        }
    }
}
