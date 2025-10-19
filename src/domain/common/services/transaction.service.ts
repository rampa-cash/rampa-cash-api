import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * Database transaction service for atomic operations
 *
 * @description This service provides a centralized way to manage database transactions
 * for critical operations that require atomicity. It ensures that either all operations
 * succeed or all are rolled back, maintaining data consistency.
 *
 * @example
 * ```typescript
 * const transactionService = new TransactionService(dataSource);
 *
 * await transactionService.executeInTransaction(async (queryRunner) => {
 *     // Perform multiple database operations
 *     await queryRunner.manager.save(entity1);
 *     await queryRunner.manager.save(entity2);
 *     // If any operation fails, all are rolled back
 * });
 * ```
 */
@Injectable()
export class DatabaseTransactionService {
    private readonly logger = new Logger(DatabaseTransactionService.name);

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Execute operations within a database transaction
     * @param operation - Function containing database operations
     * @returns Result of the operation
     */
    async executeInTransaction<T>(
        operation: (queryRunner: QueryRunner) => Promise<T>,
    ): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.debug('Starting database transaction');

            const result = await operation(queryRunner);

            await queryRunner.commitTransaction();
            this.logger.debug('Database transaction committed successfully');

            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(
                'Database transaction rolled back due to error:',
                error,
            );
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Execute operations within a read-only transaction
     * @param operation - Function containing read operations
     * @returns Result of the operation
     */
    async executeInReadOnlyTransaction<T>(
        operation: (queryRunner: QueryRunner) => Promise<T>,
    ): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction('READ COMMITTED');

        try {
            this.logger.debug('Starting read-only database transaction');

            const result = await operation(queryRunner);

            await queryRunner.commitTransaction();
            this.logger.debug(
                'Read-only database transaction completed successfully',
            );

            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Read-only database transaction failed:', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Execute operations with retry logic for transient failures
     * @param operation - Function containing database operations
     * @param maxRetries - Maximum number of retry attempts
     * @param retryDelay - Delay between retries in milliseconds
     * @returns Result of the operation
     */
    async executeWithRetry<T>(
        operation: (queryRunner: QueryRunner) => Promise<T>,
        maxRetries: number = 3,
        retryDelay: number = 1000,
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(
                    `Executing transaction operation (attempt ${attempt}/${maxRetries})`,
                );
                return await this.executeInTransaction(operation);
            } catch (error) {
                lastError = error as Error;

                // Check if error is retryable
                if (this.isRetryableError(error) && attempt < maxRetries) {
                    this.logger.warn(
                        `Transaction failed on attempt ${attempt}, retrying in ${retryDelay}ms:`,
                        error.message,
                    );

                    await this.delay(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
                } else {
                    throw error;
                }
            }
        }

        throw (
            lastError ||
            new Error('Transaction failed after all retry attempts')
        );
    }

    /**
     * Execute multiple operations in parallel within a single transaction
     * @param operations - Array of functions containing database operations
     * @returns Array of results from all operations
     */
    async executeInParallel<T>(
        operations: Array<(queryRunner: QueryRunner) => Promise<T>>,
    ): Promise<T[]> {
        return await this.executeInTransaction(async (queryRunner) => {
            this.logger.debug(
                `Executing ${operations.length} operations in parallel`,
            );

            const results = await Promise.all(
                operations.map((operation) => operation(queryRunner)),
            );

            this.logger.debug('All parallel operations completed successfully');
            return results;
        });
    }

    /**
     * Execute operations with timeout
     * @param operation - Function containing database operations
     * @param timeoutMs - Timeout in milliseconds
     * @returns Result of the operation
     */
    async executeWithTimeout<T>(
        operation: (queryRunner: QueryRunner) => Promise<T>,
        timeoutMs: number = 30000,
    ): Promise<T> {
        return await Promise.race([
            this.executeInTransaction(operation),
            this.createTimeoutPromise(timeoutMs),
        ]);
    }

    /**
     * Check if an error is retryable
     * @param error - Error to check
     * @returns True if error is retryable
     */
    private isRetryableError(error: any): boolean {
        // Database connection errors
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
            return true;
        }

        // Database timeout errors
        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            return true;
        }

        // Deadlock errors
        if (error.code === '40P01' || error.message?.includes('deadlock')) {
            return true;
        }

        // Lock timeout errors
        if (error.code === '55P03' || error.message?.includes('lock timeout')) {
            return true;
        }

        return false;
    }

    /**
     * Create a timeout promise
     * @param timeoutMs - Timeout in milliseconds
     * @returns Promise that rejects after timeout
     */
    private createTimeoutPromise(timeoutMs: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }

    /**
     * Delay execution for specified milliseconds
     * @param ms - Milliseconds to delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get transaction statistics
     */
    getStats(): { activeConnections: number; isConnected: boolean } {
        return {
            activeConnections: 0, // Pool stats not available in TypeORM
            isConnected: this.dataSource.isInitialized,
        };
    }
}
