import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnRampTransaction, OnRampStatus, OnRampProvider } from '../entities/onramp-transaction.entity';
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
    providerTransactionId: string;
    paymentUrl?: string;
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
     */
    async createTransaction(request: CreateOnRampRequest): Promise<OnRampResult> {
        try {
            this.logger.debug(`Creating on-ramp transaction for user ${request.userId}`);

            // Validate user and wallet
            await this.validateUserAndWallet(request.userId, request.walletId);

            // Get provider
            const provider = await this.providerFactory.getProvider(request.provider);

            // Get exchange rate
            const exchangeRate = await provider.getExchangeRate(request.currency, request.tokenType);
            const tokenAmount = request.amount * exchangeRate;

            // Create transaction record
            const transaction = this.onRampRepository.create({
                userId: request.userId,
                walletId: request.walletId,
                amount: request.amount,
                currency: request.currency,
                tokenType: request.tokenType,
                tokenAmount,
                status: OnRampStatus.PENDING,
                provider: request.provider,
            exchangeRate,
                metadata: request.metadata,
            });

            const savedTransaction = await this.onRampRepository.save(transaction);

            // Create transaction with provider
            const providerResponse = await provider.createTransaction({
                userId: request.userId,
                walletId: request.walletId,
                amount: request.amount,
                currency: request.currency,
                tokenType: request.tokenType,
                returnUrl: request.returnUrl,
                metadata: request.metadata,
            });

            // Update transaction with provider details
            savedTransaction.providerTransactionId = providerResponse.providerTransactionId;
            savedTransaction.providerPaymentUrl = providerResponse.paymentUrl;
            savedTransaction.status = providerResponse.status as OnRampStatus;
            savedTransaction.metadata = {
                ...savedTransaction.metadata,
                ...providerResponse.metadata,
            };

            await this.onRampRepository.save(savedTransaction);

            this.logger.log(`Created on-ramp transaction ${savedTransaction.id} with provider ${request.provider}`);

            return {
                transactionId: savedTransaction.id,
                providerTransactionId: savedTransaction.providerTransactionId!,
                paymentUrl: savedTransaction.providerPaymentUrl,
                status: savedTransaction.status,
                expiresAt: savedTransaction.metadata?.expiresAt,
                metadata: savedTransaction.metadata,
            };
        } catch (error) {
            this.logger.error(`Failed to create on-ramp transaction: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to create on-ramp transaction: ${error.message}`);
        }
    }

    /**
     * Get the status of an on-ramp transaction
     */
    async getTransactionStatus(transactionId: string): Promise<OnRampTransaction> {
        try {
            const transaction = await this.onRampRepository.findOne({
                where: { id: transactionId },
            relations: ['user', 'wallet'],
        });

            if (!transaction) {
                throw new NotFoundException(`On-ramp transaction ${transactionId} not found`);
            }

            return transaction;
        } catch (error) {
            this.logger.error(`Failed to get on-ramp transaction status: ${error.message}`, error.stack);
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
            this.logger.debug(`Updating on-ramp transaction status: ${providerTransactionId} -> ${status}`);

            const transaction = await this.onRampRepository.findOne({
                where: { providerTransactionId },
            });

            if (!transaction) {
                this.logger.warn(`On-ramp transaction not found for provider ID: ${providerTransactionId}`);
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

            this.logger.log(`Updated on-ramp transaction ${transaction.id} status: ${previousStatus} -> ${status}`);

            // Emit event
            await this.eventBusService.emit('onramp.status.updated', {
                transactionId: transaction.id,
                providerTransactionId,
                status,
                previousStatus,
                metadata,
            });
        } catch (error) {
            this.logger.error(`Failed to update on-ramp transaction status: ${error.message}`, error.stack);
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
            this.logger.error(`Failed to get user on-ramp transactions: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Cancel an on-ramp transaction
     */
    async cancelTransaction(transactionId: string): Promise<boolean> {
        try {
            this.logger.debug(`Cancelling on-ramp transaction: ${transactionId}`);

            const transaction = await this.onRampRepository.findOne({
                where: { id: transactionId },
            });

            if (!transaction) {
                throw new NotFoundException(`On-ramp transaction ${transactionId} not found`);
            }

            if (transaction.status !== OnRampStatus.PENDING) {
                throw new BadRequestException(`Cannot cancel transaction with status: ${transaction.status}`);
            }

            // Cancel with provider
            const provider = await this.providerFactory.getProvider(transaction.provider);
            const cancelled = await provider.cancelTransaction(transaction.providerTransactionId!);

            if (cancelled) {
                transaction.status = OnRampStatus.CANCELLED;
                await this.onRampRepository.save(transaction);
                this.logger.log(`Cancelled on-ramp transaction ${transactionId}`);
            }

            return cancelled;
        } catch (error) {
            this.logger.error(`Failed to cancel on-ramp transaction: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get supported currencies for a provider
     */
    async getSupportedCurrencies(provider: OnRampProvider): Promise<string[]> {
        try {
            const providerService = await this.providerFactory.getProvider(provider);
            return await providerService.getSupportedCurrencies();
        } catch (error) {
            this.logger.error(`Failed to get supported currencies: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Get exchange rate for a currency pair
     */
    async getExchangeRate(currency: string, tokenType: TokenType, provider: OnRampProvider): Promise<number> {
        try {
            const providerService = await this.providerFactory.getProvider(provider);
            return await providerService.getExchangeRate(currency, tokenType);
        } catch (error) {
            this.logger.error(`Failed to get exchange rate: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Validate user and wallet
     */
    private async validateUserAndWallet(userId: string, walletId: string): Promise<void> {
        const wallet = await this.walletService.getUserWallet(userId, walletId);
        if (!wallet) {
            throw new NotFoundException(`Wallet ${walletId} not found for user ${userId}`);
        }
    }

    /**
     * Credit user's wallet with tokens
     */
    private async creditWallet(transaction: OnRampTransaction): Promise<void> {
        try {
            this.logger.debug(`Crediting wallet ${transaction.walletId} with ${transaction.tokenAmount} ${transaction.tokenType}`);

            await this.walletBalanceService.addBalance(
                transaction.walletId,
                transaction.tokenType,
                transaction.tokenAmount,
                'onramp',
                transaction.id,
            );

            this.logger.log(`Credited wallet ${transaction.walletId} with ${transaction.tokenAmount} ${transaction.tokenType}`);
        } catch (error) {
            this.logger.error(`Failed to credit wallet: ${error.message}`, error.stack);
            throw error;
        }
    }
}