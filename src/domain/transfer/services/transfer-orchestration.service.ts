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
import { SolanaConnectionService } from '../../solana/services/solana-connection.service';
import { TokenConfigService } from '../../common/services/token-config.service';
import { Web3AuthNodeService } from '../../auth/services/web3auth-node.service';
import { Web3AuthNodeSigner } from '../../solana/services/signers/web3auth-node.signer';
import { ConfigService } from '@nestjs/config';
import { TokenType, TOKEN_DECIMALS } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

// Special UUIDs for external addresses (not real users/wallets)
const EXTERNAL_ADDRESS_USER_ID = '00000000-0000-0000-0000-000000000000';
const EXTERNAL_ADDRESS_WALLET_ID = '00000000-0000-0000-0000-000000000001';

export interface TransferRequest {
    fromAddress: string;
    toAddress: string;
    amount: number;
    tokenType: TokenType;
    memo?: string;
    userId: string;
    userJwt?: string; // Web3Auth JWT token for signing
}

export interface TransferValidation {
    isValid: boolean;
    errors: string[];
    fromWallet?: Wallet;
    toWallet?: Wallet;
    fromBalance?: WalletBalance;
    estimatedFee?: number;
    isExternalAddress?: boolean;
    isWeb3AuthWallet?: boolean;
    web3AuthFromAddress?: string;
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
        private solanaConnectionService: SolanaConnectionService,
        private tokenConfigService: TokenConfigService,
        private web3AuthNodeService: Web3AuthNodeService,
        private web3AuthNodeSigner: Web3AuthNodeSigner,
        private configService: ConfigService,
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
                    validation,
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

            // Resolve from address (must be internal user)
            let fromWallet: any = null;
            let isWeb3AuthWallet = false;
            let fromBalance: any = null;

            try {
                fromWallet = await this.addressResolutionService.resolveWalletAddress(
                    transferRequest.fromAddress,
                );
            } catch (error) {
                // If wallet not found in database, check if it's a Web3Auth wallet
                if (error.message.includes('not found')) {
                    // For Web3Auth wallets, we skip database validation
                    // since they're managed by Web3Auth and don't exist in our database
                    this.logger.debug(`From address ${transferRequest.fromAddress} not found in database, treating as Web3Auth wallet`);
                    isWeb3AuthWallet = true;
                } else {
                    this.logger.error(`Address resolution error: ${error.message}`);
                    errors.push(`Error validating from address: ${error.message}`);
                }
            }

            if (!isWeb3AuthWallet && !fromWallet) {
                errors.push('From address not found');
            }

            if (errors.length > 0) {
                return { isValid: false, errors };
            }

            // Check if user owns the from wallet (only for database wallets)
            if (!isWeb3AuthWallet && fromWallet && fromWallet.userId !== transferRequest.userId) {
                errors.push('User does not own the from wallet');
            }

            // Try to resolve to address (could be internal or external)
            let toWallet: any = null;
            let isExternalAddress = false;

            try {
                toWallet =
                    await this.addressResolutionService.resolveWalletAddress(
                        transferRequest.toAddress,
                    );
            } catch (error) {
                // If not found in database, check if it's a valid external Solana address
                if (error.message.includes('not found')) {
                    // Validate as external Solana address
                    try {
                        const { PublicKey } = await import('@solana/web3.js');
                        this.logger.debug(
                            `Validating external address: ${transferRequest.toAddress}`,
                        );
                        new PublicKey(transferRequest.toAddress);
                        this.logger.debug(
                            `Address validation successful: ${transferRequest.toAddress}`,
                        );
                        isExternalAddress = true;
                    } catch (solanaError) {
                        this.logger.error(
                            `Address validation failed: ${transferRequest.toAddress}, Error: ${solanaError.message}`,
                        );
                        errors.push(
                            `Invalid recipient address: ${transferRequest.toAddress}`,
                        );
                    }
                } else {
                    this.logger.error(
                        `Address resolution error: ${error.message}`,
                    );
                    errors.push(
                        `Error validating recipient address: ${error.message}`,
                    );
                }
            }

            if (errors.length > 0) {
                return { isValid: false, errors };
            }

