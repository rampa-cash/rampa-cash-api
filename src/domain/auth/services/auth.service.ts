import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private userService: UserService,
    ) {}

    async generateAccessToken(user: any): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
        };

        return this.jwtService.sign(payload, {
            secret:
                this.configService.get<string>('JWT_SECRET') ||
                'your-secret-key',
            expiresIn:
                this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
        });
    }

    async generateRefreshToken(user: any): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
        };

        return this.jwtService.sign(payload, {
            secret:
                this.configService.get<string>('JWT_REFRESH_SECRET') ||
                'your-refresh-secret-key',
            expiresIn:
                this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
                '7d',
        });
    }

    async refreshAccessToken(refreshToken: string): Promise<string> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret:
                    this.configService.get<string>('JWT_REFRESH_SECRET') ||
                    'your-refresh-secret-key',
            });

            const user = await this.userService.findOne(payload.sub);

            if (!user || !user.isActive || user.status !== 'active') {
                throw new UnauthorizedException('Invalid refresh token');
            }

            return this.generateAccessToken(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async revokeToken(userId: string): Promise<void> {
        // In a production environment, you would add the token to a blacklist
        // For now, we'll just log the revocation
        console.log(`Token revoked for user: ${userId}`);
    }

    async verifyEmail(token: string): Promise<void> {
        try {
            const payload = this.jwtService.verify(token, {
                secret:
                    this.configService.get<string>(
                        'JWT_EMAIL_VERIFICATION_SECRET',
                    ) || 'your-email-verification-secret',
            });

            const user = await this.userService.findOne(payload.sub);

            if (!user) {
                throw new UnauthorizedException('Invalid verification token');
            }

            // Update user as verified (you might want to add a verified field to the User entity)
            // await this.userService.update(user.id, { isEmailVerified: true });
        } catch (error) {
            throw new UnauthorizedException(
                'Invalid or expired verification token',
            );
        }
    }

    async resendVerificationEmail(email: string): Promise<void> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // In a production environment, you would send an actual email
        console.log(`Verification email sent to: ${email}`);
    }

    async sendPasswordResetEmail(email: string): Promise<void> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // In a production environment, you would send an actual email
        console.log(`Password reset email sent to: ${email}`);
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            const payload = this.jwtService.verify(token, {
                secret:
                    this.configService.get<string>(
                        'JWT_PASSWORD_RESET_SECRET',
                    ) || 'your-password-reset-secret',
            });

            const user = await this.userService.findOne(payload.sub);

            if (!user) {
                throw new UnauthorizedException('Invalid reset token');
            }

            // In a production environment, you would hash the password and update it
            // const hashedPassword = await bcrypt.hash(newPassword, 10);
            // await this.userService.update(user.id, { password: hashedPassword });
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired reset token');
        }
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            return null;
        }

        // In a production environment, you would compare hashed passwords
        // const isPasswordValid = await bcrypt.compare(password, user.password);
        // if (!isPasswordValid) {
        //   return null;
        // }

        return user;
    }
}
