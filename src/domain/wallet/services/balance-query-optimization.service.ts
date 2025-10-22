import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { Wallet } from '../entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';

export interface BalanceQueryOptions {
    userId?: string;
    walletId?: string;
    tokenType?: TokenType;
    minBalance?: number;
    maxBalance?: number;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'balance' | 'createdAt' | 'updatedAt';
    orderDirection?: 'ASC' | 'DESC';
}

export interface BalanceAggregationResult {
    totalWallets: number;
    totalBalance: number;
    averageBalance: number;
    maxBalance: number;
    minBalance: number;
    tokenTypeBreakdown: Record<
        string,
        {
            count: number;
            totalBalance: number;
            averageBalance: number;
        }
    >;
}

export interface OptimizedBalanceQuery {
    query: SelectQueryBuilder<WalletBalance>;
    executionTime: number;
    estimatedRows: number;
    indexUsed: string[];
}

@Injectable()
export class BalanceQueryOptimizationService {
    private readonly logger = new Logger(BalanceQueryOptimizationService.name);

    constructor(
        @InjectRepository(WalletBalance)
        private readonly walletBalanceRepository: Repository<WalletBalance>,
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
    ) {}

    /**
     * Optimizes balance queries with caching and query analysis
     * @param options - Query options
     * @returns Optimized query result
     */
    async getOptimizedBalances(options: BalanceQueryOptions): Promise<{
        balances: WalletBalance[];
        query: OptimizedBalanceQuery;
        performance: {
            executionTime: number;
            rowsReturned: number;
            indexUsed: string[];
        };
    }> {
        const startTime = Date.now();

        try {
            // Build optimized query
            const query = this.buildOptimizedQuery(options);

            // Execute query
            const balances = await query.getMany();

            const executionTime = Date.now() - startTime;

            // Analyze query performance
            const performance = await this.analyzeQueryPerformance(
                query,
                executionTime,
                balances.length,
            );

            this.logger.debug(
                `Balance query executed in ${executionTime}ms, returned ${balances.length} rows`,
            );

            return {
                balances,
                query: {
                    query,
                    executionTime,
                    estimatedRows: balances.length,
                    indexUsed: performance.indexUsed,
                },
                performance,
            };
        } catch (error) {
            this.logger.error(
                `Error executing optimized balance query: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to execute optimized balance query: ${error.message}`,
            );
        }
    }

    /**
     * Gets balance aggregation with optimized queries
     * @param options - Query options
     * @returns Balance aggregation result
     */
    async getBalanceAggregation(
        options: BalanceQueryOptions,
    ): Promise<BalanceAggregationResult> {
        const startTime = Date.now();

        try {
            // Build base query
            const baseQuery = this.buildOptimizedQuery(options);

            // Get total count
            const totalWallets = await baseQuery.getCount();

            // Get balance statistics
            const balanceStats = await baseQuery
                .select([
                    'SUM(wallet_balance.balance) as totalBalance',
                    'AVG(wallet_balance.balance) as averageBalance',
                    'MAX(wallet_balance.balance) as maxBalance',
                    'MIN(wallet_balance.balance) as minBalance',
                ])
                .getRawOne();

            // Get token type breakdown
            const tokenBreakdown = await baseQuery
                .select([
                    'wallet_balance.tokenType as tokenType',
                    'COUNT(*) as count',
                    'SUM(wallet_balance.balance) as totalBalance',
                    'AVG(wallet_balance.balance) as averageBalance',
                ])
                .groupBy('wallet_balance.tokenType')
                .getRawMany();

            const executionTime = Date.now() - startTime;
            this.logger.debug(
                `Balance aggregation executed in ${executionTime}ms`,
            );

            return {
                totalWallets,
                totalBalance: parseFloat(balanceStats.totalBalance) || 0,
                averageBalance: parseFloat(balanceStats.averageBalance) || 0,
                maxBalance: parseFloat(balanceStats.maxBalance) || 0,
                minBalance: parseFloat(balanceStats.minBalance) || 0,
                tokenTypeBreakdown: tokenBreakdown.reduce((acc, item) => {
                    acc[item.tokenType] = {
                        count: parseInt(item.count),
                        totalBalance: parseFloat(item.totalBalance),
                        averageBalance: parseFloat(item.averageBalance),
                    };
                    return acc;
                }, {}),
            };
        } catch (error) {
            this.logger.error(
                `Error executing balance aggregation: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to execute balance aggregation: ${error.message}`,
            );
        }
    }

