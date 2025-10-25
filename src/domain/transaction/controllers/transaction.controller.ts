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
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionDto, TransactionQueryDto } from '../dto';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(SessionValidationGuard)
export class TransactionController {
    constructor(private transactionService: TransactionService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(UserVerificationGuard)
    async createTransaction(
        @Request() req: any,
        @Body() createTransactionDto: CreateTransactionDto,
    ) {
        const sessionUser = req.sessionUser;

        // Ensure the sender is the authenticated user
        if (createTransactionDto.senderId !== sessionUser.id) {
            throw new UnauthorizedException(
                'Cannot create transaction for another user',
            );
        }

        const transactionRequest = {
            fromUserId: sessionUser.id,
            toUserId: createTransactionDto.recipientId,
            toExternalAddress: createTransactionDto.externalAddress,
            amount: BigInt(createTransactionDto.amount),
            token: createTransactionDto.tokenType,
            description: createTransactionDto.description,
        };

        const transaction =
            await this.transactionService.createTransaction(transactionRequest);

        return {
            id: transaction.transactionId,
            senderId: transactionRequest.fromUserId,
            recipientId: transactionRequest.toUserId,
            amount: transactionRequest.amount.toString(),
            tokenType: transactionRequest.token,
            status: transaction.status,
            description: transactionRequest.description,
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
        const sessionUser = req.sessionUser;
        const query: TransactionQueryDto = {
            userId: sessionUser.id,
            status: status as any,
            tokenType: tokenType as any,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        const transactions =
            await this.transactionService.getTransactionHistory(
                sessionUser.id,
                query.limit,
                query.offset,
                query.tokenType,
            );

        return transactions.map((transaction: any) => ({
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            recipientId: transaction.toUserId,
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
        const sessionUser = req.sessionUser;
        const transactions = await this.transactionService.getSentTransactions(
            sessionUser.id,
            limit ? parseInt(limit) : 50,
            offset ? parseInt(offset) : 0,
        );

        return transactions.map((transaction: any) => ({
            id: transaction.transactionId,
            recipientId: transaction.toUserId,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
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
        const sessionUser = req.sessionUser;
        const transactions =
            await this.transactionService.getReceivedTransactions(
                sessionUser.id,
                limit ? parseInt(limit) : 50,
                offset ? parseInt(offset) : 0,
            );

        return transactions.map((transaction: any) => ({
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            solanaTransactionHash: transaction.solanaTransactionHash,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.confirmedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
        }));
    }

    @Get(':id')
    async getTransaction(@Request() req: any, @Param('id') id: string) {
        const transaction = await this.transactionService.getTransaction(id);

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        const sessionUser = req.sessionUser;
        // Ensure user is either sender or recipient
        if (
            transaction.fromUserId !== sessionUser.id &&
            transaction.toUserId !== sessionUser.id
        ) {
            throw new ForbiddenException('Cannot access this transaction');
        }

        return {
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            recipientId: transaction.toUserId,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
        };
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.OK)
    @UseGuards(UserVerificationGuard)
    async confirmTransaction(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { solanaTransactionHash: string },
    ) {
        const transaction = await this.transactionService.getTransaction(id);

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        const sessionUser = req.sessionUser;
        // Only sender can confirm the transaction
        if (transaction.fromUserId !== sessionUser.id) {
            throw new UnauthorizedException(
                'Only sender can confirm transaction',
            );
        }

        await this.transactionService.updateTransactionStatus(
            id,
            'completed',
            body.solanaTransactionHash,
        );

        return {
            id: id,
            status: 'completed',
            solanaTransactionHash: body.solanaTransactionHash,
            confirmedAt: new Date(),
        };
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    async cancelTransaction(@Request() req: any, @Param('id') id: string) {
        const sessionUser = req.sessionUser;
        await this.transactionService.updateTransactionStatus(
            id,
            'failed',
            undefined,
            'Cancelled by user',
        );

        return {
            id: id,
            status: 'failed',
        };
    }

    @Get('stats/summary')
    async getTransactionStats(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const sessionUser = req.sessionUser;
        const stats = await this.transactionService.getTransactionStats(
            sessionUser.id,
        );

        return {
            totalSent: stats.totalSent.toString(),
            totalReceived: stats.totalReceived.toString(),
            transactionCount: stats.transactionCount,
            successRate: stats.successRate,
        };
    }

    @Get('pending')
    async getPendingTransactions(@Request() req: any) {
        const sessionUser = req.sessionUser;
        const pendingTransactions =
            await this.transactionService.getTransactionHistory(
                sessionUser.id,
                50,
                0,
            );

        // Filter to only include pending transactions
        const userPendingTransactions = pendingTransactions.filter(
            (t: any) => t.status === 'pending',
        );

        return userPendingTransactions.map((transaction: any) => ({
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            recipientId: transaction.toUserId,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            createdAt: transaction.createdAt,
        }));
    }
}
