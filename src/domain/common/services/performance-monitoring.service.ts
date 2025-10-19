import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Performance monitoring service for database operations
 *
 * @description This service tracks database query performance, connection usage,
 * and other metrics to help identify bottlenecks and optimize performance.
 *
 * @example
 * ```typescript
 * const monitoringService = new PerformanceMonitoringService(dataSource);
 *
 * // Track query execution time
 * const result = await monitoringService.trackQuery('getUserWallets', () =>
 *     userRepository.find({ where: { id: userId } })
 * );
 *
 * // Get performance metrics
 * const metrics = monitoringService.getMetrics();
 * ```
 */
@Injectable()
export class PerformanceMonitoringService {
    private readonly logger = new Logger(PerformanceMonitoringService.name);
    private metrics = new Map<string, QueryMetrics>();
    private slowQueryThreshold = 1000; // 1 second

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Track query execution time and performance
     * @param queryName - Name of the query for identification
     * @param query - Function containing the database query
     * @returns Result of the query
     */
    async trackQuery<T>(
        queryName: string,
        query: () => Promise<T>,
    ): Promise<T> {
        const startTime = Date.now();
        let error: Error | null = null;
        let result: T;

        try {
            result = await query();
            return result;
        } catch (err) {
            error = err as Error;
            throw err;
        } finally {
            const executionTime = Date.now() - startTime;
            this.recordQueryMetrics(queryName, executionTime, error);
        }
    }

    /**
     * Track database transaction performance
     * @param transactionName - Name of the transaction for identification
     * @param transaction - Function containing the transaction
     * @returns Result of the transaction
     */
    async trackTransaction<T>(
        transactionName: string,
        transaction: () => Promise<T>,
    ): Promise<T> {
        const startTime = Date.now();
        let error: Error | null = null;
        let result: T;

        try {
            result = await transaction();
            return result;
        } catch (err) {
            error = err as Error;
            throw err;
        } finally {
            const executionTime = Date.now() - startTime;
            this.recordQueryMetrics(transactionName, executionTime, error);
        }
    }

    /**
     * Record query metrics
     */
    private recordQueryMetrics(
        queryName: string,
        executionTime: number,
        error: Error | null,
    ): void {
        const existing = this.metrics.get(queryName) || {
            queryName,
            totalExecutions: 0,
            totalTime: 0,
            averageTime: 0,
            minTime: Infinity,
            maxTime: 0,
            errorCount: 0,
            slowQueryCount: 0,
            lastExecuted: new Date(),
        };

        existing.totalExecutions++;
        existing.totalTime += executionTime;
        existing.averageTime = existing.totalTime / existing.totalExecutions;
        existing.minTime = Math.min(existing.minTime, executionTime);
        existing.maxTime = Math.max(existing.maxTime, executionTime);
        existing.lastExecuted = new Date();

        if (error) {
            existing.errorCount++;
        }

        if (executionTime > this.slowQueryThreshold) {
            existing.slowQueryCount++;
            this.logger.warn(
                `Slow query detected: ${queryName} took ${executionTime}ms`,
            );
        }

        this.metrics.set(queryName, existing);

        // Log performance warnings
        if (executionTime > this.slowQueryThreshold) {
            this.logger.warn(
                `Slow query: ${queryName} executed in ${executionTime}ms (threshold: ${this.slowQueryThreshold}ms)`,
            );
        }
    }

    /**
     * Get performance metrics for a specific query
     * @param queryName - Name of the query
     * @returns Query metrics or null if not found
     */
    getQueryMetrics(queryName: string): QueryMetrics | null {
        return this.metrics.get(queryName) || null;
    }

    /**
     * Get all performance metrics
     * @returns Map of all query metrics
     */
    getAllMetrics(): Map<string, QueryMetrics> {
        return new Map(this.metrics);
    }