            // Get from wallet balance (only for database wallets)
            if (!isWeb3AuthWallet) {
                fromBalance = await this.walletBalanceRepository.findOne({
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
            } else {
                // For Web3Auth wallets, we skip database balance validation
                // The actual balance will be checked during blockchain execution
                this.logger.debug(`Skipping database balance validation for Web3Auth wallet: ${transferRequest.fromAddress}`);
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
                isExternalAddress,
                isWeb3AuthWallet,
                web3AuthFromAddress: isWeb3AuthWallet ? transferRequest.fromAddress : undefined,
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
                // Ensure recipient has token account (only for internal users)
                if (!validation.isExternalAddress) {
                    await this.tokenAccountService.ensureTokenAccountExists(
                        transferRequest.toAddress,
                        transferRequest.tokenType,
                    );
                }

                // Execute the transfer based on token type
                if (transferRequest.tokenType === TokenType.SOL) {
                    const transaction =
                        await this.solanaTransferService.createSOLTransferTransaction(
                            transferRequest.fromAddress,
                            transferRequest.toAddress,
                            transferRequest.amount,
                            transferRequest.memo,
                        );
                    this.logger.debug(
                        `Creating fromPubkey for SOL transfer: "${transferRequest.fromAddress}"`,
                    );
                    const fromPubkey = new PublicKey(
                        transferRequest.fromAddress,
                    );
                    this.logger.debug(
                        `FromPubkey created successfully: ${fromPubkey.toString()}`,
                    );

                    // Always use Web3Auth Node SDK backend signing
                    this.logger.debug(
                        `Using Web3Auth Node SDK backend signing for SOL transfer`,
                    );
                    return await this.signAndSendWithWeb3AuthNode(
                        transaction,
                        fromPubkey,
                        transferRequest.userId,
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
                    this.logger.debug(
                        `Creating fromPubkey for SPL transfer: "${transferRequest.fromAddress}"`,
                    );
                    const fromPubkey = new PublicKey(
                        transferRequest.fromAddress,
                    );
                    this.logger.debug(
                        `FromPubkey created successfully: ${fromPubkey.toString()}`,
                    );

                    // Always use Web3Auth Node SDK backend signing
                    this.logger.debug(
                        `Using Web3Auth Node SDK backend signing for SPL transfer`,
                    );
                    return await this.signAndSendWithWeb3AuthNode(
                        transaction,
                        fromPubkey,
                        transferRequest.userId,
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
                await new Promise((resolve) =>
                    setTimeout(resolve, retryDelay * attempt),
                );
            }
        }
    }

    /**
     * Sign and send transaction using Web3Auth Node SDK
     */
    private async signAndSendWithWeb3AuthNode(
        transaction: any,
        fromPubkey: PublicKey,
        userId: string,
    ): Promise<any> {
        try {
            this.logger.debug(
                `Signing transaction with Web3Auth Node SDK for address: ${fromPubkey.toString()}`,
            );

            // Validate network consistency
            await this.validateNetworkConsistency();

            // Ensure transaction has recentBlockhash before signing
            const connection = this.solanaConnectionService.getConnection();
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;

            this.logger.debug(
                `Transaction prepared with blockhash: ${blockhash}`,
            );

            // Initialize the Web3Auth Node signer with the userId
            await this.web3AuthNodeSigner.init({ userId });

            // Get the public key from the signer to verify it matches
            const signerPublicKey =
                await this.web3AuthNodeSigner.getPublicKey();
            this.logger.debug(
                `Signer public key: ${signerPublicKey}, Expected: ${fromPubkey.toString()}`,
            );

            // Verify the signer's public key matches the expected address
            if (signerPublicKey !== fromPubkey.toString()) {
                throw new Error(
                    `Signer public key mismatch. Expected: ${fromPubkey.toString()}, Got: ${signerPublicKey}`,
                );
            }

            // Sign the transaction using the Web3Auth Node signer
            // According to MetaMask documentation, we should pass the transaction object directly
            const signedTransactionBytes =
                await this.web3AuthNodeSigner.signTransaction(
                    transaction,
                );

            this.logger.log(
                `Transaction signed successfully with Web3Auth Node SDK`,
            );

            // Send the signed transaction to the blockchain
            try {
                const signature = await connection.sendRawTransaction(
                    signedTransactionBytes,
                    {
                        skipPreflight: false,
                        preflightCommitment: 'processed',
                    },
                );

                this.logger.log(
                    `Transaction sent to blockchain with signature: ${signature}`,
                );

                return {
                    signature: signature,
                    transaction,
                    success: true,
                };
            } catch (error) {
                this.logger.error(
                    `Failed to send signed transaction to blockchain: ${error.message}`,
                );
                throw error;
            }
        } catch (error) {
            this.logger.error(
                `Web3Auth Node SDK signing failed: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Validate network consistency between Web3Auth SDK and Solana RPC
     */
    private async validateNetworkConsistency(): Promise<void> {
        const web3authNetwork =
            this.configService.get<string>('WEB3AUTH_NETWORK');
        const solanaNetwork = this.configService.get<string>('SOLANA_NETWORK');

        this.logger.debug(
            `Validating network consistency: Web3Auth=${web3authNetwork}, Solana=${solanaNetwork}`,
        );

        // Map Web3Auth networks to Solana networks
        const networkMapping: Record<string, string> = {
            sapphire_devnet: 'devnet',
            sapphire_mainnet: 'mainnet-beta',
            sapphire_testnet: 'testnet',
        };

        const expectedSolanaNetwork = web3authNetwork
            ? networkMapping[web3authNetwork]
            : undefined;

        if (expectedSolanaNetwork && expectedSolanaNetwork !== solanaNetwork) {
            const errorMessage = `Network mismatch: Web3Auth SDK is configured for ${web3authNetwork} (expects Solana ${expectedSolanaNetwork}) but Solana RPC is configured for ${solanaNetwork}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        this.logger.debug('Network consistency validation passed');
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
        validation: TransferValidation,
    ): Promise<Transaction> {
        // For external addresses, we need to handle recipient fields differently
        let recipientId: string;
        let recipientWalletId: string;

        if (validation.isExternalAddress) {
            // For external addresses, use special UUIDs and store the address in description
            recipientId = EXTERNAL_ADDRESS_USER_ID;
            recipientWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        } else {
            // For internal addresses, use the resolved user and wallet IDs
            if (!validation.toWallet) {
                throw new Error('To wallet not found for internal address');
            }
            recipientId = validation.toWallet.userId;
            recipientWalletId = validation.toWallet.id;
        }

        // Create description that includes external address if applicable
        let description = transferRequest.memo || '';
        if (validation.isExternalAddress) {
            description = `External transfer to ${transferRequest.toAddress}${description ? ` - ${description}` : ''}`;
        }

        // Create transaction with appropriate fields based on address type
        const transactionData: any = {
            senderId: transferRequest.userId,
            recipientId: recipientId,
            amount: this.convertToSmallestUnits(
                transferRequest.amount,
                transferRequest.tokenType,
            ),
            tokenType: transferRequest.tokenType,
            status: TransactionStatus.PENDING,
            description: description,
        };

        // Handle sender wallet ID
        if (validation.isWeb3AuthWallet) {
            // For Web3Auth wallets, use the special external wallet ID
            // since the wallet doesn't exist in our database
            transactionData.senderWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        } else if (validation.fromWallet?.id) {
            // For database wallets, use the actual wallet ID
            transactionData.senderWalletId = validation.fromWallet.id;
        } else {
            // Fallback to external wallet ID if no wallet found
            transactionData.senderWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        }

        // Handle recipient wallet ID
        if (validation.isExternalAddress) {
            // For external addresses, use the special external wallet ID
            transactionData.recipientWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        } else if (recipientWalletId) {
            // For internal addresses, use the actual wallet ID
            transactionData.recipientWalletId = recipientWalletId;
        } else {
            // Fallback to external wallet ID if no wallet found
            transactionData.recipientWalletId = EXTERNAL_ADDRESS_WALLET_ID;
        }

        const transaction = queryRunner.manager.create(
            Transaction,
            transactionData,
        );

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

        // Update to wallet balance (only for internal users)
        if (!validation.isExternalAddress) {
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
