import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { TransactionService } from '../transaction.service';
import { CreateTransactionDto, TransactionQueryDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
    constructor(private transactionService: TransactionService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTransaction(
        @Request() req: any,
        @Body() createTransactionDto: CreateTransactionDto,
    ) {
        // Ensure the sender is the authenticated user
        if (createTransactionDto.senderId !== req.user.id) {
            throw new Error(
                'Unauthorized: Cannot create transaction for another user',
            );
        }

        const transaction =
            await this.transactionService.create(createTransactionDto);

        return {
            id: transaction.id,
            senderId: transaction.senderId,
            recipientId: transaction.recipientId,
            amount: transaction.amount,
            tokenType: transaction.tokenType,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            createdAt: transaction.createdAt,
        };
    }

    @Get()
    async getTransactions(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('tokenType') tokenType?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const query: TransactionQueryDto = {
            userId: req.user.id,
            status: status as any,
            tokenType: tokenType as any,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        const transactions = await this.transactionService.findAll(query);

        return transactions.map((transaction) => ({
            id: transaction.id,
            senderId: transaction.senderId,
            recipientId: transaction.recipientId,
            amount: transaction.amount,
            tokenType: transaction.tokenType,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            solanaTransactionHash: transaction.solanaTransactionHash,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.confirmedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
        }));
    }

    @Get('sent')
    async getSentTransactions(
        @Request() req: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const transactions = await this.transactionService.findByUser(
            req.user.id,
            limit ? parseInt(limit) : 50,
            offset ? parseInt(offset) : 0,
        );

        return transactions
            .filter((t) => t.senderId === req.user.id)
            .map((transaction) => ({
                id: transaction.id,
                recipientId: transaction.recipientId,
                amount: transaction.amount,
                tokenType: transaction.tokenType,
                status: transaction.status,
                description: transaction.description,
                fee: transaction.fee,
                solanaTransactionHash: transaction.solanaTransactionHash,
                createdAt: transaction.createdAt,
                confirmedAt: transaction.confirmedAt,
                failedAt: transaction.failedAt,
                failureReason: transaction.failureReason,
            }));
    }

    @Get('received')
    async getReceivedTransactions(
        @Request() req: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const transactions = await this.transactionService.findByUser(
            req.user.id,
            limit ? parseInt(limit) : 50,
            offset ? parseInt(offset) : 0,
        );

        return transactions
            .filter((t) => t.recipientId === req.user.id)
            .map((transaction) => ({
                id: transaction.id,
                senderId: transaction.senderId,
                amount: transaction.amount,
                tokenType: transaction.tokenType,
                status: transaction.status,
                description: transaction.description,
                fee: transaction.fee,
                solanaTransactionHash: transaction.solanaTransactionHash,
                createdAt: transaction.createdAt,
                confirmedAt: transaction.confirmedAt,
                failedAt: transaction.failedAt,
                failureReason: transaction.failureReason,
            }));
    }

    @Get(':id')
    async getTransaction(@Request() req: any, @Param('id') id: string) {
        const transaction = await this.transactionService.findOne(id);

        // Ensure user is either sender or recipient
        if (
            transaction.senderId !== req.user.id &&
            transaction.recipientId !== req.user.id
        ) {
            throw new Error('Unauthorized: Cannot access this transaction');
        }

        return {
            id: transaction.id,
            senderId: transaction.senderId,
            recipientId: transaction.recipientId,
            amount: transaction.amount,
            tokenType: transaction.tokenType,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            solanaTransactionHash: transaction.solanaTransactionHash,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.confirmedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
        };
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.OK)
    async confirmTransaction(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { solanaTransactionHash: string },
    ) {
        const transaction = await this.transactionService.findOne(id);

        // Only sender can confirm the transaction
        if (transaction.senderId !== req.user.id) {
            throw new Error(
                'Unauthorized: Only sender can confirm transaction',
            );
        }

        const confirmedTransaction =
            await this.transactionService.confirmTransaction(
                id,
                body.solanaTransactionHash,
            );

        return {
            id: confirmedTransaction.id,
            status: confirmedTransaction.status,
            solanaTransactionHash: confirmedTransaction.solanaTransactionHash,
            confirmedAt: confirmedTransaction.confirmedAt,
        };
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    async cancelTransaction(@Request() req: any, @Param('id') id: string) {
        const cancelledTransaction =
            await this.transactionService.cancelTransaction(id, req.user.id);

        return {
            id: cancelledTransaction.id,
            status: cancelledTransaction.status,
        };
    }

    @Get('stats/summary')
    async getTransactionStats(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const stats = await this.transactionService.getTransactionStats(
            req.user.id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );

        return {
            totalSent: stats.totalSent,
            totalReceived: stats.totalReceived,
            totalFees: stats.totalFees,
            transactionCount: stats.transactionCount,
        };
    }

    @Get('pending')
    async getPendingTransactions(@Request() req: any) {
        const pendingTransactions = await this.transactionService.findByStatus(
            'pending' as any,
        );

        // Filter to only include user's transactions
        const userPendingTransactions = pendingTransactions.filter(
            (t) => t.senderId === req.user.id || t.recipientId === req.user.id,
        );

        return userPendingTransactions.map((transaction) => ({
            id: transaction.id,
            senderId: transaction.senderId,
            recipientId: transaction.recipientId,
            amount: transaction.amount,
            tokenType: transaction.tokenType,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            createdAt: transaction.createdAt,
        }));
    }
}
