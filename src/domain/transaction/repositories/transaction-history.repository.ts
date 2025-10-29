import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

export interface TransactionHistoryQuery {
    userId?: string;
    walletId?: string;
    status?: TransactionStatus;
    tokenType?: TokenType;
    fromDate?: Date;
    toDate?: Date;
    fromAddress?: string;
    toAddress?: string;
    minAmount?: number;
    maxAmount?: number;
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'amount' | 'status';
    orderDirection?: 'ASC' | 'DESC';
}

export interface TransactionHistoryStats {
    totalTransactions: number;
    totalVolume: number;
    averageTransactionValue: number;
    successRate: number;
    tokenBreakdown: Record<TokenType, { count: number; volume: number }>;
    statusBreakdown: Record<TransactionStatus, number>;
    dailyVolume: Array<{ date: string; volume: number; count: number }>;
}

@Injectable()
export class TransactionHistoryRepository {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) {}

    /**
     * Create a base query for transaction history
     */
    private createBaseQuery(): SelectQueryBuilder<Transaction> {
        return this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.fromWallet', 'fromWallet')
            .leftJoinAndSelect('transaction.toWallet', 'toWallet');
    }

    /**
     * Apply filters to the query
     */
    private applyFilters(
        query: SelectQueryBuilder<Transaction>,
        filters: TransactionHistoryQuery,
    ): SelectQueryBuilder<Transaction> {
        const {
            userId,
            walletId,
            status,
            tokenType,
            fromDate,
            toDate,
            fromAddress,
            toAddress,
            minAmount,
            maxAmount,
        } = filters;

        if (userId) {
            query.andWhere(
                '(transaction.fromWallet.userId = :userId OR transaction.toWallet.userId = :userId)',
                { userId },
            );
        }

        if (walletId) {
            query.andWhere(
                '(transaction.fromWalletId = :walletId OR transaction.toWalletId = :walletId)',
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

        if (fromAddress) {
            query.andWhere('transaction.fromAddress = :fromAddress', { fromAddress });
        }

        if (toAddress) {
            query.andWhere('transaction.toAddress = :toAddress', { toAddress });
        }

        if (minAmount !== undefined) {
            query.andWhere('transaction.amount >= :minAmount', { minAmount });
        }

        if (maxAmount !== undefined) {
            query.andWhere('transaction.amount <= :maxAmount', { maxAmount });
        }

        return query;
    }

    /**
     * Apply ordering to the query
     */
    private applyOrdering(
        query: SelectQueryBuilder<Transaction>,
        orderBy: string = 'createdAt',
        orderDirection: 'ASC' | 'DESC' = 'DESC',
    ): SelectQueryBuilder<Transaction> {
        return query.orderBy(`transaction.${orderBy}`, orderDirection);
    }

    /**
     * Get transaction history with filters
     */
    async getTransactionHistory(
        filters: TransactionHistoryQuery,
    ): Promise<Transaction[]> {
        const {
            limit = 50,
            offset = 0,
            orderBy = 'createdAt',
            orderDirection = 'DESC',
        } = filters;

        const query = this.createBaseQuery();
        this.applyFilters(query, filters);
        this.applyOrdering(query, orderBy, orderDirection);

        return query.limit(limit).offset(offset).getMany();
    }

    /**
     * Get transaction count with filters
     */
    async getTransactionCount(filters: TransactionHistoryQuery): Promise<number> {
        const query = this.createBaseQuery();
        this.applyFilters(query, filters);

        return query.getCount();
    }

    /**
     * Get sent transactions for a user
     */
    async getSentTransactions(
        userId: string,
        filters: Omit<TransactionHistoryQuery, 'userId'> = {},
    ): Promise<Transaction[]> {
        const query = this.createBaseQuery();
        query.where('transaction.fromWallet.userId = :userId', { userId });
        this.applyFilters(query, { ...filters, userId: undefined });

        const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC' } = filters;
        this.applyOrdering(query, orderBy, orderDirection);

        return query.limit(limit).offset(offset).getMany();
    }

    /**
     * Get received transactions for a user
     */
    async getReceivedTransactions(
        userId: string,
        filters: Omit<TransactionHistoryQuery, 'userId'> = {},
    ): Promise<Transaction[]> {
        const query = this.createBaseQuery();
        query.where('transaction.toWallet.userId = :userId', { userId });
        this.applyFilters(query, { ...filters, userId: undefined });

        const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC' } = filters;
        this.applyOrdering(query, orderBy, orderDirection);

        return query.limit(limit).offset(offset).getMany();
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStatistics(
        userId: string,
        fromDate?: Date,
        toDate?: Date,
    ): Promise<TransactionHistoryStats> {
        const query = this.createBaseQuery();
        query.where(
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

        const totalTransactions = transactions.length;
        const totalVolume = transactions.reduce(
            (sum, t) => sum + Number(t.amount),
            0,
        );
        const averageTransactionValue =
            totalTransactions > 0 ? totalVolume / totalTransactions : 0;

        const successfulTransactions = transactions.filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );
        const successRate =
            totalTransactions > 0
                ? (successfulTransactions.length / totalTransactions) * 100
                : 0;

        // Token breakdown
        const tokenBreakdown = transactions.reduce(
            (breakdown, t) => {
                if (!breakdown[t.tokenType]) {
                    breakdown[t.tokenType] = { count: 0, volume: 0 };
                }
                breakdown[t.tokenType].count++;
                breakdown[t.tokenType].volume += Number(t.amount);
                return breakdown;
            },
            {} as Record<TokenType, { count: number; volume: number }>,
        );

        // Status breakdown
        const statusBreakdown = transactions.reduce(
            (breakdown, t) => {
                breakdown[t.status] = (breakdown[t.status] || 0) + 1;
                return breakdown;
            },
            {} as Record<TransactionStatus, number>,
        );

        // Daily volume (last 30 days)
        const dailyVolume: Array<{ date: string; volume: number; count: number }> = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

            const dayTransactions = transactions.filter(
                (t) => t.createdAt >= startOfDay && t.createdAt < endOfDay,
            );

            dailyVolume.push({
                date: startOfDay.toISOString().split('T')[0],
                volume: dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
                count: dayTransactions.length,
            });
        }

        return {
            totalTransactions,
            totalVolume,
            averageTransactionValue,
            successRate,
            tokenBreakdown,
            statusBreakdown,
            dailyVolume,
        };
    }

    /**
     * Get transactions by date range
     */
    async getTransactionsByDateRange(
        userId: string,
        fromDate: Date,
        toDate: Date,
        limit: number = 100,
    ): Promise<Transaction[]> {
        return this.getTransactionHistory({
            userId,
            fromDate,
            toDate,
            limit,
        });
    }

    /**
     * Get transactions by token type
     */
    async getTransactionsByToken(
        userId: string,
        tokenType: TokenType,
        limit: number = 100,
    ): Promise<Transaction[]> {
        return this.getTransactionHistory({
            userId,
            tokenType,
            limit,
        });
    }

    /**
     * Get transactions by status
     */
    async getTransactionsByStatus(
        userId: string,
        status: TransactionStatus,
        limit: number = 100,
    ): Promise<Transaction[]> {
        return this.getTransactionHistory({
            userId,
            status,
            limit,
        });
    }

    /**
     * Search transactions by address
     */
    async searchTransactionsByAddress(
        userId: string,
        address: string,
        limit: number = 50,
    ): Promise<Transaction[]> {
        const query = this.createBaseQuery();
        query.where(
            '(transaction.fromWallet.userId = :userId OR transaction.toWallet.userId = :userId)',
            { userId },
        );
        query.andWhere(
            '(transaction.fromAddress ILIKE :address OR transaction.toAddress ILIKE :address)',
            { address: `%${address}%` },
        );

        return query
            .orderBy('transaction.createdAt', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * Get transaction by ID with user validation
     */
    async getTransactionById(
        transactionId: string,
        userId: string,
    ): Promise<Transaction | null> {
        const query = this.createBaseQuery();
        query.where('transaction.id = :transactionId', { transactionId });
        query.andWhere(
            '(transaction.fromWallet.userId = :userId OR transaction.toWallet.userId = :userId)',
            { userId },
        );

        return query.getOne();
    }

    /**
     * Get recent transactions for a user
     */
    async getRecentTransactions(
        userId: string,
        limit: number = 10,
    ): Promise<Transaction[]> {
        return this.getTransactionHistory({
            userId,
            limit,
            orderBy: 'createdAt',
            orderDirection: 'DESC',
        });
    }

    /**
     * Get pending transactions for a user
     */
    async getPendingTransactions(
        userId: string,
        limit: number = 20,
    ): Promise<Transaction[]> {
        return this.getTransactionsByStatus(
            userId,
            TransactionStatus.PENDING,
            limit,
        );
    }
}
