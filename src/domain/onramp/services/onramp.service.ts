import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    OnRampTransaction,
    OnRampStatus,
    OnRampProvider,
} from '../entities/onramp-transaction.entity';
import { IOnRampProvider } from '../interfaces/onramp-provider.interface';
import { OnRampProviderFactoryService } from './onramp-provider-factory.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletBalanceService } from '../../wallet/services/wallet-balance.service';
import { EventBusService } from '../../common/services/event-bus.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface CreateOnRampRequest {
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    tokenType: TokenType;
    provider: OnRampProvider;
    returnUrl?: string;
    metadata?: Record<string, any>;
}

export interface OnRampResult {
    transactionId: string;
    providerTransactionId?: string; // Optional - set from webhook
    paymentUrl?: string; // Optional - not needed with Transak widget
    status: OnRampStatus;
    expiresAt?: Date;
    metadata?: Record<string, any>;
}

@Injectable()
export class OnRampService {
    private readonly logger = new Logger(OnRampService.name);

    constructor(
        @InjectRepository(OnRampTransaction)
        private readonly onRampRepository: Repository<OnRampTransaction>,
        private readonly providerFactory: OnRampProviderFactoryService,
        private readonly walletService: WalletService,
        private readonly walletBalanceService: WalletBalanceService,
        private readonly eventBusService: EventBusService,
    ) {}

    /**
     * Create a new on-ramp transaction
     *
     * SIMPLIFIED for Transak: Just creates a pending record with user intent.
     * Actual transaction happens in Transak widget. All amounts come from webhook.
     */
    async createTransaction(
        request: CreateOnRampRequest,
    ): Promise<OnRampResult> {
        try {
            this.logger.debug(
                `Creating on-ramp transaction for user ${request.userId}`,
            );

            // Validate user and wallet
            await this.validateUserAndWallet(request.userId, request.walletId);

            // Get wallet address for webhook matching
            const wallets = await this.walletService.getUserWallets(
                request.userId,
            );
            const wallet = wallets.find((w) => w.walletId === request.walletId);
            if (!wallet) {
                throw new NotFoundException('Wallet not found');
            }

            // Just create pending record - NO provider API calls
            // Actual amounts (tokenAmount, exchangeRate, fee) come from Transak webhook
            const transaction = this.onRampRepository.create({
                userId: request.userId,
                walletId: request.walletId,
                walletAddress: wallet.address, // Store for webhook matching
                amount: request.amount, // Intent only - actual amount from webhook
                currency: request.currency,
                tokenType: request.tokenType,
                tokenAmount: undefined, // Will be set from webhook
                status: OnRampStatus.PENDING,
                provider: request.provider,
                exchangeRate: undefined, // Will be set from webhook
                fee: undefined, // Will be set from webhook
                metadata: {
                    ...request.metadata,
                    intendedAmount: request.amount, // Store intent
                    partnerCustomerId: request.userId, // For webhook matching
                },
            });

            const savedTransaction =
                await this.onRampRepository.save(transaction);

            this.logger.log(
                `Created on-ramp transaction ${savedTransaction.id} with provider ${request.provider} (pending - will be updated from webhook)`,
            );

            return {
                transactionId: savedTransaction.id,
                providerTransactionId: undefined, // Will be set from webhook
                paymentUrl: undefined, // Not needed - widget is used
                status: savedTransaction.status,
                expiresAt: undefined,
                metadata: savedTransaction.metadata,
            };
        } catch (error) {
            this.logger.error(
                `Failed to create on-ramp transaction: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to create on-ramp transaction: ${error.message}`,
            );
        }
    }

    /**
     * Get the status of an on-ramp transaction
     */
    async getTransactionStatus(
        transactionId: string,
    ): Promise<OnRampTransaction> {
        try {
            const transaction = await this.onRampRepository.findOne({
                where: { id: transactionId },
                relations: ['user', 'wallet'],
            });

            if (!transaction) {
                throw new NotFoundException(
                    `On-ramp transaction ${transactionId} not found`,
                );
            }

            return transaction;
        } catch (error) {
            this.logger.error(
                `Failed to get on-ramp transaction status: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Update transaction status from provider webhook
     */
    async updateTransactionStatus(
        providerTransactionId: string,
        status: OnRampStatus,
        metadata?: Record<string, any>,
    ): Promise<void> {
        try {
            this.logger.debug(
                `Updating on-ramp transaction status: ${providerTransactionId} -> ${status}`,
            );

            const transaction = await this.onRampRepository.findOne({
                where: { providerTransactionId },
            });

            if (!transaction) {
                this.logger.warn(
                    `On-ramp transaction not found for provider ID: ${providerTransactionId}`,
                );
                return;
            }

            const previousStatus = transaction.status;
            transaction.status = status;

            if (metadata) {
                transaction.metadata = { ...transaction.metadata, ...metadata };
            }

            if (status === OnRampStatus.COMPLETED) {
                transaction.completedAt = new Date();
                // Credit the user's wallet
                await this.creditWallet(transaction);
            } else if (status === OnRampStatus.FAILED) {
                transaction.failedAt = new Date();
                transaction.failureReason = metadata?.failureReason;
            }

            await this.onRampRepository.save(transaction);

            this.logger.log(
                `Updated on-ramp transaction ${transaction.id} status: ${previousStatus} -> ${status}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to update on-ramp transaction status: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Get user's on-ramp transaction history
     */
    async getUserTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<OnRampTransaction[]> {
        try {
            return await this.onRampRepository.find({
                where: { userId },
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
                relations: ['wallet'],
            });
        } catch (error) {
            this.logger.error(
                `Failed to get user on-ramp transactions: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Validate user and wallet
     */
    private async validateUserAndWallet(
        userId: string,
        walletId: string,
    ): Promise<void> {
        const wallets = await this.walletService.getUserWallets(userId);
        const wallet = wallets.find((w) => w.walletId === walletId);
        if (!wallet) {
            throw new NotFoundException(
                `Wallet ${walletId} not found for user ${userId}`,
            );
        }
    }

    /**
     * Credit user's wallet with tokens
     */
    private async creditWallet(transaction: OnRampTransaction): Promise<void> {
        try {
            // Ensure tokenAmount is set (should be set from webhook)
            if (!transaction.tokenAmount || transaction.tokenAmount <= 0) {
                this.logger.warn(
                    `Cannot credit wallet: tokenAmount is missing or invalid for transaction ${transaction.id}`,
                );
                return;
            }

            this.logger.debug(
                `Crediting wallet ${transaction.walletId} with ${transaction.tokenAmount} ${transaction.tokenType}`,
            );

            await this.walletBalanceService.addBalance(
                transaction.walletId,
                transaction.tokenType,
                transaction.tokenAmount,
                'onramp' as any,
                {
                    transactionId: transaction.id,
                    description: `On-ramp transaction via ${transaction.provider}`,
                },
            );

            this.logger.log(
                `Credited wallet ${transaction.walletId} with ${transaction.tokenAmount} ${transaction.tokenType}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to credit wallet: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
