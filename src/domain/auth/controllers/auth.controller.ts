import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
    AuthenticationService,
    AUTHENTICATION_SERVICE_TOKEN,
} from '../interfaces/authentication-service.interface';
import { SessionValidationService } from '../services/session-validation.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AUTHENTICATION_SERVICE_TOKEN)
        private readonly authenticationService: AuthenticationService,
        private readonly sessionValidationService: SessionValidationService,
    ) {}

    @Get('health')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authentication service health check' })
    @ApiResponse({
        status: 200,
        description: 'Authentication service is healthy',
    })
    healthCheck(): { message: string; status: string } {
        return {
            message: 'Authentication service is healthy',
            status: 'ok',
        };
    }

    @Post('session/import')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Import session from client',
        description:
            'Imports a serialized session from the Para client SDK. ' +
            'The client should call para.exportSession() and send the serialized string here.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                serializedSession: {
                    type: 'string',
                    description:
                        'Serialized session string from Para client SDK (exported via para.exportSession())',
                    example: 'serialized_session_string_from_client',
                },
            },
            required: ['serializedSession'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Session imported successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                sessionToken: { type: 'string' },
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        authProvider: { type: 'string' },
                    },
                },
                expiresAt: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid or malformed session' })
    @ApiResponse({ status: 400, description: 'Missing serializedSession' })
    async importSession(@Body() body: { serializedSession: string }) {
        if (!body.serializedSession || body.serializedSession.trim() === '') {
            throw new UnauthorizedException('serializedSession is required');
        }

        try {
            const result = await this.authenticationService.importClientSession(
                body.serializedSession,
            );

            return {
                success: true,
                sessionToken: result.sessionToken,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    authProvider: result.user.authProvider,
                },
                expiresAt: result.expiresAt,
            };
        } catch (error) {
            throw new UnauthorizedException(
                error.message || 'Failed to import session',
            );
        }
    }

    @Post('session/validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate session token' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: {
                    type: 'string',
                    description: 'Session token to validate',
                },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({ status: 200, description: 'Session is valid' })
    @ApiResponse({ status: 401, description: 'Invalid or expired session' })
    async validateSession(@Body() body: { sessionToken: string }) {
        const isValid = await this.sessionValidationService.isSessionValid(
            body.sessionToken,
        );
        return {
            valid: isValid,
        };
    }

    @Post('session/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Keep session alive (extend session validity)',
        description:
            'Extends the validity of an imported session using Para SDK keepSessionAlive(). ' +
            'Note: Para SDK uses keepSessionAlive() instead of traditional refresh tokens. ' +
            'The sessionToken from the imported session should be used here.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: {
                    type: 'string',
                    description:
                        'Session token from imported session (not a separate refresh token)',
                },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Session kept alive successfully',
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired session' })
    async refreshSession(@Body() body: { sessionToken: string }) {
        // For Para SDK, we use the sessionToken (not a separate refreshToken)
        const result = await this.authenticationService.refreshSession(
            body.sessionToken,
        );
        return {
            success: true,
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt,
        };
    }

    @Post('session/keep-alive')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Keep session alive',
        description:
            'Extends session validity using Para SDK keepSessionAlive() method. ' +
            'Reference: https://docs.getpara.com/v2/server/guides/sessions',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: {
                    type: 'string',
                    description: 'Session token to keep alive',
                },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Session kept alive successfully',
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired session' })
    async keepSessionAlive(@Body() body: { sessionToken: string }) {
        const isActive = await this.authenticationService.isSessionActive(
            body.sessionToken,
        );
        if (!isActive) {
            throw new UnauthorizedException('Session is not active');
        }

        // Use keepSessionAlive through refreshSession (which uses keepSessionAlive internally)
        const result = await this.authenticationService.refreshSession(
            body.sessionToken,
        );

        return {
            success: true,
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt,
        };
    }

    @Post('session/jwt')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Issue JWT token for session',
        description:
            'Issues a JWT token for an imported session. The JWT contains user information ' +
            'and wallet attestations. Reference: https://docs.getpara.com/v2/server/guides/sessions',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sessionToken: {
                    type: 'string',
                    description: 'Session token from imported session',
                },
            },
            required: ['sessionToken'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'JWT token issued successfully',
        schema: {
            type: 'object',
            properties: {
                token: { type: 'string' },
                keyId: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired session' })
    async issueJwt(@Body() body: { sessionToken: string }) {
        const result = await this.authenticationService.issueJwt(
            body.sessionToken,
        );
        if (!result) {
            throw new UnauthorizedException(
                'Failed to issue JWT - session may be invalid',
            );
        }

        return {
            success: true,
            token: result.token,
            keyId: result.keyId,
            expiresAt: result.expiresAt,
        };
    }

    @Post('session/verify-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify verification token',
        description:
            'Validates a verification token from Para client without importing the session. ' +
            'Useful for simple authentication checks. ' +
            'Reference: https://docs.getpara.com/v2/server/guides/sessions',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                verificationToken: {
                    type: 'string',
                    description:
                        'Verification token from client (obtained via para.getVerificationToken())',
                },
            },
            required: ['verificationToken'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Token verified successfully',
        schema: {
            type: 'object',
            properties: {
                authType: { type: 'string' },
                identifier: { type: 'string' },
                oAuthMethod: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid or expired verification token',
    })
    async verifyToken(@Body() body: { verificationToken: string }) {
        const result = await this.authenticationService.verifyToken(
            body.verificationToken,
        );
        if (!result) {
            throw new UnauthorizedException(
                'Invalid or expired verification token',
            );
        }

        return {
            success: true,
            authType: result.authType,
            identifier: result.identifier,
            oAuthMethod: result.oAuthMethod,
        };
    }

    @Post('wallet/verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify wallet ownership',
        description:
            "Verifies that a wallet address matches one of your users' embedded wallets. " +
            'Reference: https://docs.getpara.com/v2/server/guides/sessions',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                address: {
                    type: 'string',
                    description: 'Wallet address to verify',
                },
            },
            required: ['address'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Wallet verified successfully',
        schema: {
            type: 'object',
            properties: {
                walletId: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async verifyWallet(@Body() body: { address: string }) {
        const walletId = await this.authenticationService.verifyWallet(
            body.address,
        );
        if (!walletId) {
            throw new UnauthorizedException(
                `Wallet not found with address: ${body.address}`,
            );
        }

        return {
            success: true,
            walletId,
        };
    }
}
