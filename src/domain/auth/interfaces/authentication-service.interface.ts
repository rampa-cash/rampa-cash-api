import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * Injection token for AuthenticationService PORT
 * This is the PORT in Port and Adapters (Hexagonal) Architecture
 */
export const AUTHENTICATION_SERVICE_TOKEN = Symbol('AuthenticationService');

/**
 * Authentication service interface following Dependency Inversion Principle (DIP)
 * and Port and Adapters (Hexagonal) Architecture
 *
 * This is the PORT - defines what the application needs from authentication
 * Supports multiple authentication providers (Para SDK, social login, email, phone)
 */
export interface AuthenticationService extends ExternalService {
    /**
     * Validate user session and return user information
     * @param sessionToken - Session token from client
     * @returns User information if valid, null if invalid
     */
    validateSession(sessionToken: string): Promise<UserSession | null>;

    /**
     * Create new user session
     * @param userInfo - User information from authentication provider
     * @returns Session token and user information
     */
    createSession(userInfo: UserInfo): Promise<SessionResult>;

    /**
     * Refresh user session
     * @param refreshToken - Refresh token
     * @returns New session token and user information
     */
    refreshSession(refreshToken: string): Promise<SessionResult>;

    /**
     * Revoke user session
     * @param sessionToken - Session token to revoke
     */
    revokeSession(sessionToken: string): Promise<void>;

    /**
     * Get user information by session token
     * @param sessionToken - Session token
     * @returns User information
     */
    getUserInfo(sessionToken: string): Promise<UserInfo | null>;

    /**
     * Verify authentication provider token
     * @param providerToken - Token from authentication provider
     * @param provider - Authentication provider name
     * @returns User information if valid
     */
    verifyProviderToken(
        providerToken: string,
        provider: AuthProvider,
    ): Promise<UserInfo | null>;

    /**
     * Check if session is active
     * @param sessionToken - Session token to check
     * @returns true if session is active, false otherwise
     */
    isSessionActive(sessionToken: string): Promise<boolean>;

    /**
     * Issue JWT token for a session
     * @param sessionToken - Session token
     * @returns JWT token, key ID, and expiration date
     */
    issueJwt(sessionToken: string): Promise<{
        token: string;
        keyId: string;
        expiresAt: Date;
    } | null>;

    /**
     * Verify a verification token (without importing session)
     * @param verificationToken - Verification token from client
     * @returns Authentication information if valid
     */
    verifyToken(verificationToken: string): Promise<{
        authType:
            | 'email'
            | 'phone'
            | 'farcaster'
            | 'telegram'
            | 'externalWallet';
        identifier: string;
        oAuthMethod?: 'google' | 'x' | 'discord' | 'facebook' | 'apple';
    } | null>;

    /**
     * Verify wallet ownership
     * @param address - Wallet address to verify
     * @returns Wallet ID if found, null otherwise
     */
    verifyWallet(address: string): Promise<string | null>;

    /**
     * Import a client session
     * @param serializedSession - Serialized session string from client (exported via para.exportSession())
     * @returns Session token and user information
     */
    importClientSession(serializedSession: string): Promise<{
        sessionToken: string;
        user: UserInfo;
        expiresAt: Date;
    }>;
}

/**
 * User session information
 */
export interface UserSession {
    userId: string;
    email?: string;
    phone?: string;
    name?: string;
    authProvider: AuthProvider;
    authProviderId: string;
    sessionToken: string;
    expiresAt: Date;
    isActive: boolean;
}

/**
 * User information from authentication provider
 */
export interface UserInfo {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    authProvider: AuthProvider;
    authProviderId: string;
    profile?: Record<string, any>;
    // Internal field to pass authType through the chain
    authType?: string;
}

/**
 * Session creation result
 */
export interface SessionResult {
    sessionToken: string;
    refreshToken: string;
    expiresAt: Date;
    user: UserInfo;
}

/**
 * Authentication providers
 */
export enum AuthProvider {
    PARA = 'para',
    GOOGLE = 'google',
    APPLE = 'apple',
    EMAIL = 'email',
    PHONE = 'phone',
}
