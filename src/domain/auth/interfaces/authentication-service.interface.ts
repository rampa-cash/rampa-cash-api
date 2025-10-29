import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * Authentication service interface following Dependency Inversion Principle (DIP)
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
