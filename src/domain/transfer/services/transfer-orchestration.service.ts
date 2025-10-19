import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PublicKey } from '@solana/web3.js';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';
import { AddressResolutionService } from '../../wallet/services/address-resolution.service';
import { TokenAccountService } from '../../solana/services/token-account.service';
import { SolanaTransferService } from '../../solana/services/solana-transfer.service';
import { TokenConfigService } from '../../common/services/token-config.service';
import { TokenType, TOKEN_DECIMALS } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

export interface TransferRequest {
    fromAddress: string;
    toAddress: string;
    amount: number;
    tokenType: TokenType;
    memo?: string;
    userId: string;
}

export interface TransferValidation {
    isValid: boolean;
    errors: string[];
    fromWallet?: Wallet;
    toWallet?: Wallet;
    fromBalance?: WalletBalance;
    estimatedFee?: number;
}

export interface TransferResult {
    transactionId: string;
    solanaTransactionHash: string;
    status: TransactionStatus;
    message: string;
    estimatedFee: number;
}

@Injectable()
export class TransferOrchestrationService {
    private readonly logger = new Logger(TransferOrchestrationService.name);

    constructor(
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        private addressResolutionService: AddressResolutionService,
        private tokenAccountService: TokenAccountService,
        private solanaTransferService: SolanaTransferService,
        private tokenConfigService: TokenConfigService,
        private dataSource: DataSource,
    ) {}

    /**
     * Main transfer orchestration method
     * Coordinates the entire transfer flow from validation to confirmation
     */
    async initiateTransfer(
        transferRequest: TransferRequest,
    ): Promise<TransferResult> {
        this.logger.log(
            `Initiating transfer: ${transferRequest.amount} ${transferRequest.tokenType} from ${transferRequest.fromAddress} to ${transferRequest.toAddress}`,
        );

        try {
            // Step 1: Validate transfer request
            const validation = await this.validateTransfer(transferRequest);
            if (!validation.isValid) {
                throw new BadRequestException(
                    `Transfer validation failed: ${validation.errors.join(', ')}`,
                );
            }

            // Step 2: Create database transaction for atomicity
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                // Step 3: Create transaction record
                const transaction = await this.createTransactionRecord(
                    transferRequest,
                    queryRunner,
                );

                // Step 4: Execute blockchain transfer
                const blockchainResult = await this.executeTransfer(
                    transferRequest,
                    validation,
                );

                // Step 5: Update transaction with blockchain result
                await this.updateTransactionWithBlockchainResult(
                    transaction,
                    blockchainResult,
                    queryRunner,
                );

                // Step 6: Update balances
                await this.updateBalances(
                    transferRequest,
                    validation,
                    queryRunner,
                );

                // Commit transaction
                await queryRunner.commitTransaction();

                this.logger.log(
                    `Transfer completed successfully: ${transaction.id}`,
                );

                return {
                    transactionId: transaction.id,
                    solanaTransactionHash: blockchainResult.signature,
                    status: TransactionStatus.CONFIRMED,
                    message: 'Transfer completed successfully',
                    estimatedFee: validation.estimatedFee || 0,
                };
            } catch (error) {
                // Rollback transaction on any error
                await queryRunner.rollbackTransaction();
                this.logger.error(
                    `Transfer failed, rolled back: ${error.message}`,
                );
                throw error;
            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(
                `Transfer orchestration failed: ${error.message}`,
            );
            throw new InternalServerErrorException(
                `Transfer failed: ${error.message}`,
            );
        }
    }

