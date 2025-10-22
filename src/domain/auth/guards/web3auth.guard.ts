import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class Web3AuthGuard extends AuthGuard('web3auth') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (err || !user) {
            throw (
                err ||
                new UnauthorizedException('Invalid or expired Web3Auth token')
            );
        }

        // Additional validation for Web3Auth user
        if (!user.sub || !user.email || !user.verifierId) {
            throw new UnauthorizedException('Invalid Web3Auth user data');
        }

        return user;
    }
}

/**
 * Web3Auth JWT Guard that validates Web3Auth tokens and creates/updates users
 */
@Injectable()
export class Web3AuthJwtGuard extends AuthGuard('web3auth-jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (err || !user) {
            throw (
                err ||
                new UnauthorizedException('Invalid or expired Web3Auth token')
            );
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('User account is deactivated');
        }

        // Check if user status is active
        if (user.status !== 'active') {
            throw new UnauthorizedException('User account is suspended');
        }

        return user;
    }
}

/**
 * Optional Web3Auth Guard that allows both Web3Auth and JWT authentication
 */
@Injectable()
export class Web3AuthOrJwtGuard extends AuthGuard(['web3auth-jwt', 'jwt']) {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (err || !user) {
            throw err || new UnauthorizedException('Authentication required');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedException('User account is deactivated');
        }

        // Check if user status is active
        if (user.status !== 'active') {
            throw new UnauthorizedException('User account is suspended');
        }

        return user;
    }
}
