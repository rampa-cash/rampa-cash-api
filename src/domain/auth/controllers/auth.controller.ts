import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export interface LoginDto {
    email: string;
    password?: string;
    authProvider: string;
    authProviderId: string;
}

export interface AuthResponse {
    user: any;
    accessToken: string;
    refreshToken?: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        private userService: UserService,
        private authService: AuthService,
    ) { }

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async signup(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
        // Create user
        const user = await this.userService.create(createUserDto);

        // Generate tokens
        const accessToken = await this.authService.generateAccessToken(user);
        const refreshToken = await this.authService.generateRefreshToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                language: user.language,
                authProvider: user.authProvider,
                isActive: user.isActive,
                status: user.status,
                createdAt: user.createdAt,
            },
            accessToken,
            refreshToken,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
        // Find user by auth provider
        let user = await this.userService.findByAuthProvider(
            loginDto.authProvider,
            loginDto.authProviderId
        );

        // If user doesn't exist, create them
        if (!user) {
            const createUserDto: CreateUserDto = {
                email: loginDto.email,
                authProvider: loginDto.authProvider as any,
                authProviderId: loginDto.authProviderId,
                firstName: '', // These would come from the auth provider
                lastName: '',
                language: 'en' as any,
            };
            user = await this.userService.create(createUserDto);
        }

        // Update last login
        await this.userService.updateLastLogin(user.id);

        // Generate tokens
        const accessToken = await this.authService.generateAccessToken(user);
        const refreshToken = await this.authService.generateRefreshToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                language: user.language,
                authProvider: user.authProvider,
                isActive: user.isActive,
                status: user.status,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
            accessToken,
            refreshToken,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() body: { refreshToken: string }): Promise<{ accessToken: string }> {
        const accessToken = await this.authService.refreshAccessToken(body.refreshToken);
        return { accessToken };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: any): Promise<{ message: string }> {
        await this.authService.revokeToken(req.user.id);
        return { message: 'Successfully logged out' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: any): Promise<any> {
        const user = await this.userService.findOne(req.user.id);
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            language: user.language,
            authProvider: user.authProvider,
            isActive: user.isActive,
            status: user.status,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        };
    }

    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    async verifyEmail(@Body() body: { token: string }): Promise<{ message: string }> {
        await this.authService.verifyEmail(body.token);
        return { message: 'Email verified successfully' };
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() body: { email: string }): Promise<{ message: string }> {
        await this.authService.resendVerificationEmail(body.email);
        return { message: 'Verification email sent' };
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() body: { email: string }): Promise<{ message: string }> {
        await this.authService.sendPasswordResetEmail(body.email);
        return { message: 'Password reset email sent' };
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: { token: string; newPassword: string }): Promise<{ message: string }> {
        await this.authService.resetPassword(body.token, body.newPassword);
        return { message: 'Password reset successfully' };
    }
}
