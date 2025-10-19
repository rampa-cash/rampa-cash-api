import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { DatabaseTransactionService } from '../../common/services/transaction.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletBalanceService } from '../../wallet/services/wallet-balance.service';
import { TokenType } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { TRANSACTION_SERVICE_TOKEN } from '../../common/tokens/service-tokens';

/**
 * Atomic transfer service for critical financial operations
 * 
 * @description This service ensures that all transfer operations are atomic,
 * meaning either all operations succeed or all are rolled back. This is critical
 * for financial operations to maintain data consistency.
 * 
 * @example
 * ```typescript
 * const atomicTransferService = new AtomicTransferService(
 *     transactionService,
 *     walletService,
 *     walletBalanceService,
 *     transactionService
 * );
 * 
 * await atomicTransferService.transfer(
 *     'sender-wallet-id',
 *     'recipient-wallet-id',
 *     TokenType.USDC,
 *     100.50
 * );
 * ```
 */
@Injectable()
export class AtomicTransferService {
    private readonly logger = new Logger(AtomicTransferService.name);

    constructor(
        private readonly databaseTransactionService: DatabaseTransactionService,
        private readonly walletService: WalletService,
        private readonly walletBalanceService: WalletBalanceService,
        @Inject(TRANSACTION_SERVICE_TOKEN)
        private readonly transactionService: any,
    ) {}

    /**
     * Execute an atomic transfer between wallets
     * @param senderWalletId - Sender wallet ID
     * @param recipientWalletId - Recipient wallet ID
     * @param tokenType - Token type to transfer
     * @param amount - Amount to transfer
     * @param description - Optional transfer description
     * @returns Created transaction
     */
    async transfer(
        senderWalletId: string,
        recipientWalletId: string,
        tokenType: TokenType,
        amount: number,
        description?: string,
    ): Promise<Transaction> {
        this.logger.log(
            `Starting atomic transfer: ${senderWalletId} -> ${recipientWalletId}, ${amount} ${tokenType}`,
        );

        return await this.databaseTransactionService.executeInTransaction(
            async (queryRunner: QueryRunner) => {
                // 1. Validate wallets exist and are active
                const [senderWallet, recipientWallet] = await this.validateWallets(
                    queryRunner,
                    senderWalletId,
                    recipientWalletId,
                );

                // 2. Check sender has sufficient balance
                await this.validateSufficientBalance(
                    queryRunner,
                    senderWalletId,
                    tokenType,
                    amount,
                );

                // 3. Create transaction record
                const transaction = await this.createTransactionRecord(
                    queryRunner,
                    senderWallet,
                    recipientWallet,
                    tokenType,
                    amount,
                    description,
                );

                // 4. Update balances atomically
                await this.updateBalances(
                    queryRunner,
                    senderWalletId,
                    recipientWalletId,
                    tokenType,
                    amount,
                );

                // 5. Update transaction status to completed
                await this.completeTransaction(queryRunner, transaction.id);

                this.logger.log(
                    `Atomic transfer completed successfully: ${transaction.id}`,
                );

                return transaction;
            },
        );
    }