    /**
     * Get performance summary
     * @returns Summary of all metrics
     */
    getPerformanceSummary(): PerformanceSummary {
        const queries = Array.from(this.metrics.values());
        const totalQueries = queries.reduce(
            (sum, q) => sum + q.totalExecutions,
            0,
        );
        const totalTime = queries.reduce((sum, q) => sum + q.totalTime, 0);
        const totalErrors = queries.reduce((sum, q) => sum + q.errorCount, 0);
        const totalSlowQueries = queries.reduce(
            (sum, q) => sum + q.slowQueryCount,
            0,
        );

        const slowestQueries = queries
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, 10);

        const mostFrequentQueries = queries
            .sort((a, b) => b.totalExecutions - a.totalExecutions)
            .slice(0, 10);

        return {
            totalQueries,
            totalTime,
            averageQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
            totalErrors,
            totalSlowQueries,
            errorRate:
                totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0,
            slowQueryRate:
                totalQueries > 0 ? (totalSlowQueries / totalQueries) * 100 : 0,
            slowestQueries,
            mostFrequentQueries,
            databaseStats: this.getDatabaseStats(),
        };
    }

    /**
     * Get database connection and performance stats
     * @returns Database statistics
     */
    getDatabaseStats(): DatabaseStats {
        return {
            isConnected: this.dataSource.isInitialized,
            activeConnections: 0, // Not available in TypeORM
            totalQueries: Array.from(this.metrics.values()).reduce(
                (sum, q) => sum + q.totalExecutions,
                0,
            ),
            uptime: process.uptime(),
        };
    }

    /**
     * Get slow queries (queries that exceed the threshold)
     * @returns Array of slow query metrics
     */
    getSlowQueries(): QueryMetrics[] {
        return Array.from(this.metrics.values()).filter(
            (q) => q.averageTime > this.slowQueryThreshold,
        );
    }

    /**
     * Get queries with errors
     * @returns Array of query metrics with errors
     */
    getQueriesWithErrors(): QueryMetrics[] {
        return Array.from(this.metrics.values()).filter(
            (q) => q.errorCount > 0,
        );
    }

    /**
     * Set slow query threshold
     * @param threshold - Threshold in milliseconds
     */
    setSlowQueryThreshold(threshold: number): void {
        this.slowQueryThreshold = threshold;
        this.logger.log(`Slow query threshold set to ${threshold}ms`);
    }

    /**
     * Reset all metrics
     */
    resetMetrics(): void {
        this.metrics.clear();
        this.logger.log('Performance metrics reset');
    }

    /**
     * Export metrics as JSON
     * @returns JSON string of all metrics
     */
    exportMetrics(): string {
        const summary = this.getPerformanceSummary();
        return JSON.stringify(summary, null, 2);
    }

    /**
     * Get health check data
     * @returns Health check information
     */
    getHealthCheck(): HealthCheck {
        const summary = this.getPerformanceSummary();
        const isHealthy = summary.errorRate < 10 && summary.slowQueryRate < 20;

        return {
            isHealthy,
            status: isHealthy ? 'healthy' : 'degraded',
            errorRate: summary.errorRate,
            slowQueryRate: summary.slowQueryRate,
            averageQueryTime: summary.averageQueryTime,
            totalQueries: summary.totalQueries,
            lastChecked: new Date(),
        };
    }
}

/**
 * Query performance metrics
 */
export interface QueryMetrics {
    queryName: string;
    totalExecutions: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    errorCount: number;
    slowQueryCount: number;
    lastExecuted: Date;
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
    totalQueries: number;
    totalTime: number;
    averageQueryTime: number;
    totalErrors: number;
    totalSlowQueries: number;
    errorRate: number;
    slowQueryRate: number;
    slowestQueries: QueryMetrics[];
    mostFrequentQueries: QueryMetrics[];
    databaseStats: DatabaseStats;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
    isConnected: boolean;
    activeConnections: number;
    totalQueries: number;
    uptime: number;
}

/**
 * Health check information
 */
export interface HealthCheck {
    isHealthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy';
    errorRate: number;
    slowQueryRate: number;
    averageQueryTime: number;
    totalQueries: number;
    lastChecked: Date;
}
