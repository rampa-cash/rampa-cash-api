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
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from '../services/transaction.service';
import { TransactionHistoryService } from '../services/transaction-history.service';
import { SentTransactionsService } from '../services/sent-transactions.service';
import { ReceivedTransactionsService } from '../services/received-transactions.service';
import { CreateTransactionDto, TransactionQueryDto } from '../dto';
import {
    TransactionHistoryQueryDto,
    TransactionHistoryResponseDto,
    TransactionHistorySummaryDto,
    SentTransactionSummaryDto,
    ReceivedTransactionSummaryDto,
    TransactionStatisticsDto,
    SentTransactionStatisticsDto,
    ReceivedTransactionStatisticsDto,
    TransactionSearchDto,
    MarkTransactionsAsReadDto,
    TransactionHistoryPeriodDto,
} from '../dto/transaction-history.dto';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(SessionValidationGuard)
export class TransactionController {
    constructor(
        private transactionService: TransactionService,
        private transactionHistoryService: TransactionHistoryService,
        private sentTransactionsService: SentTransactionsService,
        private receivedTransactionsService: ReceivedTransactionsService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(UserVerificationGuard)
    async createTransaction(
        @Request() req: any,
        @Body() createTransactionDto: CreateTransactionDto,
    ) {
        const sessionUser = req.user;
        const paraSessionToken =
            req.headers['x-para-session-token'] ||
            req.headers['para-session-token'];

        // Validate that either recipientId or externalAddress is provided, but not both
        if (
            !createTransactionDto.recipientId &&
            !createTransactionDto.externalAddress
        ) {
            throw new BadRequestException(
                'Either recipientId or externalAddress must be provided',
            );
        }

        if (
            createTransactionDto.recipientId &&
            createTransactionDto.externalAddress
        ) {
            throw new BadRequestException(
                'Cannot provide both recipientId and externalAddress',
            );
        }

        const transactionRequest = {
            fromUserId: sessionUser.id,
            toUserId: createTransactionDto.recipientId,
            toExternalAddress: createTransactionDto.externalAddress,
            amount: BigInt(
                 createTransactionDto.amount  ,
            ), // Convert to smallest units
            token: createTransactionDto.tokenType,
            description: createTransactionDto.description,
            memo: createTransactionDto.memo,
            fromAddress: createTransactionDto.fromAddress,
            paraSessionToken:
                typeof paraSessionToken === 'string'
                    ? paraSessionToken
                    : undefined,
            paraSerializedSession: createTransactionDto.paraSerializedSession,
        };

        const transaction =
            await this.transactionService.createTransaction(transactionRequest);

        return {
            id: transaction.transactionId,
            senderId: transactionRequest.fromUserId,
            recipientId: transactionRequest.toUserId,
            externalAddress: transactionRequest.toExternalAddress,
            amount: createTransactionDto.amount.toString(),
            tokenType: transactionRequest.token,
            status: transaction.status,
            description: transactionRequest.description,
            solanaTransactionHash: transaction.signature,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
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
        @Query('senderName') senderName?: string,
        @Query('recipientName') recipientName?: string,
    ) {
        const sessionUser = req.user;
        const query: TransactionQueryDto = {
            userId: sessionUser.id,
            status: status as any,
            tokenType: tokenType as any,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        const filters = {
            limit: query.limit,
            offset: query.offset,
            token: query.tokenType,
            senderName,
            recipientName,
            startDate: query.startDate,
            endDate: query.endDate,
        };

        const transactions =
            await this.transactionService.getTransactionHistory(
                sessionUser.id,
                filters,
            );

        return transactions.map((transaction: any) => ({
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            senderName: transaction.fromUserName,
            recipientId: transaction.toUserId,
            recipientName: transaction.toUserName,
            amount: transaction.amount,
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            solanaTransactionHash: transaction.signature,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.completedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
            direction: transaction.direction,
            isIncoming: transaction.isIncoming,
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
            recipientName: transaction.toUserName,
            senderId: transaction.fromUserId,
            senderName: transaction.fromUserName,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            fee: transaction.fee,
            solanaTransactionHash: transaction.signature,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.completedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
            direction: transaction.direction,
            isIncoming: transaction.isIncoming,
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
            senderName: transaction.fromUserName,
            recipientId: transaction.toUserId,
            recipientName: transaction.toUserName,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            solanaTransactionHash: transaction.signature,
            createdAt: transaction.createdAt,
            confirmedAt: transaction.completedAt,
            failedAt: transaction.failedAt,
            failureReason: transaction.failureReason,
            direction: transaction.direction,
            isIncoming: transaction.isIncoming,
        }));
    }

    @Get(':id')
    async getTransaction(@Request() req: any, @Param('id') id: string) {
        const sessionUser = req.sessionUser;
        const transaction = await this.transactionService.getTransaction(
            id,
            sessionUser?.id,
        );

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

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
            senderName: transaction.fromUserName,
            recipientId: transaction.toUserId,
            recipientName: transaction.toUserName,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
            direction: transaction.direction,
            isIncoming: transaction.isIncoming,
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
        const transaction = await this.transactionService.getTransaction(
            id,
            req.sessionUser?.id,
        );

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
                { limit: 50, offset: 0 },
            );

        // Filter to only include pending transactions
        const userPendingTransactions = pendingTransactions.filter(
            (t: any) => t.status === 'pending',
        );

        return userPendingTransactions.map((transaction: any) => ({
            id: transaction.transactionId,
            senderId: transaction.fromUserId,
            senderName: transaction.fromUserName,
            recipientId: transaction.toUserId,
            recipientName: transaction.toUserName,
            amount: transaction.amount.toString(),
            tokenType: transaction.token,
            status: transaction.status,
            description: transaction.description,
            createdAt: transaction.createdAt,
            direction: transaction.direction,
            isIncoming: transaction.isIncoming,
        }));
    }

    // Transaction History Endpoints

    @Get('history')
    @ApiOperation({ summary: 'Get transaction history with filters' })
    @ApiResponse({
        status: 200,
        description: 'Transaction history retrieved successfully',
    })
    async getTransactionHistory(
        @Request() req: any,
        @Query() query: TransactionHistoryQueryDto,
    ): Promise<TransactionHistoryResponseDto> {
        const sessionUser = req.sessionUser;
        const filters = {
            ...query,
            fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
            toDate: query.toDate ? new Date(query.toDate) : undefined,
        };

        const transactions =
            await this.transactionHistoryService.getTransactionHistory(
                sessionUser.id,
                filters,
            );

        return {
            transactions,
            total: transactions.length,
            count: transactions.length,
            offset: query.offset || 0,
            hasMore: transactions.length === (query.limit || 50),
        };
    }

    @Get('history/summary')
    @ApiOperation({ summary: 'Get transaction history summary' })
    @ApiResponse({
        status: 200,
        description: 'Transaction history summary retrieved successfully',
    })
    async getTransactionHistorySummary(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<TransactionHistorySummaryDto> {
        const sessionUser = req.sessionUser;
        const now = new Date();
        let fromDate: Date | undefined;

        switch (query.period) {
            case 'day':
                fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
        }

        return this.transactionHistoryService.getTransactionHistorySummary(
            sessionUser.id,
            fromDate,
            now,
        );
    }

    @Get('history/statistics')
    @ApiOperation({ summary: 'Get transaction statistics' })
    @ApiResponse({
        status: 200,
        description: 'Transaction statistics retrieved successfully',
    })
    async getTransactionStatistics(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<TransactionStatisticsDto> {
        const sessionUser = req.sessionUser;
        return this.transactionHistoryService.getTransactionStatistics(
            sessionUser.id,
            query.period || 'month',
        );
    }

    @Get('sent')
    @ApiOperation({ summary: 'Get sent transactions' })
    @ApiResponse({
        status: 200,
        description: 'Sent transactions retrieved successfully',
    })
    async getSentTransactionsHistory(
        @Request() req: any,
        @Query() query: TransactionHistoryQueryDto,
    ): Promise<TransactionHistoryResponseDto> {
        const sessionUser = req.sessionUser;
        const filters = {
            ...query,
            fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
            toDate: query.toDate ? new Date(query.toDate) : undefined,
        };

        const transactions =
            await this.sentTransactionsService.getSentTransactions(
                sessionUser.id,
                filters,
            );

        return {
            transactions,
            total: transactions.length,
            count: transactions.length,
            offset: query.offset || 0,
            hasMore: transactions.length === (query.limit || 50),
        };
    }

    @Get('sent/summary')
    @ApiOperation({ summary: 'Get sent transactions summary' })
    @ApiResponse({
        status: 200,
        description: 'Sent transactions summary retrieved successfully',
    })
    async getSentTransactionsSummary(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<SentTransactionSummaryDto> {
        const sessionUser = req.sessionUser;
        const now = new Date();
        let fromDate: Date | undefined;

        switch (query.period) {
            case 'day':
                fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
        }

        return this.sentTransactionsService.getSentTransactionsSummary(
            sessionUser.id,
            fromDate,
            now,
        );
    }

    @Get('sent/statistics')
    @ApiOperation({ summary: 'Get sent transactions statistics' })
    @ApiResponse({
        status: 200,
        description: 'Sent transactions statistics retrieved successfully',
    })
    async getSentTransactionStatistics(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<SentTransactionStatisticsDto> {
        const sessionUser = req.sessionUser;
        return this.sentTransactionsService.getSentTransactionStatistics(
            sessionUser.id,
            query.period || 'month',
        );
    }

    @Get('received')
    @ApiOperation({ summary: 'Get received transactions' })
    @ApiResponse({
        status: 200,
        description: 'Received transactions retrieved successfully',
    })
    async getReceivedTransactionsHistory(
        @Request() req: any,
        @Query() query: TransactionHistoryQueryDto,
    ): Promise<TransactionHistoryResponseDto> {
        const sessionUser = req.sessionUser;
        const filters = {
            ...query,
            fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
            toDate: query.toDate ? new Date(query.toDate) : undefined,
        };

        const transactions =
            await this.receivedTransactionsService.getReceivedTransactions(
                sessionUser.id,
                filters,
            );

        return {
            transactions,
            total: transactions.length,
            count: transactions.length,
            offset: query.offset || 0,
            hasMore: transactions.length === (query.limit || 50),
        };
    }

    @Get('received/summary')
    @ApiOperation({ summary: 'Get received transactions summary' })
    @ApiResponse({
        status: 200,
        description: 'Received transactions summary retrieved successfully',
    })
    async getReceivedTransactionsSummary(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<ReceivedTransactionSummaryDto> {
        const sessionUser = req.sessionUser;
        const now = new Date();
        let fromDate: Date | undefined;

        switch (query.period) {
            case 'day':
                fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
        }

        return this.receivedTransactionsService.getReceivedTransactionsSummary(
            sessionUser.id,
            fromDate,
            now,
        );
    }

    @Get('received/statistics')
    @ApiOperation({ summary: 'Get received transactions statistics' })
    @ApiResponse({
        status: 200,
        description: 'Received transactions statistics retrieved successfully',
    })
    async getReceivedTransactionStatistics(
        @Request() req: any,
        @Query() query: TransactionHistoryPeriodDto,
    ): Promise<ReceivedTransactionStatisticsDto> {
        const sessionUser = req.sessionUser;
        return this.receivedTransactionsService.getReceivedTransactionStatistics(
            sessionUser.id,
            query.period || 'month',
        );
    }

    @Get('search')
    @ApiOperation({ summary: 'Search transactions by address' })
    @ApiResponse({
        status: 200,
        description: 'Transaction search results retrieved successfully',
    })
    async searchTransactions(
        @Request() req: any,
        @Query() query: TransactionSearchDto,
    ): Promise<TransactionHistoryResponseDto> {
        const sessionUser = req.sessionUser;
        const transactions =
            await this.transactionHistoryService.getTransactionHistory(
                sessionUser.id,
                { fromAddress: query.address, limit: query.limit },
            );

        return {
            transactions,
            total: transactions.length,
            count: transactions.length,
            offset: 0,
            hasMore: false,
        };
    }

    @Post('received/mark-read')
    @ApiOperation({ summary: 'Mark received transactions as read' })
    @ApiResponse({
        status: 200,
        description: 'Transactions marked as read successfully',
    })
    async markReceivedTransactionsAsRead(
        @Request() req: any,
        @Body() body: MarkTransactionsAsReadDto,
    ): Promise<{ message: string }> {
        const sessionUser = req.sessionUser;
        await this.receivedTransactionsService.markReceivedTransactionsAsRead(
            sessionUser.id,
            body.transactionIds,
        );

        return { message: 'Transactions marked as read successfully' };
    }

    @Get('received/unread-count')
    @ApiOperation({ summary: 'Get unread received transactions count' })
    @ApiResponse({
        status: 200,
        description: 'Unread count retrieved successfully',
    })
    async getUnreadReceivedTransactionsCount(
        @Request() req: any,
    ): Promise<{ count: number }> {
        const sessionUser = req.sessionUser;
        const count =
            await this.receivedTransactionsService.getUnreadReceivedTransactionsCount(
                sessionUser.id,
            );

        return { count };
    }
}
