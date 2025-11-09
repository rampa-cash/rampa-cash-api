import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Para as ParaServer } from '@getpara/server-sdk';
import { ParaSdkConfigService } from './para-sdk-config.service';

/**
 * Session information stored for each imported session
 */
interface ParaSessionInfo {
    paraServer: ParaServer;
    userId: string;
    email?: string;
    importedAt: Date;
    expiresAt: Date;
    isActive: boolean;
}

/**
 * Para SDK Session Manager
 *
 * Manages Para Server SDK instances for imported client sessions.
 * Each imported session gets its own Para Server instance that can be used
 * for validation and blockchain operations.
 */
@Injectable()
export class ParaSdkSessionManager implements OnModuleDestroy {
    private readonly logger = new Logger(ParaSdkSessionManager.name);
    private readonly sessions = new Map<string, ParaSessionInfo>();
    private readonly cleanupInterval: NodeJS.Timeout;

    constructor(private readonly configService: ParaSdkConfigService) {
        // Cleanup expired sessions every 5 minutes
        this.cleanupInterval = setInterval(
            () => {
                this.cleanupExpiredSessions();
            },
            5 * 60 * 1000,
        );
    }

    /**
     * Import a client session and create a Para Server instance
     * @param sessionToken - Unique identifier for this session
     * @param serializedSession - Serialized session string from client
     * @returns Session information including user details
     */
    async importSession(
        sessionToken: string,
        serializedSession: string,
    ): Promise<{
        userId: string;
        email?: string;
        authProviderId: string;
        expiresAt: Date;
    }> {
        try {
            this.logger.debug(
                `Importing session: ${sessionToken.substring(0, 10)}...`,
            );

            // Create new Para Server instance
            const config = this.configService.getConfig();
            const paraServer = new ParaServer(config.apiKey);

            // Import the client session
            await paraServer.importSession(serializedSession);

            // Extract user information and expiration from JWT
            // This extracts the actual session expiration from Para SDK's JWT
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            const userInfo = await this.extractUserInfo(paraServer);

            // Use expiration from JWT payload (respects Para SDK session duration)
            // Para SDK docs: "The token's expiry will be determined by your customized session length, or else will default to 30 minutes"
            const expiresAt = userInfo.expiresAt;

            // Store session
            const sessionInfo: ParaSessionInfo = {
                paraServer,
                userId: userInfo.userId,
                email: userInfo.email,
                importedAt: new Date(),
                expiresAt,
                isActive: true,
            };

            this.sessions.set(sessionToken, sessionInfo);

            this.logger.log(
                `Session imported successfully for user: ${userInfo.userId}`,
            );

            return {
                userId: userInfo.userId,
                email: userInfo.email,
                authProviderId: userInfo.authProviderId,
                expiresAt,
            };
        } catch (error) {
            this.logger.error('Failed to import session', error);
            throw new Error(`Failed to import Para session: ${error.message}`);
        }
    }

    /**
     * Check if a session is active using Para SDK
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     */
    async isSessionActive(sessionToken: string): Promise<boolean> {
        try {
            const sessionInfo = this.sessions.get(sessionToken);
            if (!sessionInfo || !sessionInfo.isActive) {
                return false;
            }

            // Use Para SDK's isSessionActive method
            const isActive = await sessionInfo.paraServer.isSessionActive();

            if (!isActive) {
                // Mark as inactive in our cache
                sessionInfo.isActive = false;
            }

            return isActive;
        } catch (error) {
            this.logger.error('Failed to check session active status', error);
            return false;
        }
    }

    /**
     * Keep session alive (extend session validity)
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     */
    async keepSessionAlive(sessionToken: string): Promise<boolean> {
        try {
            const sessionInfo = this.sessions.get(sessionToken);
            if (!sessionInfo || !sessionInfo.isActive) {
                return false;
            }

            // Use Para SDK's keepSessionAlive method
            const success = await sessionInfo.paraServer.keepSessionAlive();

            if (success) {
                // Extend expiration time (default session duration is 30 minutes, can be up to 30 days)
                // We'll extend by 30 minutes as default
                sessionInfo.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
                this.logger.debug(
                    `Session kept alive: ${sessionToken.substring(0, 10)}...`,
                );
            } else {
                sessionInfo.isActive = false;
            }

            return success;
        } catch (error) {
            this.logger.error('Failed to keep session alive', error);
            return false;
        }
    }

