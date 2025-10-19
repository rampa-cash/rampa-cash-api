import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Web3AuthValidationService } from '../services/web3auth-validation.service';
import { UserVerificationService } from '../../user/services/user-verification.service';

export interface Web3AuthValidateRequest {
    token: string;
}

export interface Web3AuthValidateResponse {
    user: {
        id: string;
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        language: string;
        authProvider: string;
        isActive: boolean;
        verificationStatus: string;
        status: string;
        verificationCompletedAt?: string;
        createdAt: string;
        lastLoginAt?: string;
    };
    accessToken: string;
    expiresIn: number;
    userId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    language: string;
    authProvider: string;
    isActive: boolean;
    verificationStatus: string;
    status: string;
    verificationCompletedAt?: string;
    canPerformFinancialOperations: boolean;
    canBrowseApp: boolean;
    shouldShowProfileCompletion: boolean;
}

@ApiTags('Web3Auth')
@Controller('auth/web3auth')
export class Web3AuthController {
    constructor(
        private web3AuthValidationService: Web3AuthValidationService,
        private userVerificationService: UserVerificationService,
    ) {}

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
                        email: {
                            type: 'string',
                            format: 'email',
                            nullable: true,
                        },
                        phone: { type: 'string', nullable: true },
                        firstName: { type: 'string', nullable: true },
                        lastName: { type: 'string', nullable: true },
                        language: { type: 'string', enum: ['en', 'es'] },
                        authProvider: { type: 'string' },
                        isActive: { type: 'boolean' },
                        verificationStatus: {
                            type: 'string',
                            enum: [
                                'pending_verification',
                                'verified',
                                'rejected',
                            ],
                        },
                        status: {
                            type: 'string',
                            enum: [
                                'active',
                                'suspended',
                                'pending_verification',
                            ],
                        },
                        verificationCompletedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        lastLoginAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
                accessToken: { type: 'string' },
                expiresIn: { type: 'number' },
                userId: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email', nullable: true },
                phone: { type: 'string', nullable: true },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                language: { type: 'string', enum: ['en', 'es'] },
                authProvider: { type: 'string' },
                isActive: { type: 'boolean' },
                verificationStatus: {
                    type: 'string',
                    enum: ['pending_verification', 'verified', 'rejected'],
                },
                status: {
                    type: 'string',
                    enum: ['active', 'suspended', 'pending_verification'],
                },
                verificationCompletedAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                },
                canPerformFinancialOperations: { type: 'boolean' },
                canBrowseApp: { type: 'boolean' },
                shouldShowProfileCompletion: { type: 'boolean' },
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

        // Get verification status and business logic flags
        const canPerformFinancialOperations =
            this.userVerificationService.canPerformFinancialOperations(user);
        const canBrowseApp = this.userVerificationService.canBrowseApp(user);
        const shouldShowProfileCompletion =
            this.userVerificationService.shouldShowProfileCompletion(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                language: user.language,
                authProvider: user.authProvider,
                isActive: user.isActive,
                verificationStatus: user.verificationStatus,
                status: user.status,
                verificationCompletedAt: user.verificationCompletedAt,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
            },
            accessToken,
            expiresIn,
            userId: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            language: user.language,
            authProvider: user.authProvider,
            isActive: user.isActive,
            verificationStatus: user.verificationStatus,
            status: user.status,
            verificationCompletedAt: user.verificationCompletedAt,
            canPerformFinancialOperations,
            canBrowseApp,
            shouldShowProfileCompletion,
        };
    }
}
