import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

export interface TransactionHistoryFilter {
    userId?: string;
    walletId?: string;
    status?: TransactionStatus;
    tokenType?: TokenType;
    fromDate?: Date;
    toDate?: Date;
    fromAddress?: string;
    toAddress?: string;
    limit?: number;
    offset?: number;
}

export interface TransactionHistorySummary {
    totalTransactions: number;
    totalSent: number;
    totalReceived: number;
    totalFees: number;
    averageTransactionValue: number;
    mostActiveToken: TokenType;
    recentActivity: Transaction[];
}

@Injectable()
export class TransactionHistoryService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) {}

    /**
     * Get transaction history for a user with optional filters
     */
    async getTransactionHistory(
        userId: string,
        filters: TransactionHistoryFilter = {},
    ): Promise<Transaction[]> {
        const {
            walletId,
            status,
            tokenType,
            fromDate,
            toDate,
            limit = 50,
            offset = 0,
        } = filters;

        const query = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
            .leftJoinAndSelect('transaction.recipientWallet', 'recipientWallet')
            .where(
                '(transaction.senderWallet.userId = :userId OR transaction.recipientWallet.userId = :userId)',
                {
                    userId,
                },
            );

        if (walletId) {
            query.andWhere(
                '(transaction.senderWalletId = :walletId OR transaction.recipientWalletId = :walletId)',
                { walletId },
            );
        }

        if (status) {
            query.andWhere('transaction.status = :status', { status });
        }

        if (tokenType) {
            query.andWhere('transaction.tokenType = :tokenType', { tokenType });
        }

        if (fromDate) {
            query.andWhere('transaction.createdAt >= :fromDate', { fromDate });
        }

        if (toDate) {
            query.andWhere('transaction.createdAt <= :toDate', { toDate });
        }

        return query
            .orderBy('transaction.createdAt', 'DESC')
            .limit(limit)
            .offset(offset)
            .getMany();
    }

    /**
     * Get sent transactions for a user
     */
    async getSentTransactions(
        userId: string,
        filters: Omit<TransactionHistoryFilter, 'userId'> = {},
    ): Promise<Transaction[]> {
        const {
            walletId,
            status,
            tokenType,
            fromDate,
            toDate,
            limit = 50,
            offset = 0,
        } = filters;

        const query = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
            .leftJoinAndSelect('transaction.recipientWallet', 'recipientWallet')
            .where('transaction.senderWallet.userId = :userId', { userId });

        if (walletId) {
            query.andWhere('transaction.senderWalletId = :walletId', {
                walletId,
            });
        }

        if (status) {
            query.andWhere('transaction.status = :status', { status });
        }

        if (tokenType) {
            query.andWhere('transaction.tokenType = :tokenType', { tokenType });
        }

        if (fromDate) {
            query.andWhere('transaction.createdAt >= :fromDate', { fromDate });
        }

        if (toDate) {
            query.andWhere('transaction.createdAt <= :toDate', { toDate });
        }

        return query
            .orderBy('transaction.createdAt', 'DESC')
            .limit(limit)
            .offset(offset)
            .getMany();
    }

    /**
     * Get received transactions for a user
     */
    async getReceivedTransactions(
        userId: string,
        filters: Omit<TransactionHistoryFilter, 'userId'> = {},
    ): Promise<Transaction[]> {
        const {
            walletId,
            status,
            tokenType,
            fromDate,
            toDate,
            limit = 50,
            offset = 0,
        } = filters;

        const query = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
            .leftJoinAndSelect('transaction.recipientWallet', 'recipientWallet')
            .where('transaction.recipientWallet.userId = :userId', { userId });

        if (walletId) {
            query.andWhere('transaction.recipientWalletId = :walletId', {
                walletId,
            });
        }

        if (status) {
            query.andWhere('transaction.status = :status', { status });
        }

        if (tokenType) {
            query.andWhere('transaction.tokenType = :tokenType', { tokenType });
        }

        if (fromDate) {
            query.andWhere('transaction.createdAt >= :fromDate', { fromDate });
        }

        if (toDate) {
            query.andWhere('transaction.createdAt <= :toDate', { toDate });
        }

        return query
            .orderBy('transaction.createdAt', 'DESC')
            .limit(limit)
            .offset(offset)
            .getMany();
    }

    /**
     * Get transaction history summary for a user
     */
    async getTransactionHistorySummary(
        userId: string,
        fromDate?: Date,
        toDate?: Date,
    ): Promise<TransactionHistorySummary> {
        const query = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoin('transaction.fromWallet', 'fromWallet')
            .leftJoin('transaction.toWallet', 'toWallet')
            .where(
                '(transaction.fromWallet.userId = :userId OR transaction.toWallet.userId = :userId)',
                { userId },
            );

        if (fromDate) {
            query.andWhere('transaction.createdAt >= :fromDate', { fromDate });
        }

        if (toDate) {
            query.andWhere('transaction.createdAt <= :toDate', { toDate });
        }

        const transactions = await query.getMany();

        const sentTransactions = transactions.filter(
            (t: Transaction) => t.senderWallet?.userId === userId,
        );
        const receivedTransactions = transactions.filter(
            (t: Transaction) => t.recipientWallet?.userId === userId,
        );

        const totalSent = sentTransactions.reduce(
            (sum: number, t: Transaction) => sum + Number(t.amount),
            0,
        );
        const totalReceived = receivedTransactions.reduce(
            (sum: number, t: Transaction) => sum + Number(t.amount),
            0,
        );
        const totalFees = transactions.reduce(
            (sum: number, t: Transaction) => sum + Number(t.fee || 0),
            0,
        );

        // Calculate most active token
        const tokenCounts = transactions.reduce(
            (counts: Record<TokenType, number>, t: Transaction) => {
                counts[t.tokenType] = (counts[t.tokenType] || 0) + 1;
                return counts;
            },
            {} as Record<TokenType, number>,
        );

        const mostActiveToken = Object.entries(tokenCounts).reduce(
            (max: string, [token, count]: [string, number]) =>
                count > (tokenCounts[max as TokenType] || 0) ? token : max,
            Object.keys(tokenCounts)[0] || TokenType.USDC,
        ) as TokenType;

        return {
            totalTransactions: transactions.length,
            totalSent,
            totalReceived,
            totalFees,
            averageTransactionValue:
                transactions.length > 0
                    ? (totalSent + totalReceived) / transactions.length
                    : 0,
            mostActiveToken: mostActiveToken || TokenType.USDC,
            recentActivity: transactions
                .sort(
                    (a: Transaction, b: Transaction) =>
                        b.createdAt.getTime() - a.createdAt.getTime(),
                )
                .slice(0, 5),
        };
    }

    /**
     * Get transaction by ID with user validation
     */
    async getTransactionById(
        transactionId: string,
        userId: string,
    ): Promise<Transaction> {
        const transaction = await this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
            .leftJoinAndSelect('transaction.recipientWallet', 'recipientWallet')
            .where('transaction.id = :transactionId', { transactionId })
            .andWhere(
                '(transaction.senderWallet.userId = :userId OR transaction.recipientWallet.userId = :userId)',
                { userId },
            )
            .getOne();

        if (!transaction) {
            throw new NotFoundException(
                `Transaction with ID ${transactionId} not found`,
            );
        }

        return transaction;
    }

    /**
     * Get transaction statistics for a user
     */
    async getTransactionStatistics(
        userId: string,
        period: 'day' | 'week' | 'month' | 'year' = 'month',
    ): Promise<{
        period: string;
        totalTransactions: number;
        totalVolume: number;
        averageTransactionValue: number;
        successRate: number;
        topTokens: Array<{ token: TokenType; count: number; volume: number }>;
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

        const transactions = await this.getTransactionHistory(userId, {
            fromDate,
            toDate: now,
        });

        const successfulTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );

        const tokenStats = transactions.reduce(
            (stats, t) => {
                if (!stats[t.tokenType]) {
                    stats[t.tokenType] = { count: 0, volume: 0 };
                }
                stats[t.tokenType].count++;
                stats[t.tokenType].volume += Number(t.amount);
                return stats;
            },
            {} as Record<TokenType, { count: number; volume: number }>,
        );

        const topTokens = Object.entries(tokenStats)
            .map(([token, stats]) => ({
                token: token as TokenType,
                count: stats.count,
                volume: stats.volume,
            }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);

        const totalVolume = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );

        return {
            period,
            totalTransactions: transactions.length,
            totalVolume,
            averageTransactionValue:
                transactions.length > 0 ? totalVolume / transactions.length : 0,
            successRate:
                transactions.length > 0
                    ? (successfulTransactions.length / transactions.length) *
                      100
                    : 0,
            topTokens,
        };
    }
}
