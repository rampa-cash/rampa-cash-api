import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionService as ITransactionService, TransactionRequest, TransactionResult, TransactionHistory } from '../interfaces/transaction-service.interface';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TransactionService implements ITransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly blockchainService: SolanaBlockchainService,
        private readonly walletService: WalletService,
        private readonly userService: UserService,
    ) {}

    async createTransaction(request: TransactionRequest): Promise<TransactionResult> {
        try {
            // Validate the transaction request
            const validation = await this.validateTransaction(request);
            if (!validation.isValid) {
                throw new BadRequestException(`Transaction validation failed: ${validation.errors.join(', ')}`);
            }

            // Check if user has sufficient balance
            const balanceCheck = await this.checkBalance(request.fromUserId, request.amount, request.token);
            if (!balanceCheck.hasBalance) {
                throw new BadRequestException(`Insufficient balance. Current: ${balanceCheck.currentBalance}, Required: ${request.amount}`);
            }

            // Create transaction record
        const transaction = this.transactionRepository.create({
                senderId: request.fromUserId,
                recipientId: request.toUserId || '',
                senderWalletId: '', // This would need to be determined
                recipientWalletId: '', // This would need to be determined
                amount: Number(request.amount),
                tokenType: request.token as any,
                status: 'pending' as any,
                description: request.description,
            });

            const savedTransaction = await this.transactionRepository.save(transaction);

            this.logger.log(`Created transaction ${savedTransaction.id} for user ${request.fromUserId}`);

            return {
                transactionId: savedTransaction.id,
                status: 'pending',
                createdAt: savedTransaction.createdAt,
            };
        } catch (error) {
            this.logger.error(`Failed to create transaction for user ${request.fromUserId}`, error);
            throw error;
        }
    }

    async getTransaction(transactionId: string): Promise<TransactionHistory | null> {
        try {
            const transaction = await this.transactionRepository.findOne({
                where: { id: transactionId }
            });

            if (!transaction) {
                return null;
            }

            return this.mapToTransactionHistory(transaction);
        } catch (error) {
            this.logger.error(`Failed to get transaction ${transactionId}`, error);
            throw error;
        }
    }

    async getTransactionHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0,
        token?: string
    ): Promise<TransactionHistory[]> {
        try {
            const query = this.transactionRepository
                .createQueryBuilder('transaction')
                .where('(transaction.fromUserId = :userId OR transaction.toUserId = :userId)', { userId })
                .orderBy('transaction.createdAt', 'DESC')
                .limit(limit)
                .offset(offset);

            if (token) {
                query.andWhere('transaction.token = :token', { token });
            }

            const transactions = await query.getMany();

            return transactions.map(transaction => this.mapToTransactionHistory(transaction));
        } catch (error) {
            this.logger.error(`Failed to get transaction history for user ${userId}`, error);
            throw error;
        }
    }

    async getSentTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<TransactionHistory[]> {
        try {
            const transactions = await this.transactionRepository.find({
                where: { senderId: userId },
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

            return transactions.map(transaction => this.mapToTransactionHistory(transaction));
        } catch (error) {
            this.logger.error(`Failed to get sent transactions for user ${userId}`, error);
            throw error;
        }
    }

    async getReceivedTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<TransactionHistory[]> {
        try {
            const transactions = await this.transactionRepository.find({
                where: { recipientId: userId },
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

            return transactions.map(transaction => this.mapToTransactionHistory(transaction));
        } catch (error) {
            this.logger.error(`Failed to get received transactions for user ${userId}`, error);
            throw error;
        }
    }

    async updateTransactionStatus(
        transactionId: string,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        signature?: string,
        error?: string
    ): Promise<void> {
        try {
        const transaction = await this.transactionRepository.findOne({
                where: { id: transactionId }
        });

        if (!transaction) {
                throw new NotFoundException(`Transaction ${transactionId} not found`);
            }

            transaction.status = status as any;
            if (signature) {
                transaction.solanaTransactionHash = signature;
            }
            if (error) {
                transaction.failureReason = error;
            }
            if (status === 'completed') {
                transaction.confirmedAt = new Date();
            } else if (status === 'failed') {
                transaction.failedAt = new Date();
            }

            await this.transactionRepository.save(transaction);

            this.logger.log(`Updated transaction ${transactionId} status to ${status}`);
        } catch (error) {
            this.logger.error(`Failed to update transaction ${transactionId} status`, error);
            throw error;
        }
    }

    async validateTransaction(request: TransactionRequest): Promise<{
        isValid: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];

        try {
            // Validate user exists
            const fromUser = await this.userService.findOne(request.fromUserId);
            if (!fromUser) {
                errors.push('From user not found');
            }

            // Validate recipient
            if (request.toUserId) {
                const toUser = await this.userService.findOne(request.toUserId);
                if (!toUser) {
                    errors.push('To user not found');
                }
            } else if (request.toExternalAddress) {
                if (!this.blockchainService.validateAddress(request.toExternalAddress)) {
                    errors.push('Invalid external address');
                }
            } else {
                errors.push('Either toUserId or toExternalAddress must be provided');
            }

            // Validate amount
            if (request.amount <= 0) {
                errors.push('Amount must be greater than 0');
            }

            // Validate token
            const supportedTokens = ['USDC', 'EURC', 'SOL'];
            if (!supportedTokens.includes(request.token)) {
                errors.push(`Unsupported token: ${request.token}`);
            }

            return {
                isValid: errors.length === 0,
                errors,
            };
        } catch (error) {
            this.logger.error('Failed to validate transaction', error);
            return {
                isValid: false,
                errors: ['Validation failed due to system error'],
            };
        }
    }

    async checkBalance(
        userId: string,
        amount: bigint,
        token: string
    ): Promise<{
        hasBalance: boolean;
        currentBalance: bigint;
    }> {
        try {
            const user = await this.userService.findOne(userId);
            if (!user) {
                throw new NotFoundException(`User ${userId} not found`);
            }

            // Get user's wallet for the token
            const wallets = await this.walletService.getUserWallets(userId);
            const wallet = wallets.find(w => (w as any).tokenType === token);
            if (!wallet) {
                return {
                    hasBalance: false,
                    currentBalance: BigInt(0),
                };
            }

            const balance = await this.blockchainService.getBalance(wallet.address, token);
            const currentBalance = balance.balance;

            return {
                hasBalance: currentBalance >= amount,
                currentBalance,
            };
        } catch (error) {
            this.logger.error(`Failed to check balance for user ${userId}`, error);
            throw error;
        }
    }

    async processPendingTransactions(): Promise<void> {
        try {
            const pendingTransactions = await this.transactionRepository.find({
                where: { status: 'pending' as any },
                take: 10, // Process in batches
            });

            for (const transaction of pendingTransactions) {
                try {
                    await this.updateTransactionStatus(transaction.id, 'processing');

                    // Get user's wallet
                    const wallets = await this.walletService.getUserWallets(transaction.senderId);
                    const wallet = wallets.find(w => (w as any).tokenType === transaction.tokenType);
                    if (!wallet) {
                        throw new Error('User wallet not found');
                    }

                    // Create blockchain transaction
                    const blockchainTx = await this.blockchainService.createTransaction(
                        wallet.address,
                        (transaction as any).toExternalAddress || (await this.getRecipientAddress(transaction.recipientId!, transaction.tokenType)),
                        BigInt(transaction.amount),
                        transaction.tokenType
                    );

                    // Broadcast transaction
                    const signature = await this.blockchainService.broadcastTransaction(blockchainTx);

                    // Update transaction with signature
                    await this.updateTransactionStatus(transaction.id, 'completed', signature);

                    this.logger.log(`Processed transaction ${transaction.id} with signature ${signature}`);
                } catch (error) {
                    this.logger.error(`Failed to process transaction ${transaction.id}`, error);
                    await this.updateTransactionStatus(transaction.id, 'failed', undefined, error.message);
                }
            }
        } catch (error) {
            this.logger.error('Failed to process pending transactions', error);
            throw error;
        }
    }

    async getTransactionStats(userId: string): Promise<{
        totalSent: bigint;
        totalReceived: bigint;
        transactionCount: number;
        successRate: number;
    }> {
        try {
            const sentTransactions = await this.transactionRepository.find({
                where: { senderId: userId, status: 'completed' as any }
            });

            const receivedTransactions = await this.transactionRepository.find({
                where: { recipientId: userId, status: 'completed' as any }
            });

            const allTransactions = await this.transactionRepository.find({
                where: { senderId: userId }
            });

            const totalSent = sentTransactions.reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));
            const totalReceived = receivedTransactions.reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));
            const completedCount = allTransactions.filter(tx => tx.status === 'completed' as any).length;
            const successRate = allTransactions.length > 0 ? (completedCount / allTransactions.length) * 100 : 0;

            return {
                totalSent,
                totalReceived,
                transactionCount: allTransactions.length,
                successRate,
            };
        } catch (error) {
            this.logger.error(`Failed to get transaction stats for user ${userId}`, error);
            throw error;
        }
    }

    private mapToTransactionHistory(transaction: Transaction): TransactionHistory {
        return {
            transactionId: transaction.id,
            fromUserId: transaction.senderId,
            toUserId: transaction.recipientId,
            toExternalAddress: (transaction as any).toExternalAddress,
            amount: BigInt(transaction.amount),
            token: transaction.tokenType,
            status: transaction.status as any,
            signature: transaction.solanaTransactionHash,
            description: transaction.description,
            createdAt: transaction.createdAt,
            completedAt: transaction.confirmedAt || transaction.failedAt,
            metadata: (transaction as any).metadata,
        };
    }

    private async getRecipientAddress(userId: string, token: string): Promise<string> {
        const wallets = await this.walletService.getUserWallets(userId);
        const wallet = wallets.find(w => (w as any).tokenType === token);
        if (!wallet) {
            throw new Error(`User ${userId} does not have a wallet for token ${token}`);
        }
        return wallet.address;
    }
}