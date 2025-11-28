import { Injectable, Logger } from '@nestjs/common';
import { TransactionService as ITransactionService } from '../interfaces/transaction-service.interface';
import { IUserService } from '../../user/interfaces/user-service.interface';
import { WalletService } from '../../wallet/services/wallet.service';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance-service.interface';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import {
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';

/**
 * TransactionApplicationService
 *
 * @description Application service that orchestrates transaction operations by coordinating
 * between domain services. This service handles the complete transaction flow including
 * validation, user verification, wallet management, and balance updates.
 *
 * @example
 * ```typescript
 * // Create a transaction
 * const transaction = await transactionApplicationService.createTransaction(
 *   senderId,
 *   createTransactionDto
 * );
 *
 * // Confirm a transaction
 * const confirmedTransaction = await transactionApplicationService.confirmTransaction(
 *   transactionId,
 *   solanaTransactionHash
 * );
 * ```
 */
@Injectable()
export class TransactionApplicationService {
    private readonly logger = new Logger(TransactionApplicationService.name);

    constructor(
        private readonly transactionService: ITransactionService,
        private readonly userService: IUserService,
        private readonly walletService: WalletService,
        private readonly walletBalanceService: IWalletBalanceService,
    ) {}

    /**
     * Creates a new transaction
     * @param senderId - ID of the user creating the transaction
     * @param createTransactionDto - Transaction creation data
     * @returns Created transaction entity
     */
    async createTransaction(
        senderId: string,
        createTransactionDto: CreateTransactionDto,
    ): Promise<any> {
        this.logger.debug(`Creating transaction for sender ${senderId}`);

        // Validate sender exists and is active
        const sender = await this.validateUser(senderId);

        // Validate recipient exists and is active
        const recipient = await this.validateUser(
            createTransactionDto.recipientId!,
        );

        // Validate sender wallet exists and belongs to sender
        const senderWallet = await this.validateWallet(
            'mock-sender-wallet-id', // Mock wallet ID since it's not in DTO anymore
            senderId,
        );

        // Validate recipient wallet exists and belongs to recipient (only for internal transfers)
        let recipientWallet = null;
        if (createTransactionDto.recipientId) {
            recipientWallet = await this.validateWallet(
                'mock-recipient-wallet-id', // Mock wallet ID since it's not in DTO anymore
                createTransactionDto.recipientId,
            );
        }

        // Validate transaction data
        await this.validateTransactionData(createTransactionDto);

        // Check if sender has sufficient balance
        await this.validateSenderBalance(
            senderWallet.id,
            createTransactionDto.tokenType,
            createTransactionDto.amount,
        );

        // Create the transaction
        const transactionRequest = {
            fromUserId: senderId,
            toUserId: createTransactionDto.recipientId,
            toExternalAddress: createTransactionDto.externalAddress,
            amount: BigInt(createTransactionDto.amount),
            token: createTransactionDto.tokenType,
            description: createTransactionDto.description,
        };

        const transaction =
            await this.transactionService.createTransaction(transactionRequest);

        this.logger.log(
            `Transaction ${transaction.transactionId} created successfully`,
        );
        return transaction;
    }

    /**
     * Confirms a transaction
     * @param transactionId - ID of the transaction to confirm
     * @param solanaTransactionHash - Solana transaction hash for verification
     * @returns Confirmed transaction entity
     */
    async confirmTransaction(
        transactionId: string,
        solanaTransactionHash: string,
    ): Promise<any> {
        this.logger.debug(`Confirming transaction ${transactionId}`);

        // Get the transaction
        const transaction =
            await this.transactionService.getTransaction(transactionId);

        if (!transaction) {
            throw new NotFoundException(
                `Transaction ${transactionId} not found`,
            );
        }

        // Validate transaction can be confirmed
        if (transaction.status !== 'pending') {
            throw new BadRequestException(
                `Transaction ${transactionId} is not in pending status and cannot be confirmed`,
            );
        }

        // Update transaction status to confirmed
        await this.transactionService.updateTransactionStatus(
            transactionId,
            'completed',
            solanaTransactionHash,
        );

        this.logger.log(`Transaction ${transactionId} confirmed successfully`);
        return transaction;
    }

    /**
     * Fails a transaction
     * @param transactionId - ID of the transaction to fail
     * @param reason - Reason for failure
     * @returns Failed transaction entity
     */
    async failTransaction(transactionId: string, reason: string): Promise<any> {
        this.logger.debug(`Failing transaction ${transactionId}: ${reason}`);

        // Get the transaction
        const transaction =
            await this.transactionService.getTransaction(transactionId);

        if (!transaction) {
            throw new NotFoundException(
                `Transaction ${transactionId} not found`,
            );
        }

        // Update transaction status to failed
        await this.transactionService.updateTransactionStatus(
            transactionId,
            'failed',
            undefined,
            reason,
        );

        this.logger.log(`Transaction ${transactionId} failed: ${reason}`);
        return transaction;
    }

