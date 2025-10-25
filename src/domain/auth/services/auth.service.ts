import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class AuthService {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
    ) {}

    /**
     * Health check for authentication service
     */
    async healthCheck(): Promise<{ status: string; message: string }> {
        return {
            status: 'ok',
            message: 'Authentication service is healthy',
        };
    }
}
