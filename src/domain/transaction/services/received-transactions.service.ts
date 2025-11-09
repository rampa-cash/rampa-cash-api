import { Injectable } from '@nestjs/common';
import { TransactionHistoryService } from './transaction-history.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

export interface ReceivedTransactionFilter {
    walletId?: string;
    status?: TransactionStatus;
    tokenType?: TokenType;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export interface ReceivedTransactionSummary {
    totalReceived: number;
    averageTransactionValue: number;
    successRate: number;
    pendingTransactions: number;
    failedTransactions: number;
    mostReceivedToken: TokenType;
    recentTransactions: Transaction[];
}

@Injectable()
export class ReceivedTransactionsService {
    constructor(
        private readonly transactionHistoryService: TransactionHistoryService,
    ) {}

    /**
     * Get received transactions for a user
     */
    async getReceivedTransactions(
        userId: string,
        filters: ReceivedTransactionFilter = {},
    ): Promise<Transaction[]> {
        return this.transactionHistoryService.getReceivedTransactions(
            userId,
            filters,
        );
    }

    /**
     * Get received transactions summary for a user
     */
    async getReceivedTransactionsSummary(
        userId: string,
        fromDate?: Date,
        toDate?: Date,
    ): Promise<ReceivedTransactionSummary> {
        const transactions = await this.getReceivedTransactions(userId, {
            fromDate,
            toDate,
        });

        const totalReceived = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );

        const successfulTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );
        const pendingTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.PENDING,
        );
        const failedTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.FAILED,
        );

        // Calculate most received token
        const tokenCounts = transactions.reduce(
            (counts, t) => {
                counts[t.tokenType] = (counts[t.tokenType] || 0) + 1;
                return counts;
            },
            {} as Record<TokenType, number>,
        );

        const mostReceivedToken = Object.entries(tokenCounts).reduce(
            (max: string, [token, count]: [string, number]) =>
                count > (tokenCounts[max as TokenType] || 0) ? token : max,
            Object.keys(tokenCounts)[0] || TokenType.USDC,
        ) as TokenType;

        return {
            totalReceived,
            averageTransactionValue:
                transactions.length > 0
                    ? totalReceived / transactions.length
                    : 0,
            successRate:
                transactions.length > 0
                    ? (successfulTransactions.length / transactions.length) *
                      100
                    : 0,
            pendingTransactions: pendingTransactions.length,
            failedTransactions: failedTransactions.length,
            mostReceivedToken: mostReceivedToken || TokenType.USDC,
            recentTransactions: transactions
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10),
        };
    }

    /**
     * Get received transactions by status
     */
    async getReceivedTransactionsByStatus(
        userId: string,
        status: TransactionStatus,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactions(userId, {
            status,
            limit,
            offset,
        });
    }

    /**
     * Get received transactions by token type
     */
    async getReceivedTransactionsByToken(
        userId: string,
        tokenType: TokenType,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactions(userId, {
            tokenType,
            limit,
            offset,
        });
    }

    /**
     * Get received transactions for a specific wallet
     */
    async getReceivedTransactionsByWallet(
        userId: string,
        walletId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactions(userId, {
            walletId,
            limit,
            offset,
        });
    }

    /**
     * Get received transactions in a date range
     */
    async getReceivedTransactionsInDateRange(
        userId: string,
        fromDate: Date,
        toDate: Date,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactions(userId, {
            fromDate,
            toDate,
            limit,
            offset,
        });
    }

    /**
     * Get pending received transactions
     */
    async getPendingReceivedTransactions(
        userId: string,
        limit: number = 20,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactionsByStatus(
            userId,
            TransactionStatus.PENDING,
            limit,
        );
    }

    /**
     * Get failed received transactions
     */
    async getFailedReceivedTransactions(
        userId: string,
        limit: number = 20,
    ): Promise<Transaction[]> {
        return this.getReceivedTransactionsByStatus(
            userId,
            TransactionStatus.FAILED,
            limit,
        );
    }

    /**
     * Get received transaction statistics
     */
    async getReceivedTransactionStatistics(
        userId: string,
        period: 'day' | 'week' | 'month' | 'year' = 'month',
    ): Promise<{
        period: string;
        totalReceived: number;
        averageTransactionValue: number;
        successRate: number;
        transactionCount: number;
        topSenders: Array<{
            address: string;
            count: number;
            totalAmount: number;
        }>;
    }> {
        const now = new Date();
        let fromDate: Date;

        switch (period) {
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

        const transactions = await this.getReceivedTransactions(userId, {
            fromDate,
            toDate: now,
        });

        const totalReceived = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );

        const successfulTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );

        // Calculate top senders
        const senderStats = transactions.reduce(
            (stats, t) => {
                const address = t.senderId;
                if (!stats[address]) {
                    stats[address] = { count: 0, totalAmount: 0 };
                }
                stats[address].count++;
                stats[address].totalAmount += Number(t.amount);
                return stats;
            },
            {} as Record<string, { count: number; totalAmount: number }>,
        );

        const topSenders = Object.entries(senderStats)
            .map(([address, stats]) => ({
                address,
                count: stats.count,
                totalAmount: stats.totalAmount,
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        return {
            period,
            totalReceived,
            averageTransactionValue:
                transactions.length > 0
                    ? totalReceived / transactions.length
                    : 0,
            successRate:
                transactions.length > 0
                    ? (successfulTransactions.length / transactions.length) *
                      100
                    : 0,
            transactionCount: transactions.length,
            topSenders,
        };
    }

    /**
     * Get unread received transactions count
     */
    async getUnreadReceivedTransactionsCount(userId: string): Promise<number> {
        const transactions = await this.getReceivedTransactions(userId, {
            limit: 1000, // Get a large number to count unread
        });

        // Assuming we have a field to track if transaction was read
        // For now, we'll count recent transactions as potentially unread
        const recentDate = new Date();
        recentDate.setHours(recentDate.getHours() - 24); // Last 24 hours

        return transactions.filter(
            (t) =>
                t.createdAt > recentDate &&
                t.status === TransactionStatus.CONFIRMED,
        ).length;
    }

    /**
     * Mark received transactions as read
     */
    async markReceivedTransactionsAsRead(
        userId: string,
        transactionIds: string[],
    ): Promise<void> {
        // This would typically update a read status field in the database
        // For now, we'll just validate that the transactions exist and belong to the user
        const transactions = await this.getReceivedTransactions(userId);
        const userTransactionIds = transactions.map((t) => t.id);

        const invalidIds = transactionIds.filter(
            (id) => !userTransactionIds.includes(id),
        );

        if (invalidIds.length > 0) {
            throw new Error(
                `Transactions not found or not accessible: ${invalidIds.join(', ')}`,
            );
        }

        // In a real implementation, you would update the database here
        // await this.transactionRepository.update(transactionIds, { isRead: true });
    }
}