    /**
     * Issue JWT token for a session
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     *
     * Note: According to Para SDK docs, "Issuing a token, like most authenticated API operations,
     * will also renew and extend the session for that duration."
     */
    async issueJwt(sessionToken: string): Promise<{
        token: string;
        keyId: string;
        expiresAt: Date;
    } | null> {
        try {
            const sessionInfo = this.sessions.get(sessionToken);
            if (!sessionInfo || !sessionInfo.isActive) {
                return null;
            }

            // Use Para SDK's issueJwt method
            const { token, keyId } = await sessionInfo.paraServer.issueJwt();

            // Extract expiration from JWT payload
            // Para SDK docs: "The token's expiry will be determined by your customized session length, or else will default to 30 minutes"
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString('utf-8'),
            );
            const expiresAt = payload.exp
                ? new Date(payload.exp * 1000) // Convert from seconds to milliseconds
                : new Date(Date.now() + 30 * 60 * 1000); // Fallback to 30 minutes

            // Update session expiration as JWT issuance extends the session
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            // "Issuing a token, like most authenticated API operations, will also renew and extend the session for that duration"
            sessionInfo.expiresAt = expiresAt;

            this.logger.debug(
                `JWT issued for session: ${sessionToken.substring(0, 10)}..., expiresAt=${expiresAt.toISOString()}`,
            );

            return {
                token,
                keyId,
                expiresAt,
            };
        } catch (error) {
            this.logger.error('Failed to issue JWT', error);
            return null;
        }
    }

    /**
     * Validate a session token and return session information
     * @param sessionToken - Session token to validate
     * @returns Session information if valid, null otherwise
     */
    async validateSession(sessionToken: string): Promise<{
        userId: string;
        email?: string;
        authProvider: string;
        authProviderId: string;
        sessionToken: string;
        expiresAt: Date;
        isActive: boolean;
    } | null> {
        try {
            const sessionInfo = this.sessions.get(sessionToken);

            if (!sessionInfo) {
                this.logger.debug(
                    `Session not found: ${sessionToken.substring(0, 10)}...`,
                );
                return null;
            }

            // Check if session is expired
            if (new Date() > sessionInfo.expiresAt) {
                this.logger.debug(
                    `Session expired: ${sessionToken.substring(0, 10)}...`,
                );
                this.sessions.delete(sessionToken);
                return null;
            }

            // Check if session is active using Para SDK
            const isActive = await this.isSessionActive(sessionToken);
            if (!isActive) {
                this.logger.debug(
                    `Session inactive: ${sessionToken.substring(0, 10)}...`,
                );
                return null;
            }

            return {
                userId: sessionInfo.userId,
                email: sessionInfo.email,
                authProvider: 'para',
                authProviderId: sessionInfo.userId,
                sessionToken,
                expiresAt: sessionInfo.expiresAt,
                isActive: true,
            };
        } catch (error) {
            this.logger.error('Session validation failed', error);
            return null;
        }
    }

    /**
     * Get Para Server instance for a session
     * @param sessionToken - Session token
     * @returns Para Server instance or null
     */
    getParaServer(sessionToken: string): ParaServer | null {
        const sessionInfo = this.sessions.get(sessionToken);
        if (!sessionInfo || !sessionInfo.isActive) {
            return null;
        }
        return sessionInfo.paraServer;
    }

    /**
     * Revoke a session
     * @param sessionToken - Session token to revoke
     */
    async revokeSession(sessionToken: string): Promise<void> {
        try {
            const sessionInfo = this.sessions.get(sessionToken);
            if (sessionInfo) {
                sessionInfo.isActive = false;
                // Cleanup resources if needed
                this.sessions.delete(sessionToken);
                this.logger.log(
                    `Session revoked: ${sessionToken.substring(0, 10)}...`,
                );
            }
        } catch (error) {
            this.logger.error('Failed to revoke session', error);
        }
    }

    /**
     * Extract user information and expiration from Para Server instance using JWT
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     *
     * Uses issueJwt() to get user information from the JWT payload.
     * Also extracts expiration from JWT `exp` field to respect Para SDK session duration.
     */
    private async extractUserInfo(paraServer: ParaServer): Promise<{
        userId: string;
        email?: string;
        authProviderId: string;
        expiresAt: Date;
    }> {
        try {
            // Issue JWT to get user information
            // The JWT contains user data including userId, email, wallets, etc.
            const { token } = await paraServer.issueJwt();

            if (!token) {
                throw new Error('Failed to issue JWT for user info extraction');
            }

            // Decode JWT to extract user information
            // JWT format: header.payload.signature
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString('utf-8'),
            );

            // Extract user information from JWT payload
            // According to Para docs, payload structure:
            // {
            //   data: {
            //     userId: string,
            //     email?: string,
            //     authType: string,
            //     identifier: string,
            //     wallets: [...]
            //   },
            //   sub: string (userId),
            //   iat: number,
            //   exp: number (expiration timestamp in seconds)
            // }
            const userData = payload.data || {};
            const userId =
                userData.userId || payload.sub || `para-user-${Date.now()}`;
            const email = userData.email;
            const identifier = userData.identifier || email || userId;

            // Extract expiration from JWT payload
            // Para SDK docs: "The token's expiry will be determined by your customized session length, or else will default to 30 minutes"
            // The `exp` field is in seconds since epoch, convert to Date
            const expiresAt = payload.exp
                ? new Date(payload.exp * 1000)
                : new Date(Date.now() + 30 * 60 * 1000); // Fallback to 30 minutes if exp not present

            this.logger.debug(
                `Extracted user info: userId=${userId}, email=${email || 'none'}, expiresAt=${expiresAt.toISOString()}`,
            );

            return {
                userId,
                email,
                authProviderId: identifier,
                expiresAt,
            };
        } catch (error) {
            this.logger.error('Failed to extract user info from JWT', error);
            // Fallback: generate a temporary user ID
            // This should rarely happen if Para SDK is working correctly
            const fallbackUserId = `para-user-${Date.now()}-${Math.random().toString(36).substring(2)}`;
            return {
                userId: fallbackUserId,
                email: undefined,
                authProviderId: fallbackUserId,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes fallback
            };
        }
    }

    /**
     * Cleanup expired sessions
     */
    private cleanupExpiredSessions(): void {
        const now = new Date();
        let cleanedCount = 0;

        for (const [token, sessionInfo] of this.sessions.entries()) {
            if (now > sessionInfo.expiresAt || !sessionInfo.isActive) {
                this.sessions.delete(token);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} expired sessions`);
        }
    }

    /**
     * Cleanup on module destroy
     */
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.sessions.clear();
    }
}