    /**
     * Validate transfer request before execution
     */
    async validateTransfer(
        transferRequest: TransferRequest,
    ): Promise<TransferValidation> {
        const errors: string[] = [];

        try {
            // Validate addresses
            if (!transferRequest.fromAddress || !transferRequest.toAddress) {
                errors.push('From and to addresses are required');
            }

            if (transferRequest.fromAddress === transferRequest.toAddress) {
                errors.push('Cannot transfer to the same address');
            }

            // Validate amount
            if (transferRequest.amount <= 0) {
                errors.push('Transfer amount must be positive');
            }

            // Validate token type
            if (!Object.values(TokenType).includes(transferRequest.tokenType)) {
                errors.push('Invalid token type');
            }

            if (errors.length > 0) {
                return { isValid: false, errors };
            }

            // Resolve addresses to wallets
            const fromWallet =
                await this.addressResolutionService.resolveWalletAddress(
                    transferRequest.fromAddress,
                );
            const toWallet =
                await this.addressResolutionService.resolveWalletAddress(
                    transferRequest.toAddress,
                );

            if (!fromWallet) {
                errors.push('From address not found');
            }

            if (!toWallet) {
                errors.push('To address not found');
            }

            if (errors.length > 0) {
                return { isValid: false, errors };
            }

            // Check if user owns the from wallet
            if (fromWallet.userId !== transferRequest.userId) {
                errors.push('User does not own the from wallet');
            }

            // Get from wallet balance
            const fromBalance = await this.walletBalanceRepository.findOne({
                where: {
                    walletId: fromWallet.walletId,
                    tokenType: transferRequest.tokenType,
                },
            });

            if (!fromBalance) {
                errors.push(
                    `No ${transferRequest.tokenType} balance found for from wallet`,
                );
            } else {
                // Check sufficient balance
                const requiredAmount = this.convertToSmallestUnits(
                    transferRequest.amount,
                    transferRequest.tokenType,
                );
                if (fromBalance.balance < requiredAmount) {
                    errors.push('Insufficient balance for transfer');
                }
            }

            // Estimate transaction fee
            const estimatedFee =
                await this.estimateTransactionFee(transferRequest);

            return {
                isValid: errors.length === 0,
                errors,
                fromWallet: fromWallet
                    ? (await this.walletRepository.findOne({
                          where: { id: fromWallet.walletId },
                      })) || undefined
                    : undefined,
                toWallet: toWallet
                    ? (await this.walletRepository.findOne({
                          where: { id: toWallet.walletId },
                      })) || undefined
                    : undefined,
                fromBalance: fromBalance || undefined,
                estimatedFee,
            };
        } catch (error) {
            this.logger.error(`Transfer validation failed: ${error.message}`);
            return {
                isValid: false,
                errors: [`Validation error: ${error.message}`],
            };
        }
    }

