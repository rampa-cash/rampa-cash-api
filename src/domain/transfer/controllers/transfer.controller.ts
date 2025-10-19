import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import {
    TransferOrchestrationService,
    TransferRequest,
    TransferResult,
} from '../services/transfer-orchestration.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';

@ApiTags('Transfer')
@Controller('transfer')
@UseGuards(JwtAuthGuard, UserVerificationGuard)
@ApiBearerAuth()
export class TransferController {
    constructor(
        private readonly transferOrchestrationService: TransferOrchestrationService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Initiate a transfer',
        description:
            'Transfer tokens between wallets with full validation and blockchain execution',
    })
    @ApiBody({ type: CreateTransferDto })
    @ApiResponse({
        status: 200,
        description: 'Transfer initiated successfully',
        schema: {
            type: 'object',
            properties: {
                transactionId: {
                    type: 'string',
                    description: 'Database transaction ID',
                },
                solanaTransactionHash: {
                    type: 'string',
                    description: 'Solana blockchain transaction hash',
                },
                status: {
                    type: 'string',
                    enum: ['pending', 'confirmed', 'failed', 'cancelled'],
                },
                message: {
                    type: 'string',
                    description: 'Transfer status message',
                },
                estimatedFee: {
                    type: 'number',
                    description: 'Estimated transaction fee in lamports',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid transfer request',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: {
                    type: 'string',
                    example: 'Transfer validation failed: Insufficient balance',
                },
                error: { type: 'string', example: 'Bad Request' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'User verification required',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: {
                    type: 'string',
                    example: 'Profile verification required for this operation',
                },
                error: { type: 'string', example: 'Forbidden' },
            },
        },
    })
    @ApiResponse({
        status: 500,
        description: 'Transfer execution failed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: {
                    type: 'string',
                    example: 'Transfer failed: Blockchain transfer failed',
                },
                error: { type: 'string', example: 'Internal Server Error' },
            },
        },
    })
    async initiateTransfer(
        @Request() req: any,
        @Body() createTransferDto: CreateTransferDto,
    ): Promise<TransferResult> {
        // Validate that user owns the from address
        if (createTransferDto.fromAddress) {
            // If fromAddress is provided, validate ownership
            const transferRequest: TransferRequest = {
                fromAddress: createTransferDto.fromAddress,
                toAddress: createTransferDto.toAddress,
                amount: createTransferDto.amount,
                tokenType: createTransferDto.tokenType,
                memo: createTransferDto.memo,
                userId: req.user.id,
            };

            return await this.transferOrchestrationService.initiateTransfer(
                transferRequest,
            );
        } else {
            // If no fromAddress provided, find user's primary wallet
            throw new BadRequestException(
                'From address is required for transfers',
            );
        }
    }
}
