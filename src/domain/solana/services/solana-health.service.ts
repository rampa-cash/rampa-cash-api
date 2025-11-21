import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaConfig } from '../../../config/solana.config';
import { SolanaRetryService } from './solana-retry.service';

export interface HealthStatus {
    isHealthy: boolean;
    network: string;
    rpcUrl: string;
    lastChecked: Date;
    responseTime: number;
    blockHeight: number | null;
    slot: number | null;
    error?: string;
}

export interface NetworkMetrics {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    failedRequests: number;
    lastError?: string;
    lastErrorTime?: Date;
}

@Injectable()
export class SolanaHealthService implements OnModuleInit {
    private readonly logger = new Logger(SolanaHealthService.name);
    private readonly config: SolanaConfig;
    private connection: Connection;
    private metrics: NetworkMetrics = {
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        failedRequests: 0,
    };
    private healthCheckInterval: NodeJS.Timeout | null = null;

    constructor(
        private configService: ConfigService,
        private retryService: SolanaRetryService,
    ) {
        this.config = this.configService.get<SolanaConfig>('solana')!;
    }

    async onModuleInit() {
        this.connection = new Connection(this.config.rpcUrl, {
            commitment: this.config.commitment,
            confirmTransactionInitialTimeout: this.config.timeout,
        });

        // Start periodic health checks
        this.startHealthMonitoring();
    }

    /**
     * Get current health status
     * @returns Promise with health status
     */
    async getHealthStatus(): Promise<HealthStatus> {
        const startTime = Date.now();

        try {
            const result = await this.retryService.executeWithRetry(
                async () => {
                    // Test basic connectivity
                    const version = await this.connection.getVersion();

                    // Get current slot and block height
                    const slot = await this.connection.getSlot();
                    const blockHeight = await this.connection.getBlockHeight();

                    return { version, slot, blockHeight };
                },
                {
                    maxRetries: 2,
                    baseDelay: 1000,
                    operationName: 'SolanaHealthService.getHealthStatus',
                },
            );

            const responseTime = Date.now() - startTime;

            // Update metrics
            this.updateMetrics(true, responseTime);

            return {
                isHealthy: true,
                network: this.config.network,
                rpcUrl: this.config.rpcUrl,
                lastChecked: new Date(),
                responseTime,
                blockHeight: result.result?.blockHeight || null,
                slot: result.result?.slot || null,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            // Update metrics
            this.updateMetrics(false, responseTime, errorMessage);

            this.logger.error(`Health check failed: ${errorMessage}`);

            return {
                isHealthy: false,
                network: this.config.network,
                rpcUrl: this.config.rpcUrl,
                lastChecked: new Date(),
                responseTime,
                blockHeight: null,
                slot: null,
                error: errorMessage,
            };
        }
    }

    /**
     * Get network metrics
     * @returns Current network metrics
     */
    getNetworkMetrics(): NetworkMetrics {
        return { ...this.metrics };
    }

    /**
     * Check if the network is healthy
     * @returns Promise with boolean indicating health
     */
    async isHealthy(): Promise<boolean> {
        const status = await this.getHealthStatus();
        return status.isHealthy;
    }

    /**
     * Test specific RPC method
     * @param method - RPC method to test
     * @param params - Parameters for the method
     * @returns Promise with test result
     */
    async testRpcMethod(
        method: string,
        params: any[] = [],
    ): Promise<{
        success: boolean;
        responseTime: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            await this.retryService.executeWithRetry(
                async () => {
                    // Use connection's internal RPC call method
                    const response = await (this.connection as any).rpcRequest(
                        method,
                        params,
                    );
                    return response;
                },
                {
                    maxRetries: 1,
                    baseDelay: 500,
                    operationName: `SolanaHealthService.testRpcMethod(${method})`,
                },
            );

            const responseTime = Date.now() - startTime;
            this.updateMetrics(true, responseTime);

            return {
                success: true,
                responseTime,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            this.updateMetrics(false, responseTime, errorMessage);

            return {
                success: false,
                responseTime,
                error: errorMessage,
            };
        }
    }

    /**
     * Test wallet connectivity
     * @param walletAddress - Wallet address to test
     * @returns Promise with test result
     */
    async testWalletConnectivity(walletAddress: string): Promise<{
        success: boolean;
        responseTime: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            await this.retryService.executeWithRetry(
                async () => {
                    const publicKey = new PublicKey(walletAddress);
                    const accountInfo =
                        await this.connection.getAccountInfo(publicKey);
                    return accountInfo;
                },
                {
                    maxRetries: 2,
                    baseDelay: 1000,
                    operationName: `SolanaHealthService.testWalletConnectivity(${walletAddress})`,
                },
            );

            const responseTime = Date.now() - startTime;
            this.updateMetrics(true, responseTime);

            return {
                success: true,
                responseTime,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';

            this.updateMetrics(false, responseTime, errorMessage);

            return {
                success: false,
                responseTime,
                error: errorMessage,
            };
        }
    }

    /**
     * Start periodic health monitoring
     */
    private startHealthMonitoring(): void {
        // Check health every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.getHealthStatus();
            } catch (error) {
                this.logger.error('Health monitoring error:', error);
            }
        }, 30000);

        this.logger.log('Solana health monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.logger.log('Solana health monitoring stopped');
        }
    }

    /**
     * Update network metrics
     * @param success - Whether the request was successful
     * @param responseTime - Response time in milliseconds
     * @param error - Error message if any
     */
    private updateMetrics(
        success: boolean,
        responseTime: number,
        error?: string,
    ): void {
        this.metrics.totalRequests++;

        if (!success) {
            this.metrics.failedRequests++;
            this.metrics.lastError = error;
            this.metrics.lastErrorTime = new Date();
        }

        // Update success rate
        this.metrics.successRate =
            ((this.metrics.totalRequests - this.metrics.failedRequests) /
                this.metrics.totalRequests) *
            100;

        // Update average response time (exponential moving average)
        const alpha = 0.1; // Smoothing factor
        this.metrics.averageResponseTime =
            this.metrics.averageResponseTime === 0
                ? responseTime
                : alpha * responseTime +
                  (1 - alpha) * this.metrics.averageResponseTime;
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            averageResponseTime: 0,
            successRate: 100,
            totalRequests: 0,
            failedRequests: 0,
        };
        this.logger.log('Network metrics reset');
    }

    /**
     * Get health check summary
     * @returns Formatted health summary
     */
    getHealthSummary(): string {
        const {
            isHealthy,
            network,
            rpcUrl,
            lastChecked,
            responseTime,
            blockHeight,
            slot,
        } = this.getHealthStatus() as any; // This will be resolved in the actual call

        return `Solana Health Summary:
            Status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
            Network: ${network}
            RPC URL: ${rpcUrl}
            Last Checked: ${lastChecked}
            Response Time: ${responseTime}ms
            Block Height: ${blockHeight || 'N/A'}
            Slot: ${slot || 'N/A'}
            Success Rate: ${this.metrics.successRate.toFixed(2)}%
            Avg Response Time: ${Math.round(this.metrics.averageResponseTime)}ms
            Total Requests: ${this.metrics.totalRequests}
            Failed Requests: ${this.metrics.failedRequests}`;
    }
}
