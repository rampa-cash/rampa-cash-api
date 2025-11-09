import { Injectable, Logger } from '@nestjs/common';
import { ParaSdkConfigService } from './para-sdk-config.service';
import { ParaSdkSessionManager } from './para-sdk-session.manager';
import { ParaSdkVerificationService } from './para-sdk-verification.service';
import {
    AuthenticationService,
    UserInfo,
    SessionResult,
    AuthProvider,
    UserSession,
} from '../../../../domain/auth/interfaces/authentication-service.interface';

/**
 * Para SDK authentication service ADAPTER
 *
 * This is an ADAPTER in the Port and Adapters (Hexagonal) Architecture.
 * It implements the AuthenticationService PORT (interface) using Para SDK.
 *
 * Located in infrastructure layer as it's an external service integration.
 *
 * Uses Para Server SDK to import and validate client sessions.
 * Reference: https://docs.getpara.com/v2/server/setup
 */
@Injectable()
export class ParaSdkAuthService implements AuthenticationService {
    private readonly logger = new Logger(ParaSdkAuthService.name);

    constructor(
        private readonly configService: ParaSdkConfigService,
        private readonly sessionManager: ParaSdkSessionManager,
        private readonly verificationService: ParaSdkVerificationService,
    ) {}

    /**
     * Health check for the external service
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Validate configuration
            const validation = this.configService.validateConfig();
            if (!validation.isValid) {
                this.logger.warn('Para SDK configuration invalid');
                return false;
            }

            // Basic health check - configuration is valid
            // You can add more sophisticated checks here if Para SDK provides health endpoints
            return true;
        } catch (error) {
            this.logger.error('Para SDK health check failed', error);
            return false;
        }
    }

    /**
     * Get service configuration
     */
    getConfiguration(): Record<string, any> {
        return this.configService.getConfig();
    }