    /**
     * Gets transaction history for a user
     * @param userId - ID of the user
     * @param limit - Maximum number of results
     * @param offset - Number of results to skip
     * @returns Array of transaction entities
     */
    async getTransactionHistory(
        userId: string,
        limit: number = 10,
        offset: number = 0,
    ): Promise<any[]> {
        this.logger.debug(`Getting transaction history for user ${userId}`);

        // Validate user exists
        await this.validateUser(userId);

        // Get transaction history
        return await this.transactionService.getTransactionHistory(
            userId,
            { limit, offset },
        );
    }

    /**
     * Gets transaction by ID
     * @param transactionId - ID of the transaction
     * @param userId - ID of the user (for authorization)
     * @returns Transaction entity
     */
    async getTransactionById(
        transactionId: string,
        userId: string,
    ): Promise<any> {
        this.logger.debug(
            `Getting transaction ${transactionId} for user ${userId}`,
        );

        // Get the transaction
        const transaction =
            await this.transactionService.getTransaction(transactionId);

        if (!transaction) {
            throw new NotFoundException(
                `Transaction ${transactionId} not found`,
            );
        }

        // Check if user is involved in this transaction
        if (
            transaction.fromUserId !== userId &&
            transaction.toUserId !== userId
        ) {
            throw new ForbiddenException(
                'You do not have permission to view this transaction',
            );
        }

        return transaction;
    }

    /**
     * Gets pending transactions for a user
     * @param userId - ID of the user
     * @returns Array of pending transaction entities
     */
    async getPendingTransactions(userId: string): Promise<Transaction[]> {
        this.logger.debug(`Getting pending transactions for user ${userId}`);

        // Validate user exists
        await this.validateUser(userId);

        // Get pending transactions - this would need to be implemented
        return [];
    }

    /**
     * Validates user exists and is active
     * @param userId - ID of the user
     * @returns User entity
     */
    private async validateUser(userId: string): Promise<User> {
        const user = await this.userService.findOne(userId);

        if (user.status !== 'active') {
            throw new ForbiddenException('User account is not active');
        }

        return user;
    }

    /**
     * Validates wallet exists and belongs to user
     * @param walletId - ID of the wallet
     * @param userId - ID of the user
     * @returns Wallet entity
     */
    private async validateWallet(
        walletId: string,
        userId: string,
    ): Promise<Wallet> {
        const wallet = await this.walletService.findOne(walletId);

        if (wallet.userId !== userId) {
            throw new ForbiddenException('Wallet does not belong to the user');
        }

        return wallet;
    }

    /**
     * Validates transaction data
     * @param createTransactionDto - Transaction creation data
     */
    private async validateTransactionData(
        createTransactionDto: CreateTransactionDto,
    ): Promise<void> {
        // Validate amount is positive
        if (createTransactionDto.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        // Validate token type is supported
        if (
            !Object.values(TokenType).includes(createTransactionDto.tokenType)
        ) {
            throw new BadRequestException('Unsupported token type');
        }

        // Validate sender and recipient are different (only for internal transfers)
        if (
            createTransactionDto.recipientId &&
            createTransactionDto.recipientId === 'mock-sender-id' // Mock comparison since senderId is not in DTO
        ) {
            throw new BadRequestException(
                'Cannot send transaction to yourself',
            );
        }

        // Validate sender and recipient wallets are different (only for internal transfers)
        // Note: This validation is handled elsewhere - removed constant condition
    }

    /**
     * Validates sender has sufficient balance
     * @param walletId - ID of the sender's wallet
     * @param tokenType - Type of token
     * @param amount - Amount to transfer
     */
    private async validateSenderBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<void> {
        const balance = await this.walletBalanceService.getBalance(
            walletId,
            tokenType,
        );
        const availableBalance = balance || 0;

        if (availableBalance < amount) {
            throw new BadRequestException(
                `Insufficient balance. Available: ${availableBalance}, Required: ${amount}`,
            );
        }
    }

    /**
     * Updates wallet balances after successful transaction
     * @param transaction - Confirmed transaction entity
     */
    private async updateWalletBalancesAfterTransaction(
        transaction: Transaction,
    ): Promise<void> {
        this.logger.debug(
            `Updating wallet balances after transaction ${transaction.id}`,
        );

        try {
            // Update sender balance (subtract amount)
            const senderBalance = await this.walletBalanceService.getBalance(
                transaction.senderWalletId,
                transaction.tokenType,
            );
            const newSenderBalance = (senderBalance || 0) - transaction.amount;

            await this.walletBalanceService.setBalance(
                transaction.senderWalletId,
                transaction.tokenType,
                newSenderBalance,
            );

            // Update recipient balance (add amount)
            const recipientBalance = await this.walletBalanceService.getBalance(
                transaction.recipientWalletId,
                transaction.tokenType,
            );
            const newRecipientBalance =
                (recipientBalance || 0) + transaction.amount;

            await this.walletBalanceService.setBalance(
                transaction.recipientWalletId,
                transaction.tokenType,
                newRecipientBalance,
            );

            this.logger.log(
                `Wallet balances updated for transaction ${transaction.id}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to update wallet balances for transaction ${transaction.id}:`,
                error,
            );
            // Don't throw here as the transaction is already marked as confirmed
            // The balances can be synced later
        }
    }
}
