import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { PublicKey, Connection } from '@solana/web3.js';
import { SolanaConnectionService } from './solana-connection.service';
import { EventBusService } from '../../common/services/event-bus.service';

export interface TransactionMonitorConfig {
    signature: string;
    timeout?: number; // milliseconds
    confirmations?: number;
}

export interface TransactionStatus {
    signature: string;
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations: number;
    blockTime?: number;
    error?: string;
}

export interface MonitorResult {
    signature: string;
    status: TransactionStatus;
    completed: boolean;
    error?: string;
}

@Injectable()
export class SolanaMonitorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SolanaMonitorService.name);
    private readonly activeMonitors = new Map<string, NodeJS.Timeout>();
    private readonly defaultTimeout = 300000; // 5 minutes
    private readonly defaultConfirmations = 1;

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly eventBusService: EventBusService,
    ) {}

    async onModuleInit() {
        this.logger.log('SolanaMonitorService initialized');
    }

    async onModuleDestroy() {
        this.logger.log('Cleaning up active monitors');
        this.activeMonitors.forEach((timeout) => clearTimeout(timeout));
        this.activeMonitors.clear();
    }

    /**
     * Start monitoring a transaction signature
     */
    async startMonitoring(
        config: TransactionMonitorConfig,
    ): Promise<MonitorResult> {
        try {
            this.logger.debug(
                `Starting monitoring for signature: ${config.signature}`,
            );

            const timeout = config.timeout || this.defaultTimeout;
            const confirmations =
                config.confirmations || this.defaultConfirmations;

            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    this.activeMonitors.delete(config.signature);
                    resolve({
                        signature: config.signature,
                        status: {
                            signature: config.signature,
                            status: 'failed',
                            confirmations: 0,
                            error: 'Transaction monitoring timeout',
                        },
                        completed: false,
                        error: 'Timeout',
                    });
                }, timeout);

                this.activeMonitors.set(config.signature, timeoutId);

                this.monitorTransaction(config.signature, confirmations)
                    .then((result) => {
                        clearTimeout(timeoutId);
                        this.activeMonitors.delete(config.signature);
                        resolve(result);
                    })
                    .catch((error) => {
                        clearTimeout(timeoutId);
                        this.activeMonitors.delete(config.signature);
                        reject(
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        );
                    });
            });
        } catch (error) {
            this.logger.error(
                `Failed to start monitoring for ${config.signature}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Stop monitoring a transaction signature
     */
    stopMonitoring(signature: string): boolean {
        const timeoutId = this.activeMonitors.get(signature);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.activeMonitors.delete(signature);
            this.logger.debug(`Stopped monitoring for signature: ${signature}`);
            return true;
        }
        return false;
    }

    /**
     * Get the status of a transaction
     */
    async getTransactionStatus(signature: string): Promise<TransactionStatus> {
        try {
            this.logger.debug(`Getting status for signature: ${signature}`);

            const status = await this.connectionService
                .getConnection()
                .getSignatureStatus(signature);
            const transaction = await this.connectionService
                .getConnection()
                .getTransaction(signature);

            if (!status.value) {
                return {
                    signature,
                    status: 'failed',
                    confirmations: 0,
                    error: 'Transaction not found',
                };
            }

            const confirmations = status.value.confirmations || 0;
            let transactionStatus: TransactionStatus['status'] = 'pending';

            if (status.value.err) {
                transactionStatus = 'failed';
            } else if (confirmations >= 1) {
                transactionStatus = 'confirmed';
            }

            if (confirmations >= 32) {
                transactionStatus = 'finalized';
            }

            return {
                signature,
                status: transactionStatus,
                confirmations,
                blockTime: transaction?.blockTime || undefined,
                error: status.value.err
                    ? JSON.stringify(status.value.err)
                    : undefined,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get transaction status for ${signature}: ${error.message}`,
                error.stack,
            );
            return {
                signature,
                status: 'failed',
                confirmations: 0,
                error: error.message,
            };
        }
    }

    /**
     * Monitor a transaction until it reaches the required confirmations
     */
    private async monitorTransaction(
        signature: string,
        requiredConfirmations: number,
    ): Promise<MonitorResult> {
        try {
            this.logger.debug(
                `Monitoring transaction ${signature} for ${requiredConfirmations} confirmations`,
            );

            const checkInterval = 2000; // Check every 2 seconds
            const maxChecks = 150; // Maximum number of checks (5 minutes with 2s intervals)
            let checkCount = 0;

            return new Promise((resolve) => {
                const checkStatus = async () => {
                    try {
                        checkCount++;
                        const status =
                            await this.getTransactionStatus(signature);

                        this.logger.debug(
                            `Transaction ${signature} status: ${status.status}, confirmations: ${status.confirmations}`,
                        );

                        if (status.status === 'failed') {
                            resolve({
                                signature,
                                status,
                                completed: true,
                                error: status.error,
                            });
                            return;
                        }

                        if (status.confirmations >= requiredConfirmations) {
                            resolve({
                                signature,
                                status,
                                completed: true,
                            });
                            return;
                        }

                        if (checkCount >= maxChecks) {
                            resolve({
                                signature,
                                status,
                                completed: false,
                                error: 'Maximum checks reached',
                            });
                            return;
                        }

                        // Continue monitoring
                        setTimeout(checkStatus, checkInterval);
                    } catch (error) {
                        this.logger.error(
                            `Error monitoring transaction ${signature}: ${error.message}`,
                            error.stack,
                        );
                        resolve({
                            signature,
                            status: {
                                signature,
                                status: 'failed',
                                confirmations: 0,
                                error: error.message,
                            },
                            completed: false,
                            error: error.message,
                        });
                    }
                };

                checkStatus();
            });
        } catch (error) {
            this.logger.error(
                `Failed to monitor transaction ${signature}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Get all active monitors
     */
    getActiveMonitors(): string[] {
        return Array.from(this.activeMonitors.keys());
    }

    /**
     * Get the number of active monitors
     */
    getActiveMonitorCount(): number {
        return this.activeMonitors.size;
    }

    /**
     * Clear all active monitors
     */
    clearAllMonitors(): void {
        this.logger.log(`Clearing ${this.activeMonitors.size} active monitors`);
        this.activeMonitors.forEach((timeout) => clearTimeout(timeout));
        this.activeMonitors.clear();
    }

    /**
     * Get transaction details
     */
    async getTransactionDetails(signature: string): Promise<any> {
        try {
            this.logger.debug(
                `Getting transaction details for signature: ${signature}`,
            );

            const transaction = await this.connectionService
                .getConnection()
                .getTransaction(signature);

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            return {
                signature,
                blockTime: transaction.blockTime,
                slot: transaction.slot,
                fee: transaction.meta?.fee,
                preBalances: transaction.meta?.preBalances,
                postBalances: transaction.meta?.postBalances,
                instructions: transaction.transaction.message.instructions,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get transaction details for ${signature}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
