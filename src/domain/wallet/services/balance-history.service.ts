import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import {
    BalanceHistory,
    BalanceChangeType,
} from '../entities/balance-history.entity';
import { Wallet } from '../entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';

export interface BalanceHistoryQuery {
    walletId?: string;
    tokenType?: TokenType;
    changeType?: BalanceChangeType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export interface BalanceHistoryStats {
    totalChanges: number;
    totalInflow: number;
    totalOutflow: number;
    netChange: number;
    changeTypeBreakdown: Record<BalanceChangeType, number>;
    tokenTypeBreakdown: Record<TokenType, number>;
}

/**
 * Service for managing wallet balance history
 *
 * @description This service tracks all balance changes for wallets,
 * providing audit trails and analytics for balance movements.
 */
@Injectable()
export class BalanceHistoryService {
    private readonly logger = new Logger(BalanceHistoryService.name);

    constructor(
        @InjectRepository(BalanceHistory)
        private balanceHistoryRepository: Repository<BalanceHistory>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
    ) {}

    /**
     * Record a balance change in history
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     * @param previousBalance - Previous balance amount
     * @param newBalance - New balance amount
     * @param changeType - Type of change
     * @param metadata - Additional metadata
     */
    async recordBalanceChange(
        walletId: string,
        tokenType: TokenType,
        previousBalance: number,
        newBalance: number,
        changeType: BalanceChangeType,
        metadata?: {
            transactionId?: string;
            solanaTransactionHash?: string;
            description?: string;
            additionalData?: Record<string, any>;
        },
    ): Promise<BalanceHistory> {
        // Validate wallet exists
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId, isActive: true },
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet with ID ${walletId} not found`);
        }

        // Calculate change amount
        const changeAmount = newBalance - previousBalance;

        // Validate change amount
        if (changeAmount === 0) {
            this.logger.debug(
                `No balance change detected for wallet ${walletId}, token ${tokenType}`,
            );
            return null as any; // Return null for no change
        }

        // Create balance history record
        const balanceHistory = this.balanceHistoryRepository.create({
            walletId,
            tokenType,
            previousBalance,
            newBalance,
            changeAmount,
            changeType,
            transactionId: metadata?.transactionId,
            solanaTransactionHash: metadata?.solanaTransactionHash,
            description: metadata?.description,
            metadata: metadata?.additionalData,
        });

        const savedHistory =
            await this.balanceHistoryRepository.save(balanceHistory);

        this.logger.log(
            `Recorded balance change for wallet ${walletId}, token ${tokenType}: ${changeAmount} (${changeType})`,
        );

        return savedHistory;
    }

    /**
     * Get balance history for a wallet
     * @param query - Query parameters
     * @returns Array of balance history records
     */
    async getBalanceHistory(
        query: BalanceHistoryQuery,
    ): Promise<BalanceHistory[]> {
        const queryBuilder = this.balanceHistoryRepository
            .createQueryBuilder('history')
            .leftJoinAndSelect('history.wallet', 'wallet')
            .orderBy('history.createdAt', 'DESC');

        // Apply filters
        if (query.walletId) {
            queryBuilder.andWhere('history.walletId = :walletId', {
                walletId: query.walletId,
            });
        }

        if (query.tokenType) {
            queryBuilder.andWhere('history.tokenType = :tokenType', {
                tokenType: query.tokenType,
            });
        }

        if (query.changeType) {
            queryBuilder.andWhere('history.changeType = :changeType', {
                changeType: query.changeType,
            });
        }

        if (query.startDate) {
            queryBuilder.andWhere('history.createdAt >= :startDate', {
                startDate: query.startDate,
            });
        }

        if (query.endDate) {
            queryBuilder.andWhere('history.createdAt <= :endDate', {
                endDate: query.endDate,
            });
        }

        // Apply pagination
        if (query.limit) {
            queryBuilder.limit(query.limit);
        }

        if (query.offset) {
            queryBuilder.offset(query.offset);
        }

        return await queryBuilder.getMany();
    }

    /**
     * Get balance history statistics
     * @param walletId - Wallet ID
     * @param tokenType - Token type (optional)
     * @param startDate - Start date (optional)
     * @param endDate - End date (optional)
     * @returns Balance history statistics
     */
    async getBalanceHistoryStats(
        walletId: string,
        tokenType?: TokenType,
        startDate?: Date,
        endDate?: Date,
    ): Promise<BalanceHistoryStats> {
        const queryBuilder = this.balanceHistoryRepository
            .createQueryBuilder('history')
            .where('history.walletId = :walletId', { walletId });

        if (tokenType) {
            queryBuilder.andWhere('history.tokenType = :tokenType', {
                tokenType,
            });
        }

        if (startDate) {
            queryBuilder.andWhere('history.createdAt >= :startDate', {
                startDate,
            });
        }

        if (endDate) {
            queryBuilder.andWhere('history.createdAt <= :endDate', { endDate });
        }

        const records = await queryBuilder.getMany();

        // Calculate statistics
        const totalChanges = records.length;
        const totalInflow = records
            .filter((r) => r.changeAmount > 0)
            .reduce((sum, r) => sum + Number(r.changeAmount), 0);
        const totalOutflow = Math.abs(
            records
                .filter((r) => r.changeAmount < 0)
                .reduce((sum, r) => sum + Number(r.changeAmount), 0),
        );
        const netChange = totalInflow - totalOutflow;

        // Change type breakdown
        const changeTypeBreakdown = {} as Record<BalanceChangeType, number>;
        records.forEach((record) => {
            const amount = Math.abs(Number(record.changeAmount));
            changeTypeBreakdown[record.changeType] =
                (changeTypeBreakdown[record.changeType] || 0) + amount;
        });

        // Token type breakdown
        const tokenTypeBreakdown = {} as Record<TokenType, number>;
        records.forEach((record) => {
            const amount = Math.abs(Number(record.changeAmount));
            tokenTypeBreakdown[record.tokenType] =
                (tokenTypeBreakdown[record.tokenType] || 0) + amount;
        });

        return {
            totalChanges,
            totalInflow,
            totalOutflow,
            netChange,
            changeTypeBreakdown,
            tokenTypeBreakdown,
        };
    }

    /**
     * Get balance at a specific point in time
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     * @param timestamp - Point in time
     * @returns Balance at that time
     */
    async getBalanceAtTime(
        walletId: string,
        tokenType: TokenType,
        timestamp: Date,
    ): Promise<number> {
        const lastRecord = await this.balanceHistoryRepository
            .createQueryBuilder('history')
            .where('history.walletId = :walletId', { walletId })
            .andWhere('history.tokenType = :tokenType', { tokenType })
            .andWhere('history.createdAt <= :timestamp', { timestamp })
            .orderBy('history.createdAt', 'DESC')
            .getOne();

        return lastRecord ? Number(lastRecord.newBalance) : 0;
    }

    /**
     * Get recent balance changes
     * @param walletId - Wallet ID
     * @param limit - Number of recent changes
     * @returns Recent balance changes
     */
    async getRecentBalanceChanges(
        walletId: string,
        limit: number = 10,
    ): Promise<BalanceHistory[]> {
        return await this.balanceHistoryRepository.find({
            where: { walletId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Clean up old balance history records
     * @param olderThanDays - Delete records older than this many days
     * @returns Number of deleted records
     */
    async cleanupOldRecords(olderThanDays: number = 365): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.balanceHistoryRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(
            `Cleaned up ${result.affected} old balance history records`,
        );
        return result.affected || 0;
    }

    /**
     * Get balance change summary for a period
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Summary of balance changes
     */
    async getBalanceChangeSummary(
        walletId: string,
        tokenType: TokenType,
        startDate: Date,
        endDate: Date,
    ): Promise<{
        startBalance: number;
        endBalance: number;
        totalInflow: number;
        totalOutflow: number;
        netChange: number;
        changeCount: number;
    }> {
        const startBalance = await this.getBalanceAtTime(
            walletId,
            tokenType,
            startDate,
        );
        const endBalance = await this.getBalanceAtTime(
            walletId,
            tokenType,
            endDate,
        );

        const records = await this.balanceHistoryRepository.find({
            where: {
                walletId,
                tokenType,
                createdAt: Between(startDate, endDate),
            },
        });

        const totalInflow = records
            .filter((r) => r.changeAmount > 0)
            .reduce((sum, r) => sum + Number(r.changeAmount), 0);
        const totalOutflow = Math.abs(
            records
                .filter((r) => r.changeAmount < 0)
                .reduce((sum, r) => sum + Number(r.changeAmount), 0),
        );
        const netChange = totalInflow - totalOutflow;

        return {
            startBalance,
            endBalance,
            totalInflow,
            totalOutflow,
            netChange,
            changeCount: records.length,
        };
    }
}
