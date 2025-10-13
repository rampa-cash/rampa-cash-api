import {
    Transaction,
    TransactionInstruction,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Logger } from '@nestjs/common';

export interface TransactionResult {
    signature: string;
    slot: number;
    blockTime: number | null;
    confirmationStatus: 'processed' | 'confirmed' | 'finalized';
    err: any;
}

export interface TransferParams {
    from: PublicKey;
    to: PublicKey;
    amount: number; // in lamports for SOL, in token units for SPL tokens
    memo?: string;
}

export class TransactionUtils {
    private static readonly logger = new Logger(TransactionUtils.name);

    /**
     * Creates a SOL transfer transaction
     * @param params - Transfer parameters
     * @returns Transaction object ready for signing
     */
    static createSolTransferTransaction(params: TransferParams): Transaction {
        try {
            const transaction = new Transaction();

            // Add transfer instruction
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: params.from,
                toPubkey: params.to,
                lamports: params.amount,
            });

            transaction.add(transferInstruction);

            // Add memo if provided
            if (params.memo) {
                const memoInstruction = new TransactionInstruction({
                    keys: [],
                    programId: new PublicKey(
                        'MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2',
                    ),
                    data: Buffer.from(params.memo, 'utf8'),
                });
                transaction.add(memoInstruction);
            }

            this.logger.debug(
                `Created SOL transfer transaction: ${params.amount} lamports from ${params.from.toBase58()} to ${params.to.toBase58()}`,
            );
            return transaction;
        } catch (error) {
            this.logger.error(
                'Failed to create SOL transfer transaction',
                error,
            );
            throw error;
        }
    }

    /**
     * Serializes a transaction to base64 string
     * @param transaction - Transaction to serialize
     * @returns Base64 encoded transaction
     */
    static serializeTransaction(transaction: Transaction): string {
        try {
            return transaction
                .serialize({ requireAllSignatures: false })
                .toString('base64');
        } catch (error) {
            this.logger.error('Failed to serialize transaction', error);
            throw error;
        }
    }

    /**
     * Deserializes a transaction from base64 string
     * @param serializedTransaction - Base64 encoded transaction
     * @returns Transaction object
     */
    static deserializeTransaction(serializedTransaction: string): Transaction {
        try {
            const buffer = Buffer.from(serializedTransaction, 'base64');
            return Transaction.from(buffer);
        } catch (error) {
            this.logger.error('Failed to deserialize transaction', error);
            throw error;
        }
    }

    /**
     * Converts SOL amount to lamports
     * @param solAmount - Amount in SOL
     * @returns Amount in lamports
     */
    static solToLamports(solAmount: number): number {
        return Math.floor(solAmount * LAMPORTS_PER_SOL);
    }

    /**
     * Converts lamports to SOL amount
     * @param lamports - Amount in lamports
     * @returns Amount in SOL
     */
    static lamportsToSol(lamports: number): number {
        return lamports / LAMPORTS_PER_SOL;
    }

    /**
     * Validates transaction parameters
     * @param params - Transfer parameters to validate
     * @throws Error if parameters are invalid
     */
    static validateTransferParams(params: TransferParams): void {
        if (!params.from || !params.to) {
            throw new Error('From and to addresses are required');
        }

        if (params.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (params.from.equals(params.to)) {
            throw new Error('Cannot transfer to the same address');
        }
    }

    /**
     * Estimates transaction fee (in lamports)
     * @param transaction - Transaction to estimate fee for
     * @returns Estimated fee in lamports
     */
    static estimateTransactionFee(transaction: Transaction): number {
        // Base fee is 5000 lamports (0.000005 SOL)
        // Additional fee for each instruction (2500 lamports per instruction)
        const baseFee = 5000;
        const instructionFee = transaction.instructions.length * 2500;
        return baseFee + instructionFee;
    }

    /**
     * Creates a transaction with proper fee payer and recent blockhash
     * @param transaction - Transaction to prepare
     * @param feePayer - PublicKey of the fee payer
     * @param recentBlockhash - Recent blockhash
     * @returns Prepared transaction
     */
    static prepareTransaction(
        transaction: Transaction,
        feePayer: PublicKey,
        recentBlockhash: string,
    ): Transaction {
        transaction.feePayer = feePayer;
        transaction.recentBlockhash = recentBlockhash;
        return transaction;
    }

    /**
     * Validates transaction signature format
     * @param signature - Transaction signature to validate
     * @returns true if valid signature format
     */
    static isValidSignature(signature: string): boolean {
        try {
            // Solana signatures are base58 encoded and typically 88 characters long
            if (!signature || typeof signature !== 'string') {
                return false;
            }

            // Basic length check
            if (signature.length !== 88) {
                return false;
            }

            // Try to decode as base58
            Buffer.from(signature, 'base64');
            return true;
        } catch (error) {
            this.logger.debug(`Invalid signature format: ${signature}`, error);
            return false;
        }
    }
}
