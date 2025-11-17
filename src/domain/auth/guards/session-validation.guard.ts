import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { SessionValidationService } from '../services/session-validation.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class SessionValidationGuard implements CanActivate {
    private readonly logger = new Logger(SessionValidationGuard.name);

    constructor(
        private readonly sessionValidationService: SessionValidationService,
        private readonly userService: UserService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Enhanced logging to identify which endpoint is being accessed
            const requestDetails = {
                method: request.method,
                url: request.url,
                path: request.path,
                query: request.query,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                hasAuthHeader: !!authHeader,
                authHeaderValue: authHeader ? `${authHeader.substring(0, 20)}...` : 'missing',
            };

            this.logger.warn(
                `Authorization header missing or invalid for ${request.method} ${request.url}`,
                JSON.stringify(requestDetails, null, 2),
            );

            throw new UnauthorizedException(
                'Authorization header with Bearer token is required',
            );
        }

        const sessionToken = authHeader.substring(7);
        const validationResult =
            await this.sessionValidationService.validateSession(sessionToken);

        if (!validationResult.isValid) {
            throw new UnauthorizedException(
                validationResult.error || 'Invalid session',
            );
        }

        // Add sessionUser to request
        request.sessionUser = {
            id: validationResult.userId!,
            sessionData: validationResult.sessionData,
        };

        // NEW: Add full user object to request (for UserVerificationGuard)
        // Note: validationResult.userId is Para's userId, stored in our authProviderId field
        // We need to find the user by authProviderId, not by our internal id
        try {
            let user = null;

            // Strategy 1: Try by phone first (most reliable for phone logins)
            if (validationResult.user?.phone) {
                this.logger.debug(
                    `Looking up user by phone: ${validationResult.user.phone}`,
                );
                user = await this.userService.findByPhone(
                    validationResult.user.phone,
                );
            }

            // Strategy 2: Try by email if available
            if (!user && validationResult.user?.email) {
                this.logger.debug(
                    `Looking up user by email: ${validationResult.user.email}`,
                );
                user = await this.userService.getUserByEmail(
                    validationResult.user.email,
                );
            }

            // Strategy 3: Try by authProviderId (Para's userId) - try multiple auth providers
            if (!user && validationResult.user?.authProviderId) {
                this.logger.debug(
                    `Looking up user by authProviderId: ${validationResult.user.authProviderId}`,
                );
                // Try different auth providers since session might have 'para' but user was created with 'phone'
                const authProviders = [
                    'phone',
                    'email',
                    'para',
                    'google',
                    'apple',
                ];
                for (const authProvider of authProviders) {
                    user = await this.userService.findByAuthProvider(
                        authProvider as any,
                        validationResult.user.authProviderId,
                    );
                    if (user) {
                        this.logger.debug(
                            `Found user with authProvider: ${authProvider}`,
                        );
                        break;
                    }
                }
            }

            if (user) {
                this.logger.debug(`User found: ${user.id}`);
                request.user = user;
            } else {
                // User should have been created during session import
                // This should rarely happen, but log for debugging
                this.logger.error(
                    `User not found for session: userId=${validationResult.userId}, authProviderId=${validationResult.user?.authProviderId}, email=${validationResult.user?.email}, phone=${validationResult.user?.phone}`,
                );
                throw new UnauthorizedException('User not found');
            }
        } catch (error) {
            // If it's already an UnauthorizedException, re-throw it
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            // Log other errors and throw UnauthorizedException
            this.logger.warn(
                `Failed to fetch user for request: ${validationResult.userId}`,
                error,
            );
            throw new UnauthorizedException('User not found');
        }

        // Add session token to request for potential refresh
        request.sessionToken = sessionToken;

        return true;
    }
}