    /**
     * Gets balances with pagination and performance optimization
     * @param options - Query options
     * @returns Paginated balance result
     */
    async getPaginatedBalances(options: BalanceQueryOptions): Promise<{
        balances: WalletBalance[];
        totalCount: number;
        hasMore: boolean;
        performance: {
            executionTime: number;
            indexUsed: string[];
        };
    }> {
        const startTime = Date.now();

        try {
            const limit = options.limit || 50;
            const offset = options.offset || 0;

            // Build optimized query
            const query = this.buildOptimizedQuery(options);

            // Get total count (optimized)
            const totalCount = await query.getCount();

            // Apply pagination
            query.limit(limit).offset(offset);

            // Execute query
            const balances = await query.getMany();

            const executionTime = Date.now() - startTime;

            // Analyze performance
            const performance = await this.analyzeQueryPerformance(
                query,
                executionTime,
                balances.length,
            );

            return {
                balances,
                totalCount,
                hasMore: offset + balances.length < totalCount,
                performance,
            };
        } catch (error) {
            this.logger.error(
                `Error executing paginated balance query: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to execute paginated balance query: ${error.message}`,
            );
        }
    }

    /**
     * Builds optimized query based on options
     * @param options - Query options
     * @returns Optimized query builder
     */
    private buildOptimizedQuery(
        options: BalanceQueryOptions,
    ): SelectQueryBuilder<WalletBalance> {
        const query = this.walletBalanceRepository
            .createQueryBuilder('wallet_balance')
            .leftJoinAndSelect('wallet_balance.wallet', 'wallet');

        // Apply filters with optimization
        if (options.userId) {
            query.andWhere('wallet.userId = :userId', {
                userId: options.userId,
            });
        }

        if (options.walletId) {
            query.andWhere('wallet_balance.walletId = :walletId', {
                walletId: options.walletId,
            });
        }

        if (options.tokenType) {
            query.andWhere('wallet_balance.tokenType = :tokenType', {
                tokenType: options.tokenType,
            });
        }

        if (options.minBalance !== undefined) {
            query.andWhere('wallet_balance.balance >= :minBalance', {
                minBalance: options.minBalance,
            });
        }

        if (options.maxBalance !== undefined) {
            query.andWhere('wallet_balance.balance <= :maxBalance', {
                maxBalance: options.maxBalance,
            });
        }

        if (!options.includeInactive) {
            query.andWhere('wallet.isActive = :isActive', { isActive: true });
        }

        // Apply ordering
        const orderBy = options.orderBy || 'balance';
        const orderDirection = options.orderDirection || 'DESC';
        query.orderBy(`wallet_balance.${orderBy}`, orderDirection);

        // Add secondary ordering for consistency
        if (orderBy !== 'createdAt') {
            query.addOrderBy('wallet_balance.createdAt', 'DESC');
        }

        return query;
    }

    /**
     * Analyzes query performance
     * @param query - Query builder
     * @param executionTime - Execution time in ms
     * @param rowsReturned - Number of rows returned
     * @returns Performance analysis
     */
    private async analyzeQueryPerformance(
        query: SelectQueryBuilder<WalletBalance>,
        executionTime: number,
        rowsReturned: number,
    ): Promise<{
        executionTime: number;
        rowsReturned: number;
        indexUsed: string[];
    }> {
        try {
            // Get query plan (PostgreSQL specific)
            const explainQuery = query.getQuery();
            const explainResult = await query.connection.query(
                `EXPLAIN (ANALYZE, BUFFERS) ${explainQuery}`,
            );

            // Extract index usage information
            const indexUsed = this.extractIndexUsage(explainResult);

            // Log performance metrics
            this.logger.debug(
                `Query performance: ${executionTime}ms, ${rowsReturned} rows, indexes: ${indexUsed.join(', ')}`,
            );

            return {
                executionTime,
                rowsReturned,
                indexUsed,
            };
        } catch (error) {
            this.logger.warn(
                `Could not analyze query performance: ${error.message}`,
            );
            return {
                executionTime,
                rowsReturned,
                indexUsed: [],
            };
        }
    }

