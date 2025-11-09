import { Injectable, Logger } from '@nestjs/common';
import { ParaSdkConfigService } from './para-sdk-config.service';

/**
 * Para SDK Verification Service
 *
 * Handles verification tokens for validating sessions without importing them.
 * Reference: https://docs.getpara.com/v2/server/guides/sessions
 *
 * This is useful for non-Node.js servers or scenarios where you only need
 * to validate a session without importing it.
 */
@Injectable()
export class ParaSdkVerificationService {
    private readonly logger = new Logger(ParaSdkVerificationService.name);

    constructor(private readonly configService: ParaSdkConfigService) {}

    /**
     * Verify a verification token from Para client
     *
     * Client-side: const verificationToken = await para.getVerificationToken();
     *
     * @param verificationToken - Verification token from client
     * @returns User information if valid, null otherwise
     */
    async verifyToken(verificationToken: string): Promise<{
        authType:
            | 'email'
            | 'phone'
            | 'farcaster'
            | 'telegram'
            | 'externalWallet';
        identifier: string;
        oAuthMethod?: 'google' | 'x' | 'discord' | 'facebook' | 'apple';
    } | null> {
        try {
            if (!verificationToken) {
                return null;
            }

            const config = this.configService.getConfig();
            const environment = config.environment || 'development';

            // Determine verification URL based on environment
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            const verifyUrl = this.getVerificationUrl(environment);

            // Use Secret API Key for verification endpoints
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            // The secret API key is different from the public API key
            const secretApiKey = config.secretApiKey || config.apiKey;
            if (!config.secretApiKey) {
                this.logger.warn(
                    'PARA_SECRET_API_KEY not configured, using public API key. This may not work for verification endpoints.',
                );
            }

            this.logger.debug(`Verifying token against: ${verifyUrl}`);

            const response = await fetch(verifyUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-external-api-key': secretApiKey,
                },
                body: JSON.stringify({ verificationToken }),
            });

            if (response.status === 403) {
                this.logger.debug('Verification token expired or invalid');
                return null;
            }

            if (!response.ok) {
                this.logger.error(
                    `Verification failed with status: ${response.status}`,
                );
                return null;
            }

            const userData = await response.json();
            this.logger.debug(`Token verified: ${userData.identifier}`);

            return userData;
        } catch (error) {
            this.logger.error('Token verification failed', error);
            return null;
        }
    }

    /**
     * Verify wallet ownership
     *
     * Verifies that a wallet address matches one of your users' embedded wallets.
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     *
     * @param address - Wallet address to verify
     * @returns Wallet ID if found, null otherwise
     */
    async verifyWallet(address: string): Promise<string | null> {
        try {
            if (!address) {
                return null;
            }

            const config = this.configService.getConfig();
            const environment = config.environment || 'development';

            // Determine verification URL based on environment
            const verifyUrl = this.getWalletVerificationUrl(environment);

            // Use Secret API Key for verification endpoints
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            const secretApiKey = config.secretApiKey || config.apiKey;
            if (!config.secretApiKey) {
                this.logger.warn(
                    'PARA_SECRET_API_KEY not configured, using public API key. This may not work for verification endpoints.',
                );
            }

            this.logger.debug(`Verifying wallet: ${address}`);

            const response = await fetch(verifyUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-external-api-key': secretApiKey,
                },
                body: JSON.stringify({ address }),
            });

            if (response.status === 404) {
                this.logger.debug(`Wallet not found: ${address}`);
                return null;
            }

            if (!response.ok) {
                this.logger.error(
                    `Wallet verification failed with status: ${response.status}`,
                );
                return null;
            }

            const { walletId } = await response.json();
            this.logger.debug(`Wallet verified: ${walletId}`);

            return walletId;
        } catch (error) {
            this.logger.error('Wallet verification failed', error);
            return null;
        }
    }

    /**
     * Get verification URL based on environment
     */
    private getVerificationUrl(environment: string): string {
        switch (environment.toLowerCase()) {
            case 'sandbox':
                return 'https://api.sandbox.getpara.com/sessions/verify';
            case 'beta':
                return 'https://api.beta.getpara.com/sessions/verify';
            case 'production':
            case 'prod':
                return 'https://api.getpara.com/sessions/verify';
            default:
                // Default to beta for development
                return 'https://api.beta.getpara.com/sessions/verify';
        }
    }

    /**
     * Get wallet verification URL based on environment
     */
    private getWalletVerificationUrl(environment: string): string {
        switch (environment.toLowerCase()) {
            case 'sandbox':
                return 'https://api.sandbox.getpara.com/wallets/verify';
            case 'beta':
                return 'https://api.beta.getpara.com/wallets/verify';
            case 'production':
            case 'prod':
                return 'https://api.getpara.com/wallets/verify';
            default:
                // Default to beta for development
                return 'https://api.beta.getpara.com/wallets/verify';
        }
    }
}