    /**
     * Initialize the service
     */
    async initialize(): Promise<void> {
        try {
            const validation = this.configService.validateConfig();
            if (!validation.isValid) {
                throw new Error(
                    `Para SDK configuration invalid: ${validation.errors.join(', ')}`,
                );
            }

            this.logger.log('Para SDK authentication service initialized');
        } catch (error) {
            this.logger.error(
                'Failed to initialize Para SDK authentication service',
                error,
            );
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        this.logger.log('Para SDK authentication service cleanup completed');
    }

    /**
     * Import a client session
     * @param serializedSession - Serialized session string from client (exported via para.exportSession())
     * @returns Session token and user information
     */
    async importClientSession(serializedSession: string): Promise<{
        sessionToken: string;
        user: UserInfo;
        expiresAt: Date;
    }> {
        try {
            this.logger.debug('Importing client session');

            // Generate a unique session token for this imported session
            const sessionToken = `para_${Date.now()}_${Math.random().toString(36).substring(2)}`;

            // Import the session using the session manager
            const sessionInfo = await this.sessionManager.importSession(
                sessionToken,
                serializedSession,
            );

            const userInfo: UserInfo = {
                id: sessionInfo.userId,
                email: sessionInfo.email,
                authProvider: AuthProvider.PARA,
                authProviderId: sessionInfo.authProviderId,
            };

            this.logger.log(
                `Client session imported successfully for user: ${sessionInfo.userId}`,
            );

            return {
                sessionToken,
                user: userInfo,
                expiresAt: sessionInfo.expiresAt,
            };
        } catch (error) {
            this.logger.error('Failed to import client session', error);
            throw error;
        }
    }

    /**
     * Validate user session and return user information
     */
    async validateSession(sessionToken: string): Promise<UserSession | null> {
        try {
            this.logger.debug(
                `Validating session: ${sessionToken.substring(0, 10)}...`,
            );

            // Use session manager to validate the session
            const sessionInfo =
                await this.sessionManager.validateSession(sessionToken);

            if (!sessionInfo) {
                return null;
            }

            return {
                userId: sessionInfo.userId,
                email: sessionInfo.email,
                authProvider: AuthProvider.PARA,
                authProviderId: sessionInfo.authProviderId,
                sessionToken: sessionInfo.sessionToken,
                expiresAt: sessionInfo.expiresAt,
                isActive: sessionInfo.isActive,
            };
        } catch (error) {
            this.logger.error('Session validation failed', error);
            return null;
        }
    }

    /**
     * Create new user session
     *
     * Note: Para SDK doesn't create sessions server-side.
     * Sessions are imported from the client using importClientSession().
     * This method is kept for interface compatibility but throws an error.
     */
    async createSession(userInfo: UserInfo): Promise<SessionResult> {
        throw new Error(
            'Para SDK does not support server-side session creation. ' +
                'Sessions must be imported from the client using importClientSession().',
        );
    }

    /**
     * Refresh user session (using keepSessionAlive)
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     *
     * Note: Para SDK uses keepSessionAlive() instead of traditional refresh tokens.
     * This method accepts refreshToken for interface compatibility, but it should
     * be the sessionToken from the imported session.
     */
    async refreshSession(refreshToken: string): Promise<SessionResult> {
        // For Para SDK, refreshToken is actually the sessionToken
        const sessionToken = refreshToken;
        try {
            this.logger.debug(
                `Keeping session alive: ${sessionToken.substring(0, 10)}...`,
            );

            // Use keepSessionAlive instead of refresh
            const success =
                await this.sessionManager.keepSessionAlive(sessionToken);

            if (!success) {
                throw new Error('Failed to keep session alive');
            }

            // Get updated session info
            const session = await this.validateSession(sessionToken);
            if (!session) {
                throw new Error('Session not found after keeping alive');
            }

            const userInfo: UserInfo = {
                id: session.userId,
                email: session.email,
                authProvider: session.authProvider,
                authProviderId: session.authProviderId,
            };

            return {
                sessionToken: session.sessionToken,
                refreshToken: session.sessionToken, // Para SDK doesn't use separate refresh tokens
                expiresAt: session.expiresAt,
                user: userInfo,
            };
        } catch (error) {
            this.logger.error('Failed to keep session alive', error);
            throw error;
        }
    }

    /**
     * Check if session is active using Para SDK
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     */
    async isSessionActive(sessionToken: string): Promise<boolean> {
        return await this.sessionManager.isSessionActive(sessionToken);
    }

    /**
     * Issue JWT token for authentication
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     */
    async issueJwt(sessionToken: string): Promise<{
        token: string;
        keyId: string;
        expiresAt: Date;
    } | null> {
        return await this.sessionManager.issueJwt(sessionToken);
    }

    /**
     * Revoke user session
     */
    async revokeSession(sessionToken: string): Promise<void> {
        try {
            this.logger.debug(
                `Revoking session: ${sessionToken.substring(0, 10)}...`,
            );
            await this.sessionManager.revokeSession(sessionToken);
            this.logger.log(
                `Session revoked: ${sessionToken.substring(0, 10)}...`,
            );
        } catch (error) {
            this.logger.error('Session revocation failed', error);
            throw error;
        }
    }

    /**
     * Get user information by session token
     */
    async getUserInfo(sessionToken: string): Promise<UserInfo | null> {
        try {
            const session = await this.validateSession(sessionToken);
            if (!session) {
                return null;
            }

            return {
                id: session.userId,
                email: session.email,
                authProvider: session.authProvider,
                authProviderId: session.authProviderId,
            };
        } catch (error) {
            this.logger.error('Get user info failed', error);
            return null;
        }
    }

    /**
     * Verify authentication provider token
     *
     * For Para SDK, this can be used to verify verification tokens.
     * Note: This is kept for interface compatibility with other auth providers.
     */
    async verifyProviderToken(
        providerToken: string,
        provider: AuthProvider,
    ): Promise<UserInfo | null> {
        try {
            // For Para SDK, we can use verification tokens
            if (provider === AuthProvider.PARA) {
                const verificationResult =
                    await this.verifyToken(providerToken);
                if (!verificationResult) {
                    return null;
                }

                return {
                    id: verificationResult.identifier,
                    email:
                        verificationResult.authType === 'email'
                            ? verificationResult.identifier
                            : undefined,
                    phone:
                        verificationResult.authType === 'phone'
                            ? verificationResult.identifier
                            : undefined,
                    authProvider: AuthProvider.PARA,
                    authProviderId: verificationResult.identifier,
                };
            }

            // For other providers, this would be implemented differently
            this.logger.debug(
                `Verifying provider token for ${provider}: ${providerToken.substring(0, 10)}...`,
            );

            return null;
        } catch (error) {
            this.logger.error('Provider token verification failed', error);
            return null;
        }
    }

    /**
     * Verify a verification token (without importing session)
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
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
        return await this.verificationService.verifyToken(verificationToken);
    }

    /**
     * Verify wallet ownership
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     */
    async verifyWallet(address: string): Promise<string | null> {
        return await this.verificationService.verifyWallet(address);
    }
}
