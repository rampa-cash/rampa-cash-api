import {
    Controller,
    Post,
    Get,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from '../../user/services/user.service';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private userService: UserService,
        private authService: AuthService,
    ) {}

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    @ApiBearerAuth('BearerAuth')
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    logout(@Request() req: any): { message: string } {
        this.authService.revokeToken(req.user.id);
        return { message: 'Successfully logged out' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get user profile' })
    @ApiBearerAuth('BearerAuth')
    @ApiResponse({ status: 200, description: 'User profile retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
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
}