    /**
     * Execute the actual blockchain transfer
     */
    async executeTransfer(
        transferRequest: TransferRequest,
        validation: TransferValidation,
    ): Promise<any> {
        this.logger.log(
            `Executing blockchain transfer for ${transferRequest.tokenType}`,
        );

        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Ensure recipient has token account
                await this.tokenAccountService.ensureTokenAccountExists(
                    transferRequest.toAddress,
                    transferRequest.tokenType,
                );

                // Execute the transfer based on token type
                if (transferRequest.tokenType === TokenType.SOL) {
                    const transaction =
                        await this.solanaTransferService.createSOLTransferTransaction(
                            transferRequest.fromAddress,
                            transferRequest.toAddress,
                            transferRequest.amount,
                            transferRequest.memo,
                        );
                    const fromPubkey = new PublicKey(transferRequest.fromAddress);
                    return await this.solanaTransferService.signAndSendTransaction(
                        transaction,
                        fromPubkey,
                    );
                } else {
                    const transaction =
                        await this.solanaTransferService.createSPLTokenTransferTransaction(
                            transferRequest.fromAddress,
                            transferRequest.toAddress,
                            transferRequest.amount,
                            transferRequest.tokenType,
                            transferRequest.memo,
                        );
                    const fromPubkey = new PublicKey(transferRequest.fromAddress);
                    return await this.solanaTransferService.signAndSendTransaction(
                        transaction,
                        fromPubkey,
                    );
                }
            } catch (error) {
                this.logger.warn(
                    `Blockchain transfer attempt ${attempt} failed: ${error.message}`,
                );

                if (attempt === maxRetries) {
                    this.logger.error(
                        `Blockchain transfer failed after ${maxRetries} attempts: ${error.message}`,
                    );
                    throw new InternalServerErrorException(
                        `Blockchain transfer failed after ${maxRetries} attempts: ${error.message}`,
                    );
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }

    /**
     * Confirm transfer status on blockchain
     */
    async confirmTransfer(solanaTransactionHash: string): Promise<boolean> {
        try {
            return await this.solanaTransferService.isTransactionConfirmed(
                solanaTransactionHash,
            );
        } catch (error) {
            this.logger.error(`Transfer confirmation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Create transaction record in database
     */
    private async createTransactionRecord(
        transferRequest: TransferRequest,
        queryRunner: any,
    ): Promise<Transaction> {
        const transaction = queryRunner.manager.create(Transaction, {
            senderId: transferRequest.userId,
            recipientId: transferRequest.toAddress, // Will be resolved later
            amount: this.convertToSmallestUnits(
                transferRequest.amount,
                transferRequest.tokenType,
            ),
            tokenType: transferRequest.tokenType,
            status: TransactionStatus.PENDING,
            memo: transferRequest.memo,
        });

        return await queryRunner.manager.save(transaction);
    }

    /**
     * Update transaction with blockchain result
     */
    private async updateTransactionWithBlockchainResult(
        transaction: Transaction,
        blockchainResult: any,
        queryRunner: any,
    ): Promise<void> {
        transaction.solanaTransactionHash = blockchainResult.signature;
        transaction.status = TransactionStatus.CONFIRMED;
        await queryRunner.manager.save(transaction);
    }

    /**
     * Update wallet balances after successful transfer
     */
    private async updateBalances(
        transferRequest: TransferRequest,
        validation: TransferValidation,
        queryRunner: any,
    ): Promise<void> {
        const amount = this.convertToSmallestUnits(
            transferRequest.amount,
            transferRequest.tokenType,
        );

        // Update from wallet balance
        if (validation.fromBalance) {
            validation.fromBalance.balance -= amount;
            await queryRunner.manager.save(validation.fromBalance);
        }

        // Update or create to wallet balance
        if (!validation.toWallet) {
            throw new Error('To wallet not found in validation');
        }

        let toBalance = await queryRunner.manager.findOne(WalletBalance, {
            where: {
                walletId: validation.toWallet.id,
                tokenType: transferRequest.tokenType,
            },
        });

        if (toBalance) {
            toBalance.balance += amount;
        } else {
            toBalance = queryRunner.manager.create(WalletBalance, {
                walletId: validation.toWallet.id,
                tokenType: transferRequest.tokenType,
                balance: amount,
            });
        }

        await queryRunner.manager.save(toBalance);
    }

    /**
     * Estimate transaction fee
     */
    private async estimateTransactionFee(
        transferRequest: TransferRequest,
    ): Promise<number> {
        try {
            // Create a mock transaction to estimate fee
            const mockTransaction =
                await this.solanaTransferService.createTransferTransaction({
                    fromAddress: transferRequest.fromAddress,
                    toAddress: transferRequest.toAddress,
                    amount: transferRequest.amount,
                    tokenType: transferRequest.tokenType,
                    memo: transferRequest.memo,
                });

            return await this.solanaTransferService.estimateTransactionFee(
                mockTransaction,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to estimate transaction fee: ${error.message}`,
            );
            return 5000; // Default fee
        }
    }

    /**
     * Convert amount to smallest units based on token decimals
     */
    private convertToSmallestUnits(
        amount: number,
        tokenType: TokenType,
    ): number {
        const decimals = TOKEN_DECIMALS[tokenType];
        return Math.floor(amount * Math.pow(10, decimals));
    }
}
