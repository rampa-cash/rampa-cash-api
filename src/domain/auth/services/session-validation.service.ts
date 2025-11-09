import {
    Injectable,
    Logger,
    UnauthorizedException,
    ForbiddenException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import {
    AuthenticationService,
    UserInfo,
    AUTHENTICATION_SERVICE_TOKEN,
} from '../interfaces/authentication-service.interface';
import { UserVerificationService } from '../../user/services/user-verification.service';

/**
 * Session validation result interface
 */
export interface SessionValidationResult {
    isValid: boolean;
    error?: string;
    userId?: string;
    sessionData?: any;
    user?: UserInfo;
}

/**
 * Session validation service
 * Handles session validation and user context
 */
@Injectable()
export class SessionValidationService {
    private readonly logger = new Logger(SessionValidationService.name);

    constructor(
        @Inject(AUTHENTICATION_SERVICE_TOKEN)
        private readonly authenticationService: AuthenticationService,
        @Inject(forwardRef(() => UserVerificationService))
        private readonly userVerificationService: UserVerificationService,
    ) {}

    /**
     * Validate session token and return validation result
     */
    async validateSession(
        sessionToken: string,
    ): Promise<SessionValidationResult> {
        try {
            if (!sessionToken) {
                return {
                    isValid: false,
                    error: 'Session token is required',
                };
            }

            this.logger.debug(
                `Validating session: ${sessionToken.substring(0, 10)}...`,
            );

            const session =
                await this.authenticationService.validateSession(sessionToken);
            if (!session) {
                return {
                    isValid: false,
                    error: 'Invalid session token',
                };
            }

            if (!session.isActive) {
                return {
                    isValid: false,
                    error: 'Session is not active',
                };
            }

            if (new Date() > session.expiresAt) {
                return {
                    isValid: false,
                    error: 'Session has expired',
                };
            }

            const userInfo: UserInfo = {
                id: session.userId,
                email: session.email,
                authProvider: session.authProvider,
                authProviderId: session.authProviderId,
            };

            return {
                isValid: true,
                userId: session.userId,
                sessionData: session,
                user: userInfo,
            };
        } catch (error) {
            this.logger.error('Session validation failed', error);
            return {
                isValid: false,
                error: 'Session validation failed',
            };
        }
    }

    /**
     * Check if session is valid without throwing exceptions
     */
    async isSessionValid(sessionToken: string): Promise<boolean> {
        const result = await this.validateSession(sessionToken);
        return result.isValid;
    }

    /**
     * Get user context from session
     */
    async getUserContext(sessionToken: string): Promise<{
        user: UserInfo;
        session: {
            token: string;
            expiresAt: Date;
            isActive: boolean;
        };
    }> {
        const result = await this.validateSession(sessionToken);
        if (!result.isValid || !result.user || !result.sessionData) {
            throw new UnauthorizedException(result.error || 'Invalid session');
        }

        return {
            user: result.user,
            session: {
                token: sessionToken,
                expiresAt: result.sessionData.expiresAt,
                isActive: result.sessionData.isActive,
            },
        };
    }

    /**
     * Validate session for specific operations
     *
     * For blockchain operations, users must be verified (completed soft KYC).
     * Verification status is checked via User.verificationStatus === VERIFIED
     *
     * @param sessionToken - Session token to validate
     * @param operation - Operation name (for logging)
     * @param requiredPermissions - Optional permissions array (currently checks verification status)
     * @returns UserInfo if session is valid and user has required permissions
     * @throws UnauthorizedException if session is invalid
     * @throws ForbiddenException if user is not verified (required for blockchain operations)
     */
    async validateSessionForOperation(
        sessionToken: string,
        operation: string,
        requiredPermissions?: string[],
    ): Promise<UserInfo> {
        const result = await this.validateSession(sessionToken);
        if (!result.isValid || !result.user) {
            throw new UnauthorizedException(result.error || 'Invalid session');
        }

        // If requiredPermissions is provided, check user verification status
        // For blockchain operations, users must be verified (soft KYC completed)
        // Using UserVerificationService to avoid DDD violation (not importing User entity enums)
        if (requiredPermissions && requiredPermissions.length > 0) {
            try {
                // Use UserVerificationService to check if user can perform operations
                // This encapsulates the verification logic and prevents coupling to User entity enums
                const canPerformOperations =
                    await this.userVerificationService.canPerformFinancialOperationsByUserId(
                        result.user.id,
                    );

                if (!canPerformOperations) {
                    this.logger.warn(
                        `User ${result.user.id} attempted operation ${operation} but is not verified or account is not active`,
                    );
                    throw new ForbiddenException(
                        'Profile verification required for this operation. Please complete the verification process.',
                    );
                }

                this.logger.debug(
                    `User ${result.user.id} verified for operation: ${operation}`,
                );
            } catch (error) {
                // Re-throw ForbiddenException and UnauthorizedException
                if (
                    error instanceof ForbiddenException ||
                    error instanceof UnauthorizedException
                ) {
                    throw error;
                }
                // If user not found or other error, log and throw
                this.logger.error(
                    `Failed to validate permissions for user ${result.user.id}`,
                    error,
                );
                throw new ForbiddenException(
                    'Unable to verify user permissions',
                );
            }
        } else {
            this.logger.debug(
                `Validating session for operation: ${operation} (no permissions required)`,
                JSON.stringify({
                    userId: result.user.id,
                }),
            );
        }

        return result.user;
    }

    /**
     * Refresh session if needed
     * Uses AuthenticationService.refreshSession() which calls keepSessionAlive() for Para SDK
     */
    async refreshSessionIfNeeded(sessionToken: string): Promise<{
        sessionToken: string;
        needsRefresh: boolean;
    }> {
        try {
            const result = await this.validateSession(sessionToken);
            if (!result.isValid) {
                throw new UnauthorizedException(
                    result.error || 'Invalid session',
                );
            }

            const session =
                await this.authenticationService.validateSession(sessionToken);
            if (!session) {
                throw new UnauthorizedException('Invalid session');
            }

            const now = new Date();
            const refreshThreshold = new Date(
                session.expiresAt.getTime() - 5 * 60 * 1000,
            ); // 5 minutes before expiry

            if (now > refreshThreshold) {
                this.logger.debug(
                    'Session needs refresh, calling refreshSession()',
                );
                try {
                    // Use AuthenticationService.refreshSession() which uses keepSessionAlive()
                    // For Para SDK, refreshToken is actually the sessionToken
                    const refreshResult =
                        await this.authenticationService.refreshSession(
                            sessionToken,
                        );
                    this.logger.debug(
                        `Session refreshed successfully, new expiration: ${refreshResult.expiresAt.toISOString()}`,
                    );
                    return {
                        sessionToken: refreshResult.sessionToken,
                        needsRefresh: true,
                    };
                } catch (refreshError) {
                    this.logger.error(
                        'Failed to refresh session',
                        refreshError,
                    );
                    // Return original token even if refresh failed
                    return {
                        sessionToken,
                        needsRefresh: true,
                    };
                }
            }

            return {
                sessionToken,
                needsRefresh: false,
            };
        } catch (error) {
            this.logger.error('Session refresh check failed', error);
            throw new UnauthorizedException('Session validation failed');
        }
    }
}
