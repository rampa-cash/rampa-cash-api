import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { OnRampService, CreateOnRampRequest } from '../services/onramp.service';
import {
    OnRampTransaction,
    OnRampStatus,
    OnRampProvider,
} from '../entities/onramp-transaction.entity';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { TokenType } from '../../common/enums/token-type.enum';

export class CreateOnRampDto {
    walletId: string;
    amount: number;
    currency: string;
    tokenType: TokenType;
    provider: OnRampProvider;
    returnUrl?: string;
    metadata?: Record<string, any>;
}

export class OnRampStatusDto {
    transactionId: string;
    status: OnRampStatus;
    providerTransactionId?: string;
    paymentUrl?: string;
    amount?: number;
    currency?: string;
    tokenAmount?: number;
    tokenType?: TokenType;
    fee?: number;
    exchangeRate?: number;
    failureReason?: string;
    createdAt: Date;
    completedAt?: Date;
    failedAt?: Date;
}

@ApiTags('On-Ramp')
@Controller('onramp')
@UseGuards(SessionValidationGuard)
@ApiBearerAuth()
export class OnRampController {
    constructor(private readonly onRampService: OnRampService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new on-ramp transaction' })
    @ApiResponse({
        status: 201,
        description: 'On-ramp transaction created successfully',
    })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createTransaction(
        @Request() req: any,
        @Body() createOnRampDto: CreateOnRampDto,
    ): Promise<OnRampStatusDto> {
        const sessionUser = req.sessionUser;

        const request: CreateOnRampRequest = {
            userId: sessionUser.id,
            walletId: createOnRampDto.walletId,
            amount: createOnRampDto.amount,
            currency: createOnRampDto.currency,
            tokenType: createOnRampDto.tokenType,
            provider: createOnRampDto.provider,
            returnUrl: createOnRampDto.returnUrl,
            metadata: createOnRampDto.metadata,
        };

        const result = await this.onRampService.createTransaction(request);

        return {
            transactionId: result.transactionId,
            status: result.status,
            providerTransactionId: result.providerTransactionId,
            paymentUrl: result.paymentUrl,
            createdAt: new Date(),
        };
    }

    @Get(':transactionId')
    @ApiOperation({ summary: 'Get on-ramp transaction status' })
    @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
    @ApiResponse({
        status: 200,
        description: 'Transaction status retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getTransactionStatus(
        @Request() req: any,
        @Param('transactionId') transactionId: string,
    ): Promise<OnRampStatusDto> {
        const sessionUser = req.sessionUser;
        const transaction =
            await this.onRampService.getTransactionStatus(transactionId);

        // Verify user owns this transaction
        if (transaction.userId !== sessionUser.id) {
            throw new NotFoundException('Transaction not found');
        }

        return {
            transactionId: transaction.id,
            status: transaction.status,
            providerTransactionId: transaction.providerTransactionId,
            paymentUrl: transaction.providerPaymentUrl,
            amount: transaction.amount,
            currency: transaction.currency,
            tokenAmount: transaction.tokenAmount,
            tokenType: transaction.tokenType,
            fee: transaction.fee,
            exchangeRate: transaction.exchangeRate,
            failureReason: transaction.failureReason,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
            failedAt: transaction.failedAt,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get user on-ramp transaction history' })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of transactions to return',
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        description: 'Number of transactions to skip',
    })
    @ApiResponse({
        status: 200,
        description: 'Transaction history retrieved successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserTransactions(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<OnRampStatusDto[]> {
        const sessionUser = req.sessionUser;
        const transactions = await this.onRampService.getUserTransactions(
            sessionUser.id,
            limit || 50,
            offset || 0,
        );

        return transactions.map((transaction) => ({
            transactionId: transaction.id,
            status: transaction.status,
            providerTransactionId: transaction.providerTransactionId,
            paymentUrl: transaction.providerPaymentUrl,
            amount: transaction.amount,
            currency: transaction.currency,
            tokenAmount: transaction.tokenAmount,
            tokenType: transaction.tokenType,
            fee: transaction.fee,
            exchangeRate: transaction.exchangeRate,
            failureReason: transaction.failureReason,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
            failedAt: transaction.failedAt,
        }));
    }
}
