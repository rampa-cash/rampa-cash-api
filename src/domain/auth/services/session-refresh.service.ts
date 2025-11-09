import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import { SessionValidationService } from './session-validation.service';
import {
    AuthenticationService,
    AUTHENTICATION_SERVICE_TOKEN,
} from '../interfaces/authentication-service.interface';

export interface SessionRefreshResult {
    success: boolean;
    sessionData?: {
        token: string;
        userId: string;
        expiresAt: Date;
    };
    error?: string;
}

@Injectable()
export class SessionRefreshService {
    constructor(
        private readonly sessionValidationService: SessionValidationService,
        @Inject(AUTHENTICATION_SERVICE_TOKEN)
        private readonly authenticationService: AuthenticationService,
    ) {}

    async refreshSessionFromToken(
        sessionToken: string,
    ): Promise<SessionRefreshResult> {
        try {
            // First validate the current session
            const validationResult =
                await this.sessionValidationService.validateSession(
                    sessionToken,
                );

            if (!validationResult.isValid) {
                return {
                    success: false,
                    error: 'Invalid session token',
                };
            }

            // Use AuthenticationService.refreshSession() which uses keepSessionAlive()
            // For Para SDK, refreshToken is actually the sessionToken
            const refreshResult =
                await this.authenticationService.refreshSession(sessionToken);

            return {
                success: true,
                sessionData: {
                    token: refreshResult.sessionToken,
                    userId: refreshResult.user.id,
                    expiresAt: refreshResult.expiresAt,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Session refresh failed: ${error.message}`,
            };
        }
    }

    async validateRefreshToken(sessionToken: string): Promise<boolean> {
        try {
            const validationResult =
                await this.sessionValidationService.validateSession(
                    sessionToken,
                );
            return validationResult.isValid;
        } catch (error) {
            return false;
        }
    }

    async getSessionExpiration(sessionToken: string): Promise<Date | null> {
        try {
            const validationResult =
                await this.sessionValidationService.validateSession(
                    sessionToken,
                );

            if (!validationResult.isValid || !validationResult.sessionData) {
                return null;
            }

            return validationResult.sessionData.expiresAt;
        } catch (error) {
            return null;
        }
    }

    async isSessionExpiringSoon(
        sessionToken: string,
        thresholdMinutes: number = 30,
    ): Promise<boolean> {
        try {
            const expiration = await this.getSessionExpiration(sessionToken);

            if (!expiration) {
                return true; // Consider expired if we can't get expiration
            }

            const now = new Date();
            const thresholdTime = new Date(
                now.getTime() + thresholdMinutes * 60 * 1000,
            );

            return expiration <= thresholdTime;
        } catch (error) {
            return true; // Consider expiring if we can't determine
        }
    }

    private async validateUserForRefresh(userId: string): Promise<{
        isValid: boolean;
        error?: string;
    }> {
        try {
            // This would typically check if the user exists and is active
            // For now, we'll assume the user is valid if we have a user ID
            if (!userId || userId.trim() === '') {
                return {
                    isValid: false,
                    error: 'User ID is required',
                };
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: 'User validation failed',
            };
        }
    }
}
