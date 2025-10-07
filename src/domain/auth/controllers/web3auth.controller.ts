import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Web3AuthValidationService } from '../services/web3auth-validation.service';

export interface Web3AuthValidateRequest {
    token: string;
}

export interface Web3AuthValidateResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        language: string;
        authProvider: string;
        isActive: boolean;
        status: string;
        createdAt: string;
        lastLoginAt?: string;
    };
    accessToken: string;
    expiresIn: number;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    authProvider: string;
    isActive: boolean;
}

@ApiTags('Web3Auth')
@Controller('auth/web3auth')
export class Web3AuthController {
    constructor(private web3AuthValidationService: Web3AuthValidationService) {}

    @Post('validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Validate Web3Auth JWT token' })
    @ApiResponse({
        status: 200,
        description: 'Web3Auth token validated successfully',
        type: 'object',
        schema: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        language: { type: 'string', enum: ['en', 'es'] },
                        authProvider: { type: 'string' },
                        isActive: { type: 'boolean' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        lastLoginAt: { type: 'string', format: 'date-time' },
                    },
                },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                userId: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                language: { type: 'string', enum: ['en', 'es'] },
                authProvider: { type: 'string' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid Web3Auth token' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    async validateToken(
        @Body() body: Web3AuthValidateRequest,
    ): Promise<Web3AuthValidateResponse> {
        // Validate the Web3Auth JWT token
        const web3AuthUser =
            await this.web3AuthValidationService.validateWeb3AuthJWT(
                body.token,
            );

        // Create or update user in database
        const user =
            await this.web3AuthValidationService.validateAndCreateUser(
                web3AuthUser,
            );

        // Generate our API's JWT token
        const { accessToken, expiresIn } =
            await this.web3AuthValidationService.generateApiToken(user);

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
            expiresIn,
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            language: user.language,
            authProvider: user.authProvider,
            isActive: user.isActive,
        };
    }
}
