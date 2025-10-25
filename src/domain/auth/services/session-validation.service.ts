import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ParaSdkAuthService } from './para-sdk-auth.service';
import { UserInfo } from '../interfaces/authentication-service.interface';

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

    constructor(private readonly paraSdkAuthService: ParaSdkAuthService) {}

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
                await this.paraSdkAuthService.validateSession(sessionToken);
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
        if (!result.isValid || !result.user) {
            throw new UnauthorizedException(result.error || 'Invalid session');
        }

        const session =
            await this.paraSdkAuthService.validateSession(sessionToken);

        return {
            user: result.user,
            session: {
                token: sessionToken,
                expiresAt: session.expiresAt,
                isActive: session.isActive,
            },
        };
    }

    /**
     * Validate session for specific operations
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

        // TODO: Implement permission checking when user permissions are defined
        this.logger.debug(
            `Validating session for operation: ${operation}`,
            JSON.stringify({
                userId: result.user.id,
                requiredPermissions,
            }),
        );

        return result.user;
    }

    /**
     * Refresh session if needed
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
                await this.paraSdkAuthService.validateSession(sessionToken);
            if (!session) {
                throw new UnauthorizedException('Invalid session');
            }

            const now = new Date();
            const refreshThreshold = new Date(
                session.expiresAt.getTime() - 5 * 60 * 1000,
            ); // 5 minutes before expiry

            if (now > refreshThreshold) {
                this.logger.debug('Session needs refresh');
                // TODO: Implement actual session refresh when Para SDK is available
                return {
                    sessionToken,
                    needsRefresh: true,
                };
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
