import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { SolanaConnectionService } from './solana-connection.service';
import { SplTokenService } from './spl-token.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface TransactionBuildRequest {
    fromAddress: string;
    toAddress: string;
    amount: bigint;
    token: TokenType;
    memo?: string;
}

export interface TransactionBuildResult {
    transaction: Transaction;
    estimatedFee: number;
    requiredSignatures: string[];
}

@Injectable()
export class SolanaTransactionBuilderService {
    private readonly logger = new Logger(SolanaTransactionBuilderService.name);

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly splTokenService: SplTokenService,
    ) {}

    /**
     * Build a Solana transaction for the specified parameters
     */
    async buildTransaction(
        request: TransactionBuildRequest,
    ): Promise<TransactionBuildResult> {
        try {
            this.logger.debug(
                `Building transaction from ${request.fromAddress} to ${request.toAddress} for ${request.amount} ${request.token}`,
            );

            // Validate addresses
            if (!this.isValidAddress(request.fromAddress)) {
                throw new BadRequestException(
                    `Invalid sender address: ${request.fromAddress}`,
                );
            }

            if (!this.isValidAddress(request.toAddress)) {
                throw new BadRequestException(
                    `Invalid recipient address: ${request.toAddress}`,
                );
            }

            // Validate amount
            if (request.amount <= 0n) {
                throw new BadRequestException('Amount must be positive');
            }

            const fromPublicKey = new PublicKey(request.fromAddress);
            const toPublicKey = new PublicKey(request.toAddress);
            const transaction = new Transaction();

            let estimatedFee = 5000; // Base transaction fee in lamports

            if (request.token === TokenType.SOL) {
                // Build SOL transfer transaction
                const transferInstruction = SystemProgram.transfer({
                    fromPubkey: fromPublicKey,
                    toPubkey: toPublicKey,
                    lamports: Number(request.amount),
                });

                transaction.add(transferInstruction);
            } else {
                // Build SPL token transfer transaction
                // Note: This is a simplified implementation. In production, you'd need to:
                // 1. Get the mint address for the token
                // 2. Create proper TransferTokenParams
                // 3. Handle token account creation if needed
                this.logger.warn(
                    'SPL token transfer instruction creation is simplified for MVP',
                );
                const transferInstruction =
                    await this.splTokenService.createTransferInstruction({
                        from: fromPublicKey,
                        to: toPublicKey,
                        mint: toPublicKey, // This should be the actual mint address
                        amount: Number(request.amount),
                        decimals: 6, // Most SPL tokens have 6 decimals
                    });

                transaction.add(transferInstruction);
                estimatedFee += 5000; // Additional fee for SPL token operations
            }

            // Add memo if provided
            if (request.memo) {
                // Note: Memo instruction would be added here in a real implementation
                this.logger.debug(`Memo: ${request.memo}`);
            }

            // Get recent blockhash
            const { blockhash } = await this.connectionService
                .getConnection()
                .getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPublicKey;

            // Determine required signatures
            const requiredSignatures = [request.fromAddress];

            this.logger.log(
                `Transaction built successfully. Estimated fee: ${estimatedFee} lamports`,
            );

            return {
                transaction,
                estimatedFee,
                requiredSignatures,
            };
        } catch (error) {
            this.logger.error(
                `Failed to build transaction: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to build transaction: ${error.message}`,
            );
        }
    }

    /**
     * Estimate transaction fees for a given transaction
     */
    async estimateTransactionFee(
        request: TransactionBuildRequest,
    ): Promise<number> {
        try {
            const result = await this.buildTransaction(request);
            return result.estimatedFee;
        } catch (error) {
            this.logger.error(
                `Failed to estimate transaction fee: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to estimate transaction fee: ${error.message}`,
            );
        }
    }

    /**
     * Validate if an address is a valid Solana address
     */
    private isValidAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get transaction size in bytes
     */
    async getTransactionSize(
        request: TransactionBuildRequest,
    ): Promise<number> {
        try {
            const result = await this.buildTransaction(request);
            return result.transaction.serialize({ requireAllSignatures: false })
                .length;
        } catch (error) {
            this.logger.error(
                `Failed to get transaction size: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to get transaction size: ${error.message}`,
            );
        }
    }

    /**
     * Check if transaction would exceed size limits
     */
    async validateTransactionSize(
        request: TransactionBuildRequest,
    ): Promise<boolean> {
        try {
            const size = await this.getTransactionSize(request);
            const maxSize = 1232; // Solana transaction size limit
            return size <= maxSize;
        } catch (error) {
            this.logger.error(
                `Failed to validate transaction size: ${error.message}`,
                error.stack,
            );
            return false;
        }
    }
}
