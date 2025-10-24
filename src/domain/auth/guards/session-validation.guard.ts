import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionValidationService } from '../services/session-validation.service';

@Injectable()
export class SessionValidationGuard implements CanActivate {
    constructor(private readonly sessionValidationService: SessionValidationService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Authorization header with Bearer token is required');
        }

        const sessionToken = authHeader.substring(7);
        const validationResult = await this.sessionValidationService.validateSession(sessionToken);

        if (!validationResult.isValid) {
            throw new UnauthorizedException(validationResult.error || 'Invalid session');
        }

        // Add user information to request
        (request as any).sessionUser = {
            id: validationResult.userId!,
            sessionData: validationResult.sessionData,
        };

        // Add session token to request for potential refresh
        request.sessionToken = sessionToken;

        return true;
    }
}
