import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
} from '@nestjs/swagger';
import { ParaSdkAuthService } from '../services/para-sdk-auth.service';
import { SessionValidationService } from '../services/session-validation.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly paraSdkAuthService: ParaSdkAuthService,
        private readonly sessionValidationService: SessionValidationService,
    ) {}

    @Get('health')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authentication service health check' })
    @ApiResponse({ status: 200, description: 'Authentication service is healthy' })
    healthCheck(): { message: string; status: string } {
        return {
            message: 'Authentication service is healthy',
            status: 'ok',
        };
    }

    @Post('session/import')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Import session from client' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: { type: 'string', description: 'Session token from Para SDK' },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({ status: 200, description: 'Session imported successfully' })
    @ApiResponse({ status: 401, description: 'Invalid session token' })
    async importSession(@Body() body: { sessionToken: string }) {
        const result = await this.sessionValidationService.validateSession(body.sessionToken);
        if (!result.isValid || !result.user) {
            throw new UnauthorizedException(result.error || 'Invalid session token');
        }
        return {
            success: true,
            user: {
                id: result.user.id,
                email: result.user.email,
                authProvider: result.user.authProvider,
            },
        };
    }

    @Post('session/validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate session token' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: { type: 'string', description: 'Session token to validate' },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({ status: 200, description: 'Session is valid' })
    @ApiResponse({ status: 401, description: 'Invalid or expired session' })
    async validateSession(@Body() body: { sessionToken: string }) {
        const isValid = await this.sessionValidationService.isSessionValid(body.sessionToken);
        return {
            valid: isValid,
        };
    }

    @Post('session/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh session token' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                refreshToken: { type: 'string', description: 'Refresh token' },
            },
            required: ['refreshToken'],
        },
    })
    @ApiResponse({ status: 200, description: 'Session refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshSession(@Body() body: { refreshToken: string }) {
        const result = await this.paraSdkAuthService.refreshSession(body.refreshToken);
        return {
            success: true,
            sessionToken: result.sessionToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
        };
    }
}
