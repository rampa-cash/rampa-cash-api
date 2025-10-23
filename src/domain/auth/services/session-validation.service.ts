import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ParaSdkAuthService } from './para-sdk-auth.service';
import { UserInfo } from '../interfaces/authentication-service.interface';

/**
 * Session validation service
 * Handles session validation and user context
 */
@Injectable()
export class SessionValidationService {
    private readonly logger = new Logger(SessionValidationService.name);

    constructor(private readonly paraSdkAuthService: ParaSdkAuthService) {}

    /**
     * Validate session token and return user information
     */
    async validateSession(sessionToken: string): Promise<UserInfo> {
        try {
            if (!sessionToken) {
                throw new UnauthorizedException('Session token is required');
            }

            this.logger.debug(`Validating session: ${sessionToken.substring(0, 10)}...`);

            const session = await this.paraSdkAuthService.validateSession(sessionToken);
            if (!session) {
                throw new UnauthorizedException('Invalid session token');
            }

            if (!session.isActive) {
                throw new UnauthorizedException('Session is not active');
            }

            if (new Date() > session.expiresAt) {
                throw new UnauthorizedException('Session has expired');
            }

            return {
                id: session.userId,
                email: session.email,
                authProvider: session.authProvider,
                authProviderId: session.authProviderId,
            };
        } catch (error) {
            this.logger.error('Session validation failed', error);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Session validation failed');
        }
    }

    /**
     * Check if session is valid without throwing exceptions
     */
    async isSessionValid(sessionToken: string): Promise<boolean> {
        try {
            await this.validateSession(sessionToken);
            return true;
        } catch (error) {
            return false;
        }
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
        const user = await this.validateSession(sessionToken);
        const session = await this.paraSdkAuthService.validateSession(sessionToken);

        return {
            user,
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
        const user = await this.validateSession(sessionToken);

        // TODO: Implement permission checking when user permissions are defined
        this.logger.debug(`Validating session for operation: ${operation}`, JSON.stringify({
            userId: user.id,
            requiredPermissions,
        }));

        return user;
    }

    /**
     * Refresh session if needed
     */
    async refreshSessionIfNeeded(sessionToken: string): Promise<{
        sessionToken: string;
        needsRefresh: boolean;
    }> {
        try {
            const session = await this.paraSdkAuthService.validateSession(sessionToken);
            if (!session) {
                throw new UnauthorizedException('Invalid session');
            }

            const now = new Date();
            const refreshThreshold = new Date(session.expiresAt.getTime() - 5 * 60 * 1000); // 5 minutes before expiry

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
