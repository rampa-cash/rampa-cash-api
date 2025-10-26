import { Injectable } from '@nestjs/common';
import { TransactionHistoryService } from './transaction-history.service';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

export interface SentTransactionFilter {
    walletId?: string;
    status?: TransactionStatus;
    tokenType?: TokenType;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export interface SentTransactionSummary {
    totalSent: number;
    totalFees: number;
    averageTransactionValue: number;
    successRate: number;
    pendingTransactions: number;
    failedTransactions: number;
    mostUsedToken: TokenType;
    recentTransactions: Transaction[];
}

@Injectable()
export class SentTransactionsService {
    constructor(
        private readonly transactionHistoryService: TransactionHistoryService,
    ) {}

    /**
     * Get sent transactions for a user
     */
    async getSentTransactions(
        userId: string,
        filters: SentTransactionFilter = {},
    ): Promise<Transaction[]> {
        return this.transactionHistoryService.getSentTransactions(userId, filters);
    }

    /**
     * Get sent transactions summary for a user
     */
    async getSentTransactionsSummary(
        userId: string,
        fromDate?: Date,
        toDate?: Date,
    ): Promise<SentTransactionSummary> {
        const transactions = await this.getSentTransactions(userId, {
            fromDate,
            toDate,
        });

        const totalSent = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );
        const totalFees = transactions.reduce(
            (sum, t) => sum + Number(t.fee || 0),
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

        // Calculate most used token
        const tokenCounts = transactions.reduce((counts, t) => {
            counts[t.tokenType] = (counts[t.tokenType] || 0) + 1;
            return counts;
        }, {} as Record<TokenType, number>);

        const mostUsedToken = Object.entries(tokenCounts).reduce(
            (max: string, [token, count]: [string, number]) => (count > (tokenCounts[max as TokenType] || 0) ? token : max),
            Object.keys(tokenCounts)[0] || TokenType.USDC,
        ) as TokenType;

        return {
            totalSent,
            totalFees,
            averageTransactionValue:
                transactions.length > 0 ? totalSent / transactions.length : 0,
            successRate:
                transactions.length > 0
                    ? (successfulTransactions.length / transactions.length) * 100
                    : 0,
            pendingTransactions: pendingTransactions.length,
            failedTransactions: failedTransactions.length,
            mostUsedToken: mostUsedToken || TokenType.USDC,
            recentTransactions: transactions
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10),
        };
    }

    /**
     * Get sent transactions by status
     */
    async getSentTransactionsByStatus(
        userId: string,
        status: TransactionStatus,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getSentTransactions(userId, {
            status,
            limit,
            offset,
        });
    }

    /**
     * Get sent transactions by token type
     */
    async getSentTransactionsByToken(
        userId: string,
        tokenType: TokenType,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getSentTransactions(userId, {
            tokenType,
            limit,
            offset,
        });
    }

    /**
     * Get sent transactions for a specific wallet
     */
    async getSentTransactionsByWallet(
        userId: string,
        walletId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getSentTransactions(userId, {
            walletId,
            limit,
            offset,
        });
    }

    /**
     * Get sent transactions in a date range
     */
    async getSentTransactionsInDateRange(
        userId: string,
        fromDate: Date,
        toDate: Date,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return this.getSentTransactions(userId, {
            fromDate,
            toDate,
            limit,
            offset,
        });
    }

    /**
     * Get pending sent transactions
     */
    async getPendingSentTransactions(
        userId: string,
        limit: number = 20,
    ): Promise<Transaction[]> {
        return this.getSentTransactionsByStatus(
            userId,
            TransactionStatus.PENDING,
            limit,
        );
    }

    /**
     * Get failed sent transactions
     */
    async getFailedSentTransactions(
        userId: string,
        limit: number = 20,
    ): Promise<Transaction[]> {
        return this.getSentTransactionsByStatus(
            userId,
            TransactionStatus.FAILED,
            limit,
        );
    }

    /**
     * Get sent transaction statistics
     */
    async getSentTransactionStatistics(
        userId: string,
        period: 'day' | 'week' | 'month' | 'year' = 'month',
    ): Promise<{
        period: string;
        totalSent: number;
        totalFees: number;
        averageTransactionValue: number;
        successRate: number;
        transactionCount: number;
        topRecipients: Array<{
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

        const transactions = await this.getSentTransactions(userId, {
            fromDate,
            toDate: now,
        });

        const totalSent = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );
        const totalFees = transactions.reduce(
            (sum, t) => sum + Number(t.fee || 0),
            0,
        );

        const successfulTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );

        // Calculate top recipients
        const recipientStats = transactions.reduce(
            (stats, t) => {
                const address = t.recipientId;
                if (!stats[address]) {
                    stats[address] = { count: 0, totalAmount: 0 };
                }
                stats[address].count++;
                stats[address].totalAmount += Number(t.amount);
                return stats;
            },
            {} as Record<string, { count: number; totalAmount: number }>,
        );

        const topRecipients = Object.entries(recipientStats)
            .map(([address, stats]) => ({
                address,
                count: stats.count,
                totalAmount: stats.totalAmount,
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);

        return {
            period,
            totalSent,
            totalFees,
            averageTransactionValue:
                transactions.length > 0 ? totalSent / transactions.length : 0,
            successRate:
                transactions.length > 0
                    ? (successfulTransactions.length / transactions.length) * 100
                    : 0,
            transactionCount: transactions.length,
            topRecipients,
        };
    }
}
