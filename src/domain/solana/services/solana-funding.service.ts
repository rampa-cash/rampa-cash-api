import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    PublicKey,
    LAMPORTS_PER_SOL,
    Keypair,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getMint,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    getAccount,
} from '@solana/spl-token';
import { SolanaConnectionService } from './solana-connection.service';
import { TokenConfigService } from '../../common/services/token-config.service';
import { TokenType } from '../../common/enums/token-type.enum';
import { SolanaConfig } from '../../../config/solana.config';

export interface FundingResult {
    success: boolean;
    transactionSignature?: string;
    amount: number;
    tokenType: string;
    walletAddress: string;
    message: string;
    error?: string;
}

@Injectable()
export class SolanaFundingService {
    private readonly logger = new Logger(SolanaFundingService.name);
    private readonly config: SolanaConfig;
    private readonly adminKeypair: Keypair;

    constructor(
        private configService: ConfigService,
        private connectionService: SolanaConnectionService,
        private tokenConfigService: TokenConfigService,
    ) {
        this.config = this.configService.get<SolanaConfig>('solana')!;

        // For testing purposes, we'll use a generated keypair
        // In production, this should be loaded from secure storage
        this.adminKeypair = Keypair.generate();
        this.logger.warn(
            `Using generated admin keypair for testing: ${this.adminKeypair.publicKey.toString()}`,
        );
    }

    /**
     * Fund a wallet with SOL using airdrop (devnet/testnet only)
     * @param walletAddress - Target wallet address
     * @param amount - Amount in SOL (default: 1 SOL)
     * @returns Funding result
     */
    async fundWithSol(
        walletAddress: string,
        amount: number = 1,
    ): Promise<FundingResult> {
        try {
            this.logger.log(
                `Funding wallet ${walletAddress} with ${amount} SOL`,
            );

            // Validate address
            if (!this.isValidAddress(walletAddress)) {
                throw new BadRequestException('Invalid wallet address');
            }

            // Check if we're on devnet/testnet (airdrop only works on these networks)
            if (this.config.network === 'mainnet-beta') {
                throw new BadRequestException(
                    'SOL airdrop is only available on devnet/testnet',
                );
            }

            const publicKey = new PublicKey(walletAddress);
            const connection = this.connectionService.getConnection();
            const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

            // Request airdrop
            const signature = await connection.requestAirdrop(
                publicKey,
                lamports,
            );

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed');

            this.logger.log(
                `Successfully funded ${walletAddress} with ${amount} SOL. Signature: ${signature}`,
            );

            return {
                success: true,
                transactionSignature: signature,
                amount,
                tokenType: 'SOL',
                walletAddress,
                message: `Successfully funded wallet with ${amount} SOL`,
            };
        } catch (error) {
            this.logger.error(
                `Failed to fund wallet ${walletAddress} with SOL:`,
                error,
            );
            return {
                success: false,
                amount,
                tokenType: 'SOL',
                walletAddress,
                message: 'Failed to fund wallet with SOL',
                error: error.message,
            };
        }
    }

    /**
     * Fund a wallet with SPL tokens (USDC/EURC)
     * Note: This requires mint authority - only works if admin has mint authority
     * @param walletAddress - Target wallet address
     * @param tokenType - Token type (USDC/EURC)
     * @param amount - Amount in tokens (default: 100)
     * @returns Funding result
     */
    async fundWithSplToken(
        walletAddress: string,
        tokenType: TokenType.USDC | TokenType.EURC,
        amount: number = 100,
    ): Promise<FundingResult> {
        try {
            this.logger.log(
                `Funding wallet ${walletAddress} with ${amount} ${tokenType}`,
            );

            // Validate address
            if (!this.isValidAddress(walletAddress)) {
                throw new BadRequestException('Invalid wallet address');
            }

            const connection = this.connectionService.getConnection();
            const mintAddress =
                this.tokenConfigService.getTokenMintAddress(tokenType);
            const mintPublicKey = new PublicKey(mintAddress);
            const walletPublicKey = new PublicKey(walletAddress);

            // Get mint info to determine decimals
            const mintInfo = await getMint(connection, mintPublicKey);
            const decimals = mintInfo.decimals;
            const amountInSmallestUnit = Math.floor(
                amount * Math.pow(10, decimals),
            );

            // Get associated token account address
            const tokenAccountAddress = await getAssociatedTokenAddress(
                mintPublicKey,
                walletPublicKey,
            );

            // Check if token account exists, create if not
            let tokenAccount;
            try {
                tokenAccount = await getAccount(
                    connection,
                    tokenAccountAddress,
                );
            } catch (error) {
                // Token account doesn't exist, create it
                const transaction = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        this.adminKeypair.publicKey, // payer
                        tokenAccountAddress, // associated token account
                        walletPublicKey, // owner
                        mintPublicKey, // mint
                    ),
                );
                await sendAndConfirmTransaction(connection, transaction, [
                    this.adminKeypair,
                ]);
                tokenAccount = await getAccount(
                    connection,
                    tokenAccountAddress,
                );
            }

            // Mint tokens to the account
            const mintTransaction = new Transaction().add(
                createMintToInstruction(
                    mintPublicKey,
                    tokenAccountAddress,
                    this.adminKeypair.publicKey, // mint authority
                    amountInSmallestUnit,
                ),
            );

            const signature = await sendAndConfirmTransaction(
                connection,
                mintTransaction,
                [this.adminKeypair],
            );

            this.logger.log(
                `Successfully funded ${walletAddress} with ${amount} ${tokenType}. Signature: ${signature}`,
            );

            return {
                success: true,
                transactionSignature: signature,
                amount,
                tokenType,
                walletAddress,
                message: `Successfully funded wallet with ${amount} ${tokenType}`,
            };
        } catch (error) {
            this.logger.error(
                `Failed to fund wallet ${walletAddress} with ${tokenType}:`,
                error,
            );
            return {
                success: false,
                amount,
                tokenType,
                walletAddress,
                message: `Failed to fund wallet with ${tokenType}`,
                error: error.message,
            };
        }
    }

    /**
     * Fund a wallet with multiple tokens
     * @param walletAddress - Target wallet address
     * @param tokens - Array of token types and amounts
     * @returns Array of funding results
     */
    async fundWithMultipleTokens(
        walletAddress: string,
        tokens: Array<{ tokenType: TokenType; amount: number }>,
    ): Promise<FundingResult[]> {
        const results: FundingResult[] = [];

        for (const token of tokens) {
            if (token.tokenType === TokenType.SOL) {
                const result = await this.fundWithSol(
                    walletAddress,
                    token.amount,
                );
                results.push(result);
            } else if (
                token.tokenType === TokenType.USDC ||
                token.tokenType === TokenType.EURC
            ) {
                const result = await this.fundWithSplToken(
                    walletAddress,
                    token.tokenType,
                    token.amount,
                );
                results.push(result);
            } else {
                results.push({
                    success: false,
                    amount: token.amount,
                    tokenType: token.tokenType,
                    walletAddress,
                    message: `Unsupported token type: ${token.tokenType}`,
                    error: 'Unsupported token type',
                });
            }
        }

        return results;
    }

    /**
     * Get the admin public key (for reference)
     */
    getAdminPublicKey(): string {
        return this.adminKeypair.publicKey.toString();
    }

    /**
     * Validate Solana address format
     */
    private isValidAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }
}