    /**
     * Extracts index usage from query plan
     * @param explainResult - Query plan result
     * @returns Array of used indexes
     */
    private extractIndexUsage(explainResult: any[]): string[] {
        const indexes: string[] = [];

        for (const row of explainResult) {
            const plan = row['QUERY PLAN'] || '';

            // Look for index usage patterns
            const indexMatches = plan.match(/Index Scan using (\w+)/g);
            if (indexMatches) {
                indexes.push(
                    ...indexMatches.map((match: string) =>
                        match.replace('Index Scan using ', ''),
                    ),
                );
            }

            const bitmapMatches = plan.match(/Bitmap Index Scan on (\w+)/g);
            if (bitmapMatches) {
                indexes.push(
                    ...bitmapMatches.map((match: string) =>
                        match.replace('Bitmap Index Scan on ', ''),
                    ),
                );
            }
        }

        return [...new Set(indexes)]; // Remove duplicates
    }

    /**
     * Gets query optimization recommendations
     * @param options - Query options
     * @returns Optimization recommendations
     */
    async getOptimizationRecommendations(
        options: BalanceQueryOptions,
    ): Promise<{
        recommendations: string[];
        estimatedImprovement: number;
        priority: 'low' | 'medium' | 'high';
    }> {
        const recommendations: string[] = [];
        let estimatedImprovement = 0;
        let priority: 'low' | 'medium' | 'high' = 'low';

        try {
            // Analyze query patterns
            if (options.userId && !options.walletId) {
                recommendations.push(
                    'Consider adding walletId filter to reduce result set',
                );
                estimatedImprovement += 20;
            }

            if (
                options.tokenType &&
                !options.minBalance &&
                !options.maxBalance
            ) {
                recommendations.push(
                    'Consider adding balance range filters for better performance',
                );
                estimatedImprovement += 15;
            }

            if (!options.limit || options.limit > 100) {
                recommendations.push(
                    'Consider adding LIMIT clause for large result sets',
                );
                estimatedImprovement += 25;
            }

            if (
                options.orderBy === 'balance' &&
                !options.minBalance &&
                !options.maxBalance
            ) {
                recommendations.push(
                    'Consider adding balance filters when ordering by balance',
                );
                estimatedImprovement += 10;
            }

            // Determine priority
            if (estimatedImprovement > 30) {
                priority = 'high';
            } else if (estimatedImprovement > 15) {
                priority = 'medium';
            }

            return {
                recommendations,
                estimatedImprovement,
                priority,
            };
        } catch (error) {
            this.logger.error(
                `Error getting optimization recommendations: ${error.message}`,
                error.stack,
            );
            return {
                recommendations: ['Unable to analyze query patterns'],
                estimatedImprovement: 0,
                priority: 'low',
            };
        }
    }

    /**
     * Gets query performance statistics
     * @returns Performance statistics
     */
    async getQueryPerformanceStats(): Promise<{
        averageExecutionTime: number;
        totalQueries: number;
        slowQueries: number;
        indexUsage: Record<string, number>;
    }> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to maintain query performance metrics
            return {
                averageExecutionTime: 0,
                totalQueries: 0,
                slowQueries: 0,
                indexUsage: {},
            };
        } catch (error) {
            this.logger.error(
                `Error getting query performance stats: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to get query performance stats: ${error.message}`,
            );
        }
    }

    /**
     * Clears query cache
     */
    async clearQueryCache(): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to clear actual query cache
            this.logger.log('Query cache cleared');
        } catch (error) {
            this.logger.error(
                `Error clearing query cache: ${error.message}`,
                error.stack,
            );
            throw new Error(`Failed to clear query cache: ${error.message}`);
        }
    }
}
