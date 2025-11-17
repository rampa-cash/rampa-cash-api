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
    phone?: string; // Add phone to session info
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
        phone?: string;
        authType: string;
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

            // Extract user information from session JSON and JWT
            // Parse session JSON to get authType and phone (not available in JWT)
            // Use JWT for validation and expiration
            // Reference: https://docs.getpara.com/v2/server/guides/sessions
            const userInfo = await this.extractUserInfo(
                paraServer,
                serializedSession,
            );

            // Use expiration from JWT payload (respects Para SDK session duration)
            // Para SDK docs: "The token's expiry will be determined by your customized session length, or else will default to 30 minutes"
            const expiresAt = userInfo.expiresAt;

            // Store session
            const sessionInfo: ParaSessionInfo = {
                paraServer,
                userId: userInfo.userId,
                email: userInfo.email,
                phone: userInfo.phone, // Store phone in session info
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
                phone: userInfo.phone,
                authType: userInfo.authType,
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
        phone?: string;
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
                phone: sessionInfo.phone, // Add phone if available
                authProvider: 'para',
                authProviderId: sessionInfo.userId, // Para's userId is the authProviderId
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
     * Extract user information from session JSON and JWT
     * Reference: https://docs.getpara.com/v2/server/guides/sessions
     *
     * Parses serialized session JSON to extract authType and phone (not available in JWT).
     * Uses JWT for validation and expiration.
     */
    private async extractUserInfo(
        paraServer: ParaServer,
        serializedSession: string,
    ): Promise<{
        userId: string;
        email?: string;
        phone?: string;
        authType: string;
        authProviderId: string;
        expiresAt: Date;
    }> {
        try {
            // 1. Parse session JSON to get auth info (authType, phone, email, userId)
            const sessionData = JSON.parse(
                Buffer.from(serializedSession, 'base64').toString(),
            );

            const authType = sessionData.authInfo?.authType || 'email';
            const identifier = sessionData.authInfo?.identifier || '';
            const userId = sessionData.userId || '';

            // 2. Extract email/phone from session
            const email =
                sessionData.authInfo?.auth?.email ||
                (authType === 'email' ? identifier : undefined);
            const phone =
                sessionData.authInfo?.auth?.phone ||
                (authType === 'phone' ? identifier : undefined);

            // 3. Get JWT for expiration and validation
            const { token } = await paraServer.issueJwt();

            if (!token) {
                throw new Error('Failed to issue JWT for user info extraction');
            }

            // Decode JWT to extract expiration
            // JWT format: header.payload.signature
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1], 'base64').toString('utf-8'),
            );

            // Extract expiration from JWT payload
            // Para SDK docs: "The token's expiry will be determined by your customized session length, or else will default to 30 minutes"
            // The `exp` field is in seconds since epoch, convert to Date
            const expiresAt = payload.exp
                ? new Date(payload.exp * 1000)
                : new Date(Date.now() + 30 * 60 * 1000); // Fallback to 30 minutes if exp not present

            // Use identifier as authProviderId (email or phone number)
            const authProviderId = identifier || userId;

            this.logger.debug(
                `Extracted user info: userId=${userId}, email=${email || 'none'}, phone=${phone || 'none'}, authType=${authType}, expiresAt=${expiresAt.toISOString()}`,
            );

            return {
                userId,
                email,
                phone,
                authType,
                authProviderId,
                expiresAt,
            };
        } catch (error) {
            this.logger.error(
                'Failed to extract user info from session',
                error,
            );
            // Fallback: generate a temporary user ID
            // This should rarely happen if Para SDK is working correctly
            const fallbackUserId = `para-user-${Date.now()}-${Math.random().toString(36).substring(2)}`;
            return {
                userId: fallbackUserId,
                email: undefined,
                phone: undefined,
                authType: 'email',
                authProviderId: fallbackUserId,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes fallback
            };
        }
    }

    /**
     * Extract wallet data from Para session
     * @param serializedSession - Serialized session string from client
     * @returns Wallet data or null if no wallet found
     */
    extractWalletFromSession(serializedSession: string): {
        walletId: string;
        address: string;
        publicKey: string;
        externalWalletId: string;
        scheme: string;
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        };
        walletMetadata?: Record<string, any>;
    } | null {
        try {
            // Parse session JSON
            const sessionData = JSON.parse(
                Buffer.from(serializedSession, 'base64').toString(),
            );

            // Get current wallet ID for SOLANA chain
            const currentWalletIds = sessionData.currentWalletIds?.SOLANA || [];
            if (!currentWalletIds || currentWalletIds.length === 0) {
                this.logger.debug('No SOLANA wallet found in session');
                return null;
            }

            // Use first active wallet
            const walletId = currentWalletIds[0];
            const wallet = sessionData.wallets?.[walletId];

            if (!wallet) {
                this.logger.debug(
                    `Wallet ${walletId} not found in session wallets`,
                );
                return null;
            }

            // Extract wallet data
            const address = wallet.address;
            if (!address) {
                this.logger.warn('Wallet address is missing');
                return null;
            }

            // Use address as publicKey if publicKey is empty (Solana addresses are public keys)
            const publicKey = wallet.publicKey || address;

            // Extract scheme and build walletAddresses if needed
            const scheme = wallet.scheme || 'ED25519';
            const walletAddresses: {
                ed25519_app_key?: string;
                ed25519_threshold_key?: string;
                secp256k1_app_key?: string;
                secp256k1_threshold_key?: string;
            } = {};

            // Store signer and other metadata
            const walletMetadata: Record<string, any> = {
                scheme,
                type: wallet.type,
                keyGenComplete: wallet.keyGenComplete,
                sharesPersisted: wallet.sharesPersisted,
                signer: wallet.signer,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            };

            this.logger.debug(
                `Extracted wallet: id=${wallet.id}, address=${address}, scheme=${scheme}`,
            );

            return {
                walletId,
                address,
                publicKey,
                externalWalletId: wallet.id,
                scheme,
                walletAddresses:
                    Object.keys(walletAddresses).length > 0
                        ? walletAddresses
                        : undefined,
                walletMetadata,
            };
        } catch (error) {
            this.logger.error('Failed to extract wallet from session', error);
            return null;
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
