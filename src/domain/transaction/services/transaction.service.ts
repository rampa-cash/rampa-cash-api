import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PublicKey } from '@solana/web3.js';
import { Transaction } from '../entities/transaction.entity';
import {
    TransactionService as ITransactionService,
    TransactionRequest,
    TransactionResult,
    TransactionHistory,
} from '../interfaces/transaction-service.interface';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { UserService } from '../../user/services/user.service';
import { AddressResolutionService } from '../../wallet/services/address-resolution.service';
import { TokenAccountService } from '../../solana/services/token-account.service';
import { SolanaTransferService } from '../../solana/services/solana-transfer.service';
import { SolanaConnectionService } from '../../solana/services/solana-connection.service';
import { TokenConfigService } from '../../common/services/token-config.service';
import { ConfigService } from '@nestjs/config';
import { TokenType, TOKEN_DECIMALS } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';

@Injectable()
export class TransactionService implements ITransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(WalletBalance)
        private readonly walletBalanceRepository: Repository<WalletBalance>,
        private readonly blockchainService: SolanaBlockchainService,
        private readonly walletService: WalletService,
        private readonly userService: UserService,
        private readonly addressResolutionService: AddressResolutionService,
        private readonly tokenAccountService: TokenAccountService,
        private readonly solanaTransferService: SolanaTransferService,
        private readonly solanaConnectionService: SolanaConnectionService,
        private readonly tokenConfigService: TokenConfigService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {}

    async createTransaction(
        request: TransactionRequest,
    ): Promise<TransactionResult> {
        this.logger.log(
            `Creating unified transaction: ${request.amount} ${request.token} from ${request.fromUserId}`,
        );

        try {
            // Step 1: Validate transaction request
            const validation = await this.validateTransaction(request);
            if (!validation.isValid) {
                throw new BadRequestException(
                    `Transaction validation failed: ${validation.errors.join(', ')}`,
                );
            }

            // Step 2: Resolve addresses and determine transfer type
            const addressResolution = await this.resolveAddresses(request);
            
            // Step 3: Check balance for internal wallets
            if (addressResolution.fromWallet) {
                const balanceCheck = await this.checkBalance(
                    request.fromUserId,
                    request.amount,
                    request.token,
                );
                if (!balanceCheck.hasBalance) {
                    throw new BadRequestException(
                        `Insufficient balance. Current: ${balanceCheck.currentBalance}, Required: ${request.amount}`,
                    );
                }
            }

            // Step 4: Create database transaction for atomicity
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                // Step 5: Create transaction record
                const transaction = await this.createTransactionRecord(
                    request,
                    addressResolution,
                    queryRunner,
                );

                // Step 6: Execute blockchain transfer
                const blockchainResult = await this.executeBlockchainTransfer(
                    request,
                    addressResolution,
                );

                // Step 7: Update transaction with blockchain result
                await this.updateTransactionWithBlockchainResult(
                    transaction,
                    blockchainResult,
                    queryRunner,
                );

                // Step 8: Update balances (for internal wallets only)
                await this.updateBalances(
                    request,
                    addressResolution,
                    queryRunner,
                );

                // Commit transaction
                await queryRunner.commitTransaction();

                this.logger.log(
                    `Unified transaction completed successfully: ${transaction.id}`,
                );

                return {
                    transactionId: transaction.id,
                    status: TransactionStatus.CONFIRMED,
                    signature: blockchainResult.signature,
                    createdAt: transaction.createdAt,
                    completedAt: transaction.confirmedAt,
                };
            } catch (error) {
                // Rollback transaction on any error
                await queryRunner.rollbackTransaction();
                this.logger.error(
                    `Transaction failed, rolled back: ${error.message}`,
                );
                throw error;
            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(
                `Failed to create unified transaction for user ${request.fromUserId}`,
                error,
            );
            throw new InternalServerErrorException(
                `Transaction failed: ${error.message}`,
            );
        }
    }

    async getTransaction(
        transactionId: string,
    ): Promise<TransactionHistory | null> {
        try {
            const transaction = await this.transactionRepository.findOne({
                where: { id: transactionId },
            });

            if (!transaction) {
                return null;
            }

            return this.mapToTransactionHistory(transaction);
        } catch (error) {
            this.logger.error(
                `Failed to get transaction ${transactionId}`,
                error,
            );
            throw error;
        }
    }

    async getTransactionHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0,
        token?: string,
    ): Promise<TransactionHistory[]> {
        try {
            const query = this.transactionRepository
                .createQueryBuilder('transaction')
                .where(
                    '(transaction.fromUserId = :userId OR transaction.toUserId = :userId)',
                    { userId },
                )
                .orderBy('transaction.createdAt', 'DESC')
                .limit(limit)
                .offset(offset);

            if (token) {
                query.andWhere('transaction.token = :token', { token });
            }

            const transactions = await query.getMany();

            return transactions.map((transaction) =>
                this.mapToTransactionHistory(transaction),
            );
        } catch (error) {
            this.logger.error(
                `Failed to get transaction history for user ${userId}`,
                error,
            );
            throw error;
        }
    }

    async getSentTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<TransactionHistory[]> {
        try {
            const transactions = await this.transactionRepository.find({
                where: { senderId: userId },
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

            return transactions.map((transaction) =>
                this.mapToTransactionHistory(transaction),
            );
        } catch (error) {
            this.logger.error(
                `Failed to get sent transactions for user ${userId}`,
                error,
            );
            throw error;
        }
    }

    async getReceivedTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<TransactionHistory[]> {
        try {
            const transactions = await this.transactionRepository.find({
                where: { recipientId: userId },
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
            });

            return transactions.map((transaction) =>
                this.mapToTransactionHistory(transaction),
            );
        } catch (error) {
            this.logger.error(
                `Failed to get received transactions for user ${userId}`,
                error,
            );
            throw error;
        }
    }

    async updateTransactionStatus(
        transactionId: string,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        signature?: string,
        error?: string,
    ): Promise<void> {
        try {
            const transaction = await this.transactionRepository.findOne({
                where: { id: transactionId },
            });

            if (!transaction) {
                throw new NotFoundException(
                    `Transaction ${transactionId} not found`,
                );
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

            this.logger.log(
                `Updated transaction ${transactionId} status to ${status}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to update transaction ${transactionId} status`,
                error,
            );
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
                if (
                    !this.blockchainService.validateAddress(
                        request.toExternalAddress,
                    )
                ) {
                    errors.push('Invalid external address');
                }
            } else {
                errors.push(
                    'Either toUserId or toExternalAddress must be provided',
                );
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
        token: string,
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
            const wallet = wallets.find((w) => (w as any).tokenType === token);
            if (!wallet) {
                return {
                    hasBalance: false,
                    currentBalance: BigInt(0),
                };
            }

            const balance = await this.blockchainService.getBalance(
                wallet.address,
                token,
            );
            const currentBalance = balance.balance;

            return {
                hasBalance: currentBalance >= amount,
                currentBalance,
            };
        } catch (error) {
            this.logger.error(
                `Failed to check balance for user ${userId}`,
                error,
            );
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
                    await this.updateTransactionStatus(
                        transaction.id,
                        'processing',
                    );

                    // Get user's wallet
                    const wallets = await this.walletService.getUserWallets(
                        transaction.senderId,
                    );
                    const wallet = wallets.find(
                        (w) => (w as any).tokenType === transaction.tokenType,
                    );
                    if (!wallet) {
                        throw new Error('User wallet not found');
                    }

                    // Create blockchain transaction
                    const blockchainTx =
                        await this.blockchainService.createTransaction(
                            wallet.address,
                            (transaction as any).toExternalAddress ||
                                (await this.getRecipientAddress(
                                    transaction.recipientId,
                                    transaction.tokenType,
                                )),
                            BigInt(transaction.amount),
                            transaction.tokenType,
                        );

                    // Broadcast transaction
                    const signature =
                        await this.blockchainService.broadcastTransaction(
                            blockchainTx,
                        );

                    // Update transaction with signature
                    await this.updateTransactionStatus(
                        transaction.id,
                        'completed',
                        signature,
                    );

                    this.logger.log(
                        `Processed transaction ${transaction.id} with signature ${signature}`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to process transaction ${transaction.id}`,
                        error,
                    );
                    await this.updateTransactionStatus(
                        transaction.id,
                        'failed',
                        undefined,
                        error.message,
                    );
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
                where: { senderId: userId, status: 'completed' as any },
            });

            const receivedTransactions = await this.transactionRepository.find({
                where: { recipientId: userId, status: 'completed' as any },
            });

            const allTransactions = await this.transactionRepository.find({
                where: { senderId: userId },
            });

            const totalSent = sentTransactions.reduce(
                (sum, tx) => sum + BigInt(tx.amount),
                BigInt(0),
            );
            const totalReceived = receivedTransactions.reduce(
                (sum, tx) => sum + BigInt(tx.amount),
                BigInt(0),
            );
            const completedCount = allTransactions.filter(
                (tx) => tx.status === ('completed' as any),
            ).length;
            const successRate =
                allTransactions.length > 0
                    ? (completedCount / allTransactions.length) * 100
                    : 0;

            return {
                totalSent,
                totalReceived,
                transactionCount: allTransactions.length,
                successRate,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get transaction stats for user ${userId}`,
                error,
            );
            throw error;
        }
    }

    private mapToTransactionHistory(
        transaction: Transaction,
    ): TransactionHistory {
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

    private async getRecipientAddress(
        userId: string,
        token: string,
    ): Promise<string> {
        const wallets = await this.walletService.getUserWallets(userId);
        const wallet = wallets.find((w) => (w as any).tokenType === token);
        if (!wallet) {
            throw new Error(
                `User ${userId} does not have a wallet for token ${token}`,
            );
        }
        return wallet.address;
    }

    /**
     * Resolve addresses for both sender and recipient
     */
    private async resolveAddresses(request: TransactionRequest): Promise<{
        fromAddress: string;
        toAddress: string;
        fromWallet?: any;
        toWallet?: any;
        isExternalTransfer: boolean;
        isParaWallet: boolean;
    }> {
        let fromAddress: string;
        let fromWallet: any = null;
        let isParaWallet = false;

        // Resolve sender address
        if (request.fromAddress) {
            fromAddress = request.fromAddress;
            try {
                fromWallet = await this.addressResolutionService.resolveWalletAddress(fromAddress);
            } catch (error) {
                if (error.message.includes('not found')) {
                    this.logger.debug(`From address ${fromAddress} not found in database, treating as Para wallet`);
                    isParaWallet = true;
                } else {
                    throw error;
                }
            }
        } else {
            // Use authenticated user's wallet
            const wallets = await this.walletService.getUserWallets(request.fromUserId);
            const wallet = wallets.find((w) => (w as any).tokenType === request.token);
            if (!wallet) {
                throw new NotFoundException(`User does not have a wallet for token ${request.token}`);
            }
            fromAddress = wallet.address;
            fromWallet = wallet;
        }

        // Resolve recipient address
        let toAddress: string;
        let toWallet: any = null;
        let isExternalTransfer = false;

        if (request.toExternalAddress) {
            toAddress = request.toExternalAddress;
            isExternalTransfer = true;
            // Validate as external Solana address
            try {
                new PublicKey(toAddress);
            } catch (error) {
                throw new BadRequestException(`Invalid external address: ${toAddress}`);
            }
        } else if (request.toUserId) {
            // Internal transfer
            const wallets = await this.walletService.getUserWallets(request.toUserId);
            const wallet = wallets.find((w) => (w as any).tokenType === request.token);
            if (!wallet) {
                throw new NotFoundException(`Recipient does not have a wallet for token ${request.token}`);
            }
            toAddress = wallet.address;
            toWallet = wallet;
        } else {
            throw new BadRequestException('Either recipientId or externalAddress must be provided');
        }

        return {
            fromAddress,
            toAddress,
            fromWallet,
            toWallet,
            isExternalTransfer,
            isParaWallet,
        };
    }

    /**
     * Create transaction record in database
     */
    private async createTransactionRecord(
        request: TransactionRequest,
        addressResolution: any,
        queryRunner: any,
    ): Promise<Transaction> {
        // Special UUIDs for external addresses
        const EXTERNAL_ADDRESS_USER_ID = '00000000-0000-0000-0000-000000000000';
        const EXTERNAL_ADDRESS_WALLET_ID = '00000000-0000-0000-0000-000000000001';

        let recipientId: string;
        let recipientWalletId: string;

        if (addressResolution.isExternalTransfer) {
            recipientId = EXTERNAL_ADDRESS_USER_ID;
            recipientWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        } else {
            recipientId = request.toUserId!;
            recipientWalletId = addressResolution.toWallet.id;
        }

        // Create description that includes external address if applicable
        let description = request.description || '';
        if (addressResolution.isExternalTransfer) {
            description = `External transfer to ${request.toExternalAddress}${description ? ` - ${description}` : ''}`;
        }

        // Handle sender wallet ID
        let senderWalletId: string;
        if (addressResolution.isParaWallet) {
            senderWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        } else if (addressResolution.fromWallet?.id) {
            senderWalletId = addressResolution.fromWallet.id;
        } else {
            senderWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        }

        const transactionData: any = {
            senderId: request.fromUserId,
            recipientId: recipientId,
            senderWalletId: senderWalletId,
            recipientWalletId: recipientWalletId,
            amount: this.convertToSmallestUnits(request.amount, request.token),
            tokenType: request.token,
            status: TransactionStatus.PENDING,
            description: description,
        };

        const transaction = queryRunner.manager.create(Transaction, transactionData);
        return await queryRunner.manager.save(transaction);
    }

    /**
     * Execute blockchain transfer
     */
    private async executeBlockchainTransfer(
        request: TransactionRequest,
        addressResolution: any,
    ): Promise<any> {
        this.logger.log(`Executing blockchain transfer for ${request.token}`);

        const maxRetries = 3;
        const retryDelay = 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Ensure recipient has token account (only for internal users)
                if (!addressResolution.isExternalTransfer) {
                    await this.tokenAccountService.ensureTokenAccountExists(
                        addressResolution.toAddress,
                        request.token as TokenType,
                    );
                }

                // Execute the transfer based on token type
                let transaction: any;
                if (request.token === TokenType.SOL) {
                    transaction = await this.solanaTransferService.createSOLTransferTransaction(
                        addressResolution.fromAddress,
                        addressResolution.toAddress,
                        Number(request.amount),
                        request.memo,
                    );
                } else {
                    transaction = await this.solanaTransferService.createSPLTokenTransferTransaction(
                        addressResolution.fromAddress,
                        addressResolution.toAddress,
                        Number(request.amount),
                        request.token as TokenType,
                        request.memo,
                    );
                }

                // Sign and send transaction
                return await this.signAndSendTransaction(transaction, addressResolution.fromAddress, request.fromUserId);
            } catch (error) {
                this.logger.warn(`Blockchain transfer attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) {
                    throw new InternalServerErrorException(`Blockchain transfer failed after ${maxRetries} attempts: ${error.message}`);
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }

    /**
     * Sign and send transaction using Para SDK
     */
    private async signAndSendTransaction(
        transaction: any,
        fromAddress: string,
        userId: string,
    ): Promise<any> {
        try {
            this.logger.debug(`Signing transaction with Para SDK for address: ${fromAddress}`);

            // Validate network consistency
            await this.validateNetworkConsistency();

            // Ensure transaction has recentBlockhash before signing
            const connection = this.solanaConnectionService.getConnection();
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(fromAddress);

            this.logger.debug(`Transaction prepared with blockhash: ${blockhash}`);

            // TODO: Initialize Para SDK signer with the userId
            // await this.paraSdkSigner.init({ userId });

            // TODO: Sign transaction with Para SDK
            // const signedTransactionBytes = await this.paraSdkSigner.signTransaction(transaction);

            // Placeholder - will be replaced with Para SDK signing
            const signedTransactionBytes = transaction.serialize();

            this.logger.log(`Transaction signed successfully with Para SDK (placeholder)`);

            // Send the signed transaction to the blockchain
            const signature = await connection.sendRawTransaction(signedTransactionBytes, {
                skipPreflight: false,
                preflightCommitment: 'processed',
            });

            this.logger.log(`Transaction sent to blockchain with signature: ${signature}`);

            return {
                signature: signature,
                transaction,
                success: true,
            };
        } catch (error) {
            this.logger.error(`Para SDK signing failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Validate network consistency between Para SDK and Solana RPC
     */
    private async validateNetworkConsistency(): Promise<void> {
        const paraNetwork = this.configService.get<string>('PARA_NETWORK');
        const solanaNetwork = this.configService.get<string>('SOLANA_NETWORK');

        this.logger.debug(`Validating network consistency: Para=${paraNetwork}, Solana=${solanaNetwork}`);

        const networkMapping: Record<string, string> = {
            devnet: 'devnet',
            mainnet: 'mainnet-beta',
            testnet: 'testnet',
        };

        const expectedSolanaNetwork = paraNetwork ? networkMapping[paraNetwork] : undefined;

        if (expectedSolanaNetwork && expectedSolanaNetwork !== solanaNetwork) {
            const errorMessage = `Network mismatch: Para SDK is configured for ${paraNetwork} (expects Solana ${expectedSolanaNetwork}) but Solana RPC is configured for ${solanaNetwork}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        this.logger.debug('Network consistency validation passed');
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
        transaction.confirmedAt = new Date();
        await queryRunner.manager.save(transaction);
    }

    /**
     * Update wallet balances after successful transfer
     */
    private async updateBalances(
        request: TransactionRequest,
        addressResolution: any,
        queryRunner: any,
    ): Promise<void> {
        const amount = this.convertToSmallestUnits(request.amount, request.token);

        // Update from wallet balance (only for internal wallets)
        if (addressResolution.fromWallet && !addressResolution.isParaWallet) {
            const fromBalance = await queryRunner.manager.findOne(WalletBalance, {
                where: {
                    walletId: addressResolution.fromWallet.id,
                    tokenType: request.token,
                },
            });

            if (fromBalance) {
                fromBalance.balance -= amount;
                await queryRunner.manager.save(fromBalance);
            }
        }

        // Update to wallet balance (only for internal users)
        if (!addressResolution.isExternalTransfer && addressResolution.toWallet) {
            let toBalance = await queryRunner.manager.findOne(WalletBalance, {
                where: {
                    walletId: addressResolution.toWallet.id,
                    tokenType: request.token,
                },
            });

            if (toBalance) {
                toBalance.balance += amount;
            } else {
                toBalance = queryRunner.manager.create(WalletBalance, {
                    walletId: addressResolution.toWallet.id,
                    tokenType: request.token,
                    balance: amount,
                });
            }

            await queryRunner.manager.save(toBalance);
        }
    }

    /**
     * Convert amount to smallest units based on token decimals
     */
    private convertToSmallestUnits(amount: bigint, tokenType: string): number {
        const decimals = TOKEN_DECIMALS[tokenType as TokenType] || 6;
        return Number(amount) * Math.pow(10, decimals);
    }
}
