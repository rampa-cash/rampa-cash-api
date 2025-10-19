import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    Token,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { SolanaConnectionService } from './solana-connection.service';
import { TokenType, TOKEN_DECIMALS } from '../../common/enums/token-type.enum';
import { TokenConfigService } from '../../common/services/token-config.service';

export interface TransferResult {
    signature: string;
    transaction: Transaction;
    success: boolean;
    error?: string;
}

export interface TransferParams {
    fromAddress: string;
    toAddress: string;
    amount: number;
    tokenType: TokenType;
    memo?: string;
}

@Injectable()
export class SolanaTransferService {
    private readonly logger = new Logger(SolanaTransferService.name);

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly tokenConfigService: TokenConfigService,
    ) {}

    /**
     * Create a SOL transfer transaction
     * @param fromAddress - Sender's wallet address
     * @param toAddress - Recipient's wallet address
     * @param amount - Amount in SOL (not lamports)
     * @param memo - Optional memo
     * @returns Transfer transaction
     */
    async createSOLTransferTransaction(
        fromAddress: string,
        toAddress: string,
        amount: number,
        memo?: string,
    ): Promise<Transaction> {
        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(toAddress);

        // Convert SOL to lamports
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

        if (lamports <= 0) {
            throw new BadRequestException(
                'Transfer amount must be greater than 0',
            );
        }

        const transaction = new Transaction();

        // Add SOL transfer instruction
        const transferInstruction = SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
        });

        transaction.add(transferInstruction);

        // Add memo if provided
        if (memo) {
            const memoInstruction = new TransactionInstruction({
                keys: [],
                programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
                data: Buffer.from(memo, 'utf8'),
            });
            transaction.add(memoInstruction);
        }

        return transaction;
    }

    /**
     * Create an SPL token transfer transaction
     * @param fromAddress - Sender's wallet address
     * @param toAddress - Recipient's wallet address
     * @param amount - Amount in token units (not smallest units)
     * @param tokenType - Token type (USDC, EURC)
     * @param memo - Optional memo
     * @returns Transfer transaction
     */
    async createSPLTokenTransferTransaction(
        fromAddress: string,
        toAddress: string,
        amount: number,
        tokenType: TokenType,
        memo?: string,
    ): Promise<Transaction> {
        if (tokenType === TokenType.SOL) {
            throw new BadRequestException(
                'Use createSOLTransferTransaction for SOL transfers',
            );
        }

        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(toAddress);
        const mintAddress = new PublicKey(
            this.tokenConfigService.getTokenMintAddress(tokenType),
        );

        // Convert amount to smallest units
        const decimals = TOKEN_DECIMALS[tokenType];
        const amountInSmallestUnits = Math.floor(
            amount * Math.pow(10, decimals),
        );

        if (amountInSmallestUnits <= 0) {
            throw new BadRequestException(
                'Transfer amount must be greater than 0',
            );
        }

        const transaction = new Transaction();

        // Get source token account
        const sourceTokenAccount = await Token.getAssociatedTokenAddress(
            mintAddress,
            fromPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        // Get destination token account
        const destinationTokenAccount = await Token.getAssociatedTokenAddress(
            mintAddress,
            toPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        // Check if destination token account exists, create if not
        const connection = this.connectionService.getConnection();
        const destinationAccountInfo = await connection.getAccountInfo(
            destinationTokenAccount,
        );

        if (!destinationAccountInfo) {
            // Create ATA for recipient
            const createATAInstruction =
                Token.createAssociatedTokenAccountInstruction(
                    fromPubkey, // payer
                    destinationTokenAccount, // ata
                    toPubkey, // owner
                    mintAddress, // mint
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                );
            transaction.add(createATAInstruction);
        }

        // Add token transfer instruction
        const transferInstruction = Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            sourceTokenAccount, // source
            destinationTokenAccount, // destination
            fromPubkey, // owner
            [],
            amountInSmallestUnits, // amount
        );

        transaction.add(transferInstruction);

        // Add memo if provided
        if (memo) {
            const memoInstruction = new TransactionInstruction({
                keys: [],
                programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
                data: Buffer.from(memo, 'utf8'),
            });
            transaction.add(memoInstruction);
        }

        return transaction;
    }

    /**
     * Create a transfer transaction for any token type
     * @param params - Transfer parameters
     * @returns Transfer transaction
     */
    async createTransferTransaction(
        params: TransferParams,
    ): Promise<Transaction> {
        const { fromAddress, toAddress, amount, tokenType, memo } = params;

        if (tokenType === TokenType.SOL) {
            return this.createSOLTransferTransaction(
                fromAddress,
                toAddress,
                amount,
                memo,
            );
        } else {
            return this.createSPLTokenTransferTransaction(
                fromAddress,
                toAddress,
                amount,
                tokenType,
                memo,
            );
        }
    }

    /**
     * Sign and send a transaction
     * @param transaction - Transaction to sign and send
     * @param signer - Signer's public key
     * @returns Transfer result
     */
    async signAndSendTransaction(
        transaction: Transaction,
        signer: PublicKey,
    ): Promise<TransferResult> {
        try {
            const connection = this.connectionService.getConnection();

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = signer;

            // Note: In a real implementation, you would need to sign the transaction
            // This is a placeholder - the actual signing would be done by the wallet
            this.logger.log(
                `Transaction prepared for signing by ${signer.toString()}`,
            );

            // For now, we'll return a mock signature
            // In production, this would be the actual transaction signature
            const mockSignature = 'mock_signature_' + Date.now();

            return {
                signature: mockSignature,
                transaction,
                success: true,
            };
        } catch (error) {
            this.logger.error(
                `Failed to sign and send transaction: ${error.message}`,
            );
            return {
                signature: '',
                transaction,
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Estimate transaction fee
     * @param transaction - Transaction to estimate
     * @returns Estimated fee in lamports
     */
    async estimateTransactionFee(transaction: Transaction): Promise<number> {
        try {
            const connection = this.connectionService.getConnection();
            const feeResponse = await connection.getFeeForMessage(
                transaction.compileMessage(),
            );
            return feeResponse.value || 5000; // Default fee if estimation fails
        } catch (error) {
            this.logger.warn(
                `Failed to estimate transaction fee: ${error.message}`,
            );
            return 5000; // Default fee
        }
    }

    /**
     * Check if a transaction is confirmed
     * @param signature - Transaction signature
     * @returns True if confirmed, false otherwise
     */
    async isTransactionConfirmed(signature: string): Promise<boolean> {
        try {
            const connection = this.connectionService.getConnection();
            const status = await connection.getSignatureStatus(signature);
            return (
                status?.value?.confirmationStatus === 'confirmed' ||
                status?.value?.confirmationStatus === 'finalized'
            );
        } catch (error) {
            this.logger.warn(
                `Failed to check transaction confirmation: ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Get transaction details
     * @param signature - Transaction signature
     * @returns Transaction details or null if not found
     */
    async getTransactionDetails(signature: string): Promise<any> {
        try {
            const connection = this.connectionService.getConnection();
            return await connection.getTransaction(signature);
        } catch (error) {
            this.logger.warn(
                `Failed to get transaction details: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * Validate transfer parameters
     * @param params - Transfer parameters
     * @throws BadRequestException if parameters are invalid
     */
    validateTransferParams(params: TransferParams): void {
        const { fromAddress, toAddress, amount, tokenType } = params;

        // Validate addresses
        try {
            new PublicKey(fromAddress);
            new PublicKey(toAddress);
        } catch (error) {
            throw new BadRequestException('Invalid wallet address format');
        }

        // Validate amount
        if (amount <= 0) {
            throw new BadRequestException(
                'Transfer amount must be greater than 0',
            );
        }

        // Validate token type
        if (!Object.values(TokenType).includes(tokenType)) {
            throw new BadRequestException('Invalid token type');
        }

        // Check if sending to self
        if (fromAddress === toAddress) {
            throw new BadRequestException('Cannot send to the same address');
        }
    }
}