    /**
     * Execute an atomic balance update
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     * @param amount - Amount to add/subtract
     * @param reason - Reason for balance change
     * @returns Updated balance
     */
    async updateBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
        reason: string,
    ): Promise<number> {
        this.logger.log(
            `Starting atomic balance update: ${walletId}, ${amount} ${tokenType} (${reason})`,
        );

        return await this.databaseTransactionService.executeInTransaction(
            async (queryRunner: QueryRunner) => {
                // 1. Validate wallet exists
                const wallet = await this.validateWallet(queryRunner, walletId);

                // 2. Get current balance
                const currentBalance = await this.getCurrentBalance(
                    queryRunner,
                    walletId,
                    tokenType,
                );

                // 3. Calculate new balance
                const newBalance = currentBalance + amount;

                // 4. Validate new balance is not negative
                if (newBalance < 0) {
                    throw new BadRequestException(
                        `Insufficient balance. Current: ${currentBalance}, Requested: ${amount}`,
                    );
                }

                // 5. Update balance
                await this.updateWalletBalance(
                    queryRunner,
                    walletId,
                    tokenType,
                    newBalance,
                );

                this.logger.log(
                    `Atomic balance update completed: ${walletId}, new balance: ${newBalance}`,
                );

                return newBalance;
            },
        );
    }

    /**
     * Execute an atomic multi-wallet operation
     * @param operations - Array of wallet operations
     * @returns Results of all operations
     */
    async executeMultiWalletOperation<T>(
        operations: Array<() => Promise<T>>,
    ): Promise<T[]> {
        this.logger.log(`Starting atomic multi-wallet operation with ${operations.length} operations`);

        return await this.databaseTransactionService.executeInTransaction(
            async (queryRunner: QueryRunner) => {
                const results: T[] = [];

                for (const operation of operations) {
                    const result = await operation();
                    results.push(result);
                }

                this.logger.log('Atomic multi-wallet operation completed successfully');
                return results;
            },
        );
    }

    /**
     * Validate wallets exist and are active
     */
    private async validateWallets(
        queryRunner: QueryRunner,
        senderWalletId: string,
        recipientWalletId: string,
    ): Promise<[Wallet, Wallet]> {
        const [senderWallet, recipientWallet] = await Promise.all([
            this.getWalletById(queryRunner, senderWalletId),
            this.getWalletById(queryRunner, recipientWalletId),
        ]);

        if (!senderWallet) {
            throw new NotFoundException(`Sender wallet ${senderWalletId} not found`);
        }

        if (!recipientWallet) {
            throw new NotFoundException(`Recipient wallet ${recipientWalletId} not found`);
        }

        if (!senderWallet.isActive) {
            throw new BadRequestException(`Sender wallet ${senderWalletId} is not active`);
        }

        if (!recipientWallet.isActive) {
            throw new BadRequestException(`Recipient wallet ${recipientWalletId} is not active`);
        }

        return [senderWallet, recipientWallet];
    }

    /**
     * Validate wallet exists and is active
     */
    private async validateWallet(
        queryRunner: QueryRunner,
        walletId: string,
    ): Promise<Wallet> {
        const wallet = await this.getWalletById(queryRunner, walletId);

        if (!wallet) {
            throw new NotFoundException(`Wallet ${walletId} not found`);
        }

        if (!wallet.isActive) {
            throw new BadRequestException(`Wallet ${walletId} is not active`);
        }

        return wallet;
    }

    /**
     * Get wallet by ID using query runner
     */
    private async getWalletById(queryRunner: QueryRunner, walletId: string): Promise<Wallet | null> {
        return await queryRunner.manager.findOne(Wallet, {
            where: { id: walletId },
        });
    }

    /**
     * Validate sender has sufficient balance
     */
    private async validateSufficientBalance(
        queryRunner: QueryRunner,
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<void> {
        const currentBalance = await this.getCurrentBalance(queryRunner, walletId, tokenType);

        if (currentBalance < amount) {
            throw new BadRequestException(
                `Insufficient balance. Current: ${currentBalance}, Required: ${amount}`,
            );
        }
    }

    /**
     * Get current balance for wallet and token type
     */
    private async getCurrentBalance(
        queryRunner: QueryRunner,
        walletId: string,
        tokenType: TokenType,
    ): Promise<number> {
        const result = await queryRunner.manager
            .createQueryBuilder()
            .select('balance.balance')
            .from('wallet_balance', 'balance')
            .where('balance.walletId = :walletId', { walletId })
            .andWhere('balance.tokenType = :tokenType', { tokenType })
            .getRawOne();

        return result?.balance || 0;
    }

    /**
     * Create transaction record
     */
    private async createTransactionRecord(
        queryRunner: QueryRunner,
        senderWallet: Wallet,
        recipientWallet: Wallet,
        tokenType: TokenType,
        amount: number,
        description?: string,
    ): Promise<Transaction> {
        const transaction = queryRunner.manager.create(Transaction, {
            senderId: senderWallet.userId,
            recipientId: recipientWallet.userId,
            senderWalletId: senderWallet.id,
            recipientWalletId: recipientWallet.id,
            amount,
            tokenType,
            status: TransactionStatus.PENDING,
            description,
        });

        return await queryRunner.manager.save(transaction);
    }

    /**
     * Update balances atomically
     */
    private async updateBalances(
        queryRunner: QueryRunner,
        senderWalletId: string,
        recipientWalletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<void> {
        // Subtract from sender
        await this.updateWalletBalance(
            queryRunner,
            senderWalletId,
            tokenType,
            -amount,
        );

        // Add to recipient
        await this.updateWalletBalance(
            queryRunner,
            recipientWalletId,
            tokenType,
            amount,
        );
    }

    /**
     * Update wallet balance
     */
    private async updateWalletBalance(
        queryRunner: QueryRunner,
        walletId: string,
        tokenType: TokenType,
        amountChange: number,
    ): Promise<void> {
        await queryRunner.manager
            .createQueryBuilder()
            .update('wallet_balance')
            .set({
                balance: () => `balance + ${amountChange}`,
                lastUpdated: () => 'NOW()',
            })
            .where('walletId = :walletId', { walletId })
            .andWhere('tokenType = :tokenType', { tokenType })
            .execute();
    }

    /**
     * Complete transaction
     */
    private async completeTransaction(
        queryRunner: QueryRunner,
        transactionId: string,
    ): Promise<void> {
        await queryRunner.manager
            .createQueryBuilder()
            .update(Transaction)
            .set({
                status: TransactionStatus.CONFIRMED,
                completedAt: () => 'NOW()',
            })
            .where('id = :id', { id: transactionId })
            .execute();
    }
}
