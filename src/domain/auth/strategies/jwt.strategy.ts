import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';
import { UserStatus } from '../../user/entities/user.entity';

export interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>('JWT_SECRET') || 'your-secret-key',
        });
    }

    async validate(payload: JwtPayload) {
        const { sub: userId, email: _email } = payload;

        try {
            const user = await this.userService.findOne(userId);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            if (!user.isActive) {
                throw new UnauthorizedException('User account is deactivated');
            }

            if (user.status !== UserStatus.ACTIVE) {
                throw new UnauthorizedException('User account is suspended');
            }

            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                language: user.language,
                authProvider: user.authProvider,
                isActive: user.isActive,
                status: user.status,
                lastLoginAt: user.lastLoginAt,
            };
        } catch (_error) {
            throw new UnauthorizedException('Invalid token or user not found');
        }
    }
}
