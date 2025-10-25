import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import {
    OffRampService,
    CreateOffRampDto,
    UpdateOffRampStatusDto,
} from '../services/offramp.service';
import {
    OffRampTransaction,
    OffRampStatus,
    OffRampProvider,
} from '../entities/offramp-transaction.entity';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

@ApiTags('Off-Ramp')
@ApiBearerAuth()
@Controller('offramp')
@UseGuards(SessionValidationGuard)
export class OffRampController {
    constructor(private readonly offRampService: OffRampService) {}

    @Post()
    @ApiOperation({ summary: 'Create off-ramp transaction' })
    @ApiResponse({
        status: 201,
        description: 'Off-ramp transaction created successfully',
    })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    async createOffRamp(
        @Body() createOffRampDto: CreateOffRampDto,
        @Request() req: any,
    ): Promise<OffRampTransaction> {
        // Ensure user can only create transactions for themselves
        createOffRampDto.userId = req.sessionUser.userId;
        return await this.offRampService.createOffRampTransaction(
            createOffRampDto,
        );
    }

    @Post(':id/initiate')
    @ApiOperation({ summary: 'Initiate off-ramp transaction' })
    @ApiResponse({
        status: 200,
        description: 'Off-ramp transaction initiated successfully',
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @ApiResponse({ status: 400, description: 'Invalid transaction status' })
    async initiateOffRamp(
        @Param('id') transactionId: string,
        @Request() req: any,
    ): Promise<OffRampTransaction> {
        // Verify user owns the transaction
        const transaction =
            await this.offRampService.getOffRampTransaction(transactionId);
        if (!transaction || transaction.userId !== req.sessionUser.userId) {
            throw new Error('Transaction not found or access denied');
        }

        return await this.offRampService.initiateOffRamp(transactionId);
    }

    @Get()
    @ApiOperation({ summary: 'Get user off-ramp transactions' })
    @ApiResponse({
        status: 200,
        description: 'Off-ramp transactions retrieved successfully',
    })
    async getOffRampTransactions(
        @Request() req: any,
        @Query('status') status?: OffRampStatus,
    ): Promise<OffRampTransaction[]> {
        return await this.offRampService.getOffRampTransactionsForUser(
            req.sessionUser.userId,
            status,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get specific off-ramp transaction' })
    @ApiResponse({
        status: 200,
        description: 'Off-ramp transaction retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    async getOffRampTransaction(
        @Param('id') transactionId: string,
        @Request() req: any,
    ): Promise<OffRampTransaction> {
        const transaction =
            await this.offRampService.getOffRampTransaction(transactionId);
        if (!transaction || transaction.userId !== req.sessionUser.userId) {
            throw new Error('Transaction not found or access denied');
        }
        return transaction;
    }

    @Put(':id/status')
    @ApiOperation({ summary: 'Update off-ramp transaction status' })
    @ApiResponse({
        status: 200,
        description: 'Transaction status updated successfully',
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    async updateOffRampStatus(
        @Param('id') transactionId: string,
        @Body() updateDto: UpdateOffRampStatusDto,
        @Request() req: any,
    ): Promise<OffRampTransaction> {
        // Verify user owns the transaction
        const transaction =
            await this.offRampService.getOffRampTransaction(transactionId);
        if (!transaction || transaction.userId !== req.sessionUser.userId) {
            throw new Error('Transaction not found or access denied');
        }

        return await this.offRampService.updateOffRampStatus(
            transactionId,
            updateDto.status,
            updateDto.providerTransactionId,
            updateDto.failureReason,
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Cancel off-ramp transaction' })
    @ApiResponse({
        status: 200,
        description: 'Off-ramp transaction cancelled successfully',
    })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @ApiResponse({
        status: 400,
        description: 'Transaction cannot be cancelled',
    })
    async cancelOffRamp(
        @Param('id') transactionId: string,
        @Request() req: any,
    ): Promise<OffRampTransaction> {
        // Verify user owns the transaction
        const transaction =
            await this.offRampService.getOffRampTransaction(transactionId);
        if (!transaction || transaction.userId !== req.sessionUser.userId) {
            throw new Error('Transaction not found or access denied');
        }

        return await this.offRampService.cancelOffRamp(transactionId);
    }

    @Get('quote/:provider')
    @ApiOperation({ summary: 'Get off-ramp quote from provider' })
    @ApiResponse({ status: 200, description: 'Quote retrieved successfully' })
    async getOffRampQuote(
        @Param('provider') provider: OffRampProvider,
        @Query('tokenAmount') tokenAmount: number,
        @Query('tokenType') tokenType: string,
        @Query('fiatCurrency') fiatCurrency: string,
    ): Promise<any> {
        return await this.offRampService.getOffRampQuote(
            tokenAmount,
            tokenType,
            fiatCurrency,
            provider,
        );
    }

    @Get('stats/summary')
    @ApiOperation({ summary: 'Get user off-ramp statistics' })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully',
    })
    async getOffRampStats(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ): Promise<any> {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        return await this.offRampService.getOffRampStats(
            req.sessionUser.userId,
            start,
            end,
        );
    }

    @Get('providers/supported')
    @ApiOperation({ summary: 'Get supported off-ramp providers' })
    @ApiResponse({
        status: 200,
        description: 'Supported providers retrieved successfully',
    })
    async getSupportedProviders(): Promise<OffRampProvider[]> {
        return [
            OffRampProvider.TRANSAK,
            OffRampProvider.MOONPAY,
            OffRampProvider.RAMP,
            OffRampProvider.WYRE,
        ];
    }
}
