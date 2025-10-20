import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    NotFoundException,
    Logger,
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
import { WalletService } from '../../wallet/services/wallet.service';

@ApiTags('Transfer')
@Controller('transfer')
@UseGuards(JwtAuthGuard, UserVerificationGuard)
@ApiBearerAuth()
export class TransferController {
    private readonly logger = new Logger(TransferController.name);

    constructor(
        private readonly transferOrchestrationService: TransferOrchestrationService,
        private readonly walletService: WalletService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Initiate a transfer',
        description:
            "Transfer tokens between wallets with full validation and blockchain execution. If fromAddress is not provided, the authenticated user's primary wallet will be used automatically.",
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
        let fromAddress: string;

        if (createTransferDto.fromAddress) {
            // If fromAddress is provided, use it
            fromAddress = createTransferDto.fromAddress;
        } else {
            // If no fromAddress provided, get user's primary wallet
            const wallet = await this.walletService.findByUserId(req.user.id);

            if (!wallet) {
                throw new NotFoundException(
                    'No wallet found for user. Please create a wallet first.',
                );
            }

            fromAddress = wallet.address;
        }

        // Extract JWT token from Authorization header
        const authHeader = req.headers.authorization;
        const userJwt = authHeader
            ? authHeader.replace('Bearer ', '')
            : undefined;

        this.logger.debug(
            `JWT extracted: ${!!userJwt}, length: ${userJwt?.length || 0}`,
        );

        const transferRequest: TransferRequest = {
            fromAddress,
            toAddress: createTransferDto.toAddress,
            amount: createTransferDto.amount,
            tokenType: createTransferDto.tokenType,
            memo: createTransferDto.memo,
            userId: req.user.id,
            userJwt,
        };

        return await this.transferOrchestrationService.initiateTransfer(
            transferRequest,
        );
    }
}
