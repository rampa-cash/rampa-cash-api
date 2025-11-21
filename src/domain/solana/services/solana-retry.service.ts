import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolanaConfig } from '../../../config/solana.config';

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    jitter?: boolean;
    operationName?: string; // Optional name for logging context
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDelay: number;
}

@Injectable()
export class SolanaRetryService {
    private readonly logger = new Logger(SolanaRetryService.name);
    private readonly config: SolanaConfig;

    constructor(private configService: ConfigService) {
        this.config = this.configService.get<SolanaConfig>('solana')!;
    }

    /**
     * Execute a function with retry logic
     * @param operation - Function to execute
     * @param options - Retry configuration
     * @returns Promise with retry result
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options: RetryOptions = {},
    ): Promise<RetryResult<T>> {
        const {
            maxRetries = this.config.maxRetries,
            baseDelay = this.config.retryDelay,
            maxDelay = 30000, // 30 seconds
            backoffMultiplier = 2,
            jitter = true,
        } = options;

        let lastError: Error;
        let totalDelay = 0;
        const operationName = options.operationName || 'unknown operation';

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(
                    `Executing operation "${operationName}", attempt ${attempt + 1}/${maxRetries + 1}`,
                );

                const result = await operation();

                if (attempt > 0) {
                    this.logger.log(
                        `Operation "${operationName}" succeeded after ${attempt + 1} attempts`,
                    );
                }

                return {
                    success: true,
                    result,
                    attempts: attempt + 1,
                    totalDelay,
                };
            } catch (error) {
                lastError = error as Error;

                // Check if error is retryable
                if (!this.isRetryableError(error) || attempt === maxRetries) {
                    this.logger.error(
                        `Operation "${operationName}" failed after ${attempt + 1} attempts: ${error.message}`,
                    );

                    return {
                        success: false,
                        error: lastError,
                        attempts: attempt + 1,
                        totalDelay,
                    };
                }

                // Calculate delay for next attempt
                const delay = this.calculateDelay(
                    attempt,
                    baseDelay,
                    maxDelay,
                    backoffMultiplier,
                    jitter,
                );

                totalDelay += delay;

                this.logger.warn(
                    `Operation "${operationName}" failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`,
                );

                // Wait before retry
                await this.sleep(delay);
            }
        }

        return {
            success: false,
            error: lastError!,
            attempts: maxRetries + 1,
            totalDelay,
        };
    }

    /**
     * Execute a transaction with retry logic
     * @param transactionOperation - Transaction function
     * @param options - Retry configuration
     * @returns Promise with transaction result
     */
    async executeTransactionWithRetry<T>(
        transactionOperation: () => Promise<T>,
        options: RetryOptions = {},
    ): Promise<RetryResult<T>> {
        const transactionOptions: RetryOptions = {
            maxRetries: Math.min(
                options.maxRetries || this.config.maxRetries,
                5,
            ), // Limit transaction retries
            baseDelay: options.baseDelay || 1000, // Start with 1 second
            maxDelay: options.maxDelay || 10000, // Max 10 seconds for transactions
            backoffMultiplier: options.backoffMultiplier || 1.5, // Slower backoff for transactions
            jitter: options.jitter !== false,
        };

        return this.executeWithRetry(transactionOperation, transactionOptions);
    }

    /**
     * Check if an error is retryable
     * @param error - Error to check
     * @returns true if error is retryable
     */
    private isRetryableError(error: any): boolean {
        if (!error) return false;

        const message = error.message?.toLowerCase() || '';
        const code = error.code;

        // Network errors
        if (
            message.includes('connection') ||
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnreset') ||
            message.includes('enotfound')
        ) {
            return true;
        }

        // Solana RPC errors that are retryable
        if (typeof code === 'number') {
            const retryableCodes = [
                -32002, // Account not found
                -32003, // Invalid account
                -32004, // Invalid program
                -32005, // Invalid instruction
                -32006, // Invalid transaction
                -32007, // Invalid blockhash
                -32008, // Invalid commitment
                -32009, // Invalid signature
                -32010, // Invalid slot
            ];
            return retryableCodes.includes(code);
        }

        // Transaction-specific retryable errors
        if (
            message.includes('blockhash not found') ||
            message.includes('transaction failed') ||
            message.includes('insufficient priority fee') ||
            message.includes('transaction expired')
        ) {
            return true;
        }

        // Rate limiting
        if (
            message.includes('rate limit') ||
            message.includes('too many requests') ||
            code === 429
        ) {
            return true;
        }

        return false;
    }

    /**
     * Calculate delay for next retry attempt
     * @param attempt - Current attempt number
     * @param baseDelay - Base delay in milliseconds
     * @param maxDelay - Maximum delay in milliseconds
     * @param backoffMultiplier - Multiplier for exponential backoff
     * @param jitter - Whether to add random jitter
     * @returns Delay in milliseconds
     */
    private calculateDelay(
        attempt: number,
        baseDelay: number,
        maxDelay: number,
        backoffMultiplier: number,
        jitter: boolean,
    ): number {
        // Exponential backoff
        let delay = baseDelay * Math.pow(backoffMultiplier, attempt);

        // Cap at max delay
        delay = Math.min(delay, maxDelay);

        // Add jitter to prevent thundering herd
        if (jitter) {
            const jitterAmount = delay * 0.1; // 10% jitter
            delay += (Math.random() - 0.5) * 2 * jitterAmount;
        }

        return Math.max(0, Math.floor(delay));
    }

    /**
     * Sleep for specified milliseconds
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get retry statistics
     * @param result - Retry result
     * @returns Formatted statistics string
     */
    getRetryStats(result: RetryResult<any>): string {
        const { success, attempts, totalDelay } = result;
        const avgDelay = attempts > 1 ? totalDelay / (attempts - 1) : 0;

        return (
            `Retry Stats: ${success ? 'SUCCESS' : 'FAILED'}, ` +
            `Attempts: ${attempts}, ` +
            `Total Delay: ${totalDelay}ms, ` +
            `Avg Delay: ${Math.round(avgDelay)}ms`
        );
    }
}
