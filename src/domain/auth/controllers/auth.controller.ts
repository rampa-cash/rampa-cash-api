import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    Inject,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
    AuthenticationService,
    AUTHENTICATION_SERVICE_TOKEN,
} from '../interfaces/authentication-service.interface';
import { SessionValidationService } from '../services/session-validation.service';
import { UserService } from '../../user/services/user.service';
import {
    UserVerificationStatus,
    AuthProvider,
} from '../../user/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        @Inject(AUTHENTICATION_SERVICE_TOKEN)
        private readonly authenticationService: AuthenticationService,
        private readonly sessionValidationService: SessionValidationService,
        private readonly userService: UserService,
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
            'The client should call para.exportSession() and send the serialized string here. ' +
            'Automatically creates or finds the user associated with the session.',
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
                        verificationStatus: { type: 'string' },
                        isVerified: { type: 'boolean' },
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
            // Import session (existing logic)
            const result = await this.authenticationService.importClientSession(
                body.serializedSession,
            );

            // Helper function to map authType to AuthProvider enum
            const mapAuthTypeToProvider = (authType?: string): AuthProvider => {
                // All OAuth providers (Apple/Google) come through Para SDK
                // and show as "email" type, so we use PARA
                switch (authType) {
                    case 'phone':
                        return AuthProvider.PHONE; // 'phone'
                    case 'email':
                        return AuthProvider.PARA; // 'para' (Includes Apple/Google/Email)
                    default:
                        return AuthProvider.PARA; // 'para'
                }
            };

            // NEW: Auto-create or find user with multiple lookup strategies
            let user;
            try {
                // Strategy 1: Email lookup (if email available)
                if (result.user.email) {
                    user = await this.userService.getUserByEmail(
                        result.user.email,
                    );
                }

                // Strategy 2: Phone lookup (if phone available and user not found)
                if (!user && result.user.phone) {
                    user = await this.userService.findByPhone(
                        result.user.phone,
                    );
                }

                // Strategy 3: AuthProviderId lookup (always available as fallback)
                if (!user && result.user.authProviderId) {
                    const authType =
                        result.user.authType ||
                        (result.user.email ? 'email' : 'phone');
                    const authProvider = mapAuthTypeToProvider(authType);
                    user = await this.userService.findByAuthProvider(
                        authProvider,
                        result.user.authProviderId,
                    );
                }

                if (!user) {
                    // Create new user from session
                    // Map auth type to AuthProvider enum
                    const authType =
                        result.user.authType ||
                        (result.user.email ? 'email' : 'phone');
                    const authProviderEnum = mapAuthTypeToProvider(authType);

                    // Convert AuthProvider enum to string for ParaSdkSessionData interface
                    // The interface expects 'PARA' | 'EMAIL' | 'PHONE' | 'GOOGLE' | 'APPLE'
                    // but we need to map the enum value to the correct string
                    let authProviderString:
                        | 'PARA'
                        | 'EMAIL'
                        | 'PHONE'
                        | 'GOOGLE'
                        | 'APPLE';
                    switch (authProviderEnum) {
                        case AuthProvider.PHONE:
                            authProviderString = 'PHONE';
                            break;
                        case AuthProvider.EMAIL:
                            authProviderString = 'EMAIL';
                            break;
                        case AuthProvider.GOOGLE:
                            authProviderString = 'GOOGLE';
                            break;
                        case AuthProvider.APPLE:
                            authProviderString = 'APPLE';
                            break;
                        default:
                            authProviderString = 'PARA';
                            break;
                    }

                    this.logger.log(
                        `Creating new user from Para session: ${result.user.email || result.user.phone || result.user.id}, authProvider: ${authProviderEnum}`,
                    );

                    user = await this.userService.createUserFromParaSdkSession({
                        userId: result.user.id,
                        email: result.user.email,
                        phoneNumber: result.user.phone,
                        authProvider: authProviderString,
                        expiresAt: result.expiresAt,
                    });
                } else {
                    // Update last login for existing user
                    this.logger.log(
                        `Found existing user, updating last login: ${user.id}`,
                    );
                    // Update lastLoginAt using the dedicated service method
                    try {
                        await this.userService.updateLastLogin(user.id);
                    } catch (updateError) {
                        // Log but don't fail - lastLoginAt update is not critical
                        this.logger.warn(
                            'Failed to update lastLoginAt',
                            updateError,
                        );
                    }
                    // Refresh user object to get latest data
                    user = await this.userService.findOne(user.id);
                }
            } catch (error) {
                // Log error and re-throw - user creation is critical
                // Without a user, the session is not useful
                this.logger.error('Failed to create/update user', error);
                throw new UnauthorizedException(
                    `Failed to create user: ${error.message || 'Unknown error'}`,
                );
            }

            // Ensure user was created/found
            if (!user) {
                this.logger.error('User creation failed - user is null');
                throw new UnauthorizedException(
                    'Failed to create or find user',
                );
            }

            return {
                success: true,
                sessionToken: result.sessionToken,
                user: user
                    ? {
                          id: user.id,
                          email: user.email,
                          phone: user.phone,
                          authProvider: result.user.authProvider,
                          verificationStatus: user.verificationStatus,
                          isVerified:
                              user.verificationStatus ===
                              UserVerificationStatus.VERIFIED,
                      }
                    : null,
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
