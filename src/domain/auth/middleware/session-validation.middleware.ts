import { Injectable, NestMiddleware, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionValidationService } from '../services/session-validation.service';

@Injectable()
export class SessionValidationMiddleware implements NestMiddleware {
    constructor(private readonly sessionValidationService: SessionValidationService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            // Extract session token from Authorization header
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Authorization header with Bearer token is required');
            }

            const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

            // Validate session
            const validationResult = await this.sessionValidationService.validateSession(sessionToken);

            if (!validationResult.isValid) {
                throw new UnauthorizedException(validationResult.error || 'Invalid session');
            }

            // Add user information to request
            (req as any).sessionUser = {
                id: validationResult.userId!,
                sessionData: validationResult.sessionData,
            };

            // Add session token to request for potential refresh
            req.sessionToken = sessionToken;

            next();
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }

            throw new UnauthorizedException('Session validation failed');
        }
    }
}

// Factory function for easier configuration
export function createSessionValidationMiddleware(sessionValidationService: SessionValidationService) {
    return new SessionValidationMiddleware(sessionValidationService);
}

// Decorator for applying session validation to specific routes
export function RequireSession() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const [req] = args;

            if (!req.user) {
                throw new UnauthorizedException('Session validation required');
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

// Optional session validation middleware (doesn't throw on missing session)
@Injectable()
export class OptionalSessionValidationMiddleware implements NestMiddleware {
    constructor(private readonly sessionValidationService: SessionValidationService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                const sessionToken = authHeader.substring(7);

                const validationResult = await this.sessionValidationService.validateSession(sessionToken);

                if (validationResult.isValid) {
                    req.user = {
                        id: validationResult.userId,
                        sessionData: validationResult.sessionData,
                    };
                    req.sessionToken = sessionToken;
                }
            }

            next();
        } catch (error) {
            // Log error but don't block request
            console.error('Optional session validation error:', error);
            next();
        }
    }
}

// Extend Request interface to include sessionUser and sessionToken
declare global {
    namespace Express {
        interface Request {
            sessionUser?: {
                id: string;
                sessionData: any;
            };
            sessionToken?: string;
        }
    }
}
