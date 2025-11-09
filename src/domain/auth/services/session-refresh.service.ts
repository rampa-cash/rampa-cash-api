import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { SessionValidationService } from './session-validation.service';
import { ParaSdkConfigService } from '../../../infrastructure/adapters/auth/para-sdk/para-sdk-config.service';

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
        private readonly paraSdkConfigService: ParaSdkConfigService,
    ) {}

    async refreshSession(userId: string): Promise<SessionRefreshResult> {
        try {
            // Validate that the user exists and is active
            const userValidation = await this.validateUserForRefresh(userId);
            if (!userValidation.isValid) {
                return {
                    success: false,
                    error: userValidation.error,
                };
            }

            // Call Para SDK to refresh the session
            const refreshResult = await this.callParaSdkRefresh(userId);

            if (!refreshResult.success) {
                return {
                    success: false,
                    error: refreshResult.error,
                };
            }

            return {
                success: true,
                sessionData: {
                    token: refreshResult.sessionData.token,
                    userId: refreshResult.sessionData.userId,
                    expiresAt: refreshResult.sessionData.expiresAt,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: `Session refresh failed: ${error.message}`,
            };
        }
    }

    async refreshSessionFromToken(
        sessionToken: string,
    ): Promise<SessionRefreshResult> {
        try {
            // First validate the current session to get user ID
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

            // Refresh the session using the user ID
            return await this.refreshSession(validationResult.userId!);
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

    private async callParaSdkRefresh(userId: string): Promise<{
        success: boolean;
        sessionData?: any;
        error?: string;
    }> {
        try {
            // This would call the actual Para SDK refresh endpoint
            // For now, we'll simulate the response
            const config = this.paraSdkConfigService.getConfig();
            const baseUrl = config.baseUrl;
            const apiKey = config.apiKey;

            // Simulate API call to Para SDK
            const response = await this.makeApiCall(
                `${baseUrl}/sessions/refresh`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId }),
                },
            );

            if (response.success) {
                return {
                    success: true,
                    sessionData: response.data,
                };
            } else {
                return {
                    success: false,
                    error: response.error || 'Refresh failed',
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Para SDK refresh call failed: ${error.message}`,
            };
        }
    }

    private async makeApiCall(url: string, options: any): Promise<any> {
        // This would be replaced with actual HTTP client call
        // For now, we'll simulate a successful response
        return {
            success: true,
            data: {
                token: `new-session-token-${Date.now()}`,
                userId: options.body
                    ? JSON.parse(options.body).userId
                    : 'unknown',
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            },
        };
    }
}
