import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { UserVerificationStatus, UserStatus } from '../entities/user.entity';

@Injectable()
export class UserVerificationGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Check BOTH conditions for financial operations
        if (user.verificationStatus !== UserVerificationStatus.VERIFIED) {
            throw new ForbiddenException(
                'Profile verification required for this operation',
            );
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException(
                'Account must be active for this operation',
            );
        }

        return true;
    }
}
