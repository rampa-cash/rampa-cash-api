import { Injectable, Logger } from '@nestjs/common';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {} from '@solana/spl-token';
import { SolanaConnectionService } from './solana-connection.service';
import { TokenType } from '../../common/enums/token-type.enum';
import { TokenConfigService } from '../../common/services/token-config.service';

export interface TokenAccountInfo {
    address: PublicKey;
    mint: PublicKey;
    owner: PublicKey;
    amount: bigint;
    decimals: number;
    exists: boolean;
}

@Injectable()
export class TokenAccountService {
    private readonly logger = new Logger(TokenAccountService.name);

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly tokenConfigService: TokenConfigService,
    ) {}

    /**
     * Get the Associated Token Account address for a wallet and token
     * @param walletAddress - Wallet address
     * @param tokenType - Token type (USDC, EURC, SOL)
     * @returns ATA address
     */
    async getTokenAccountAddress(
        walletAddress: string,
        tokenType: TokenType,
    ): Promise<PublicKey> {
        const walletPubkey = new PublicKey(walletAddress);
        const mintAddress = new PublicKey(
            this.tokenConfigService.getTokenMintAddress(tokenType),
        );

        return getAssociatedTokenAddress(mintAddress, walletPubkey);
    }

    /**
     * Check if an Associated Token Account exists
     * @param walletAddress - Wallet address
     * @param tokenType - Token type
     * @returns True if ATA exists, false otherwise
     */
    async tokenAccountExists(
        walletAddress: string,
        tokenType: TokenType,
    ): Promise<boolean> {
        try {
            const ataAddress = await this.getTokenAccountAddress(
                walletAddress,
                tokenType,
            );
            const connection = this.connectionService.getConnection();

            const accountInfo = await connection.getAccountInfo(ataAddress);
            return accountInfo !== null;
        } catch (error) {
            this.logger.warn(
                `Error checking token account existence: ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Get token account information
     * @param walletAddress - Wallet address
     * @param tokenType - Token type
     * @returns Token account information or null if not found
     */
    async getTokenAccountInfo(
        walletAddress: string,
        tokenType: TokenType,
    ): Promise<TokenAccountInfo | null> {
        try {
            const ataAddress = await this.getTokenAccountAddress(
                walletAddress,
                tokenType,
            );
            const connection = this.connectionService.getConnection();

            const accountInfo =
                await connection.getParsedAccountInfo(ataAddress);

            if (!accountInfo.value || !accountInfo.value.data) {
                return null;
            }

            const parsedData = accountInfo.value.data as any;
            const mintAddress = new PublicKey(parsedData.parsed.info.mint);
            const ownerAddress = new PublicKey(parsedData.parsed.info.owner);
            const amount = BigInt(parsedData.parsed.info.tokenAmount.amount);

            return {
                address: ataAddress,
                mint: mintAddress,
                owner: ownerAddress,
                amount: amount,
                decimals:
                    mintAddress.toString() ===
                    this.tokenConfigService.getTokenMintAddress(TokenType.SOL)
                        ? 9
                        : 6,
                exists: true,
            };
        } catch (error) {
            this.logger.warn(`Token account not found: ${error.message}`);
            return null;
        }
    }

    /**
     * Create an Associated Token Account if it doesn't exist
     * @param walletAddress - Wallet address
     * @param tokenType - Token type
     * @param payerAddress - Address that will pay for the creation (optional, defaults to walletAddress)
     * @returns Transaction to create ATA
     */
    async createTokenAccountTransaction(
        walletAddress: string,
        tokenType: TokenType,
        payerAddress?: string,
    ): Promise<Transaction> {
        const walletPubkey = new PublicKey(walletAddress);
        const payerPubkey = payerAddress
            ? new PublicKey(payerAddress)
            : walletPubkey;
        const mintAddress = new PublicKey(
            this.tokenConfigService.getTokenMintAddress(tokenType),
        );

        const ataAddress = await this.getTokenAccountAddress(
            walletAddress,
            tokenType,
        );

        const transaction = new Transaction();

        // Add instruction to create ATA
        const createATAInstruction = createAssociatedTokenAccountInstruction(
            payerPubkey, // payer
            ataAddress, // ata
            walletPubkey, // owner
            mintAddress, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        transaction.add(createATAInstruction);

        return transaction;
    }

    /**
     * Ensure a token account exists, create if needed
     * @param walletAddress - Wallet address
     * @param tokenType - Token type
     * @param payerAddress - Address that will pay for creation (optional)
     * @returns True if account exists or was created, false if creation failed
     */
    async ensureTokenAccountExists(
        walletAddress: string,
        tokenType: TokenType,
        payerAddress?: string,
    ): Promise<boolean> {
        try {
            // Check if account already exists
            const exists = await this.tokenAccountExists(
                walletAddress,
                tokenType,
            );
            if (exists) {
                this.logger.log(
                    `Token account already exists for ${walletAddress} and ${tokenType}`,
                );
                return true;
            }

            // For now, we can't create the account without a private key
            // This would require the user's private key or a different approach
            this.logger.warn(
                `Cannot create token account for ${walletAddress} and ${tokenType} - requires private key`,
            );
            return false;
        } catch (error) {
            this.logger.error(
                `Failed to ensure token account exists: ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Get all token accounts for a wallet
     * @param walletAddress - Wallet address
     * @returns Array of token account information
     */
    async getAllTokenAccounts(
        walletAddress: string,
    ): Promise<TokenAccountInfo[]> {
        const walletPubkey = new PublicKey(walletAddress);
        const connection = this.connectionService.getConnection();

        try {
            const tokenAccounts =
                await connection.getParsedTokenAccountsByOwner(walletPubkey, {
                    programId: TOKEN_PROGRAM_ID,
                });

            const accounts: TokenAccountInfo[] = [];

            for (const { pubkey, account } of tokenAccounts.value) {
                try {
                    const parsedData = account.data as any;
                    const mintAddress = new PublicKey(
                        parsedData.parsed.info.mint,
                    );
                    const ownerAddress = new PublicKey(
                        parsedData.parsed.info.owner,
                    );
                    const amount = BigInt(
                        parsedData.parsed.info.tokenAmount.amount,
                    );

                    accounts.push({
                        address: pubkey,
                        mint: mintAddress,
                        owner: ownerAddress,
                        amount: amount,
                        decimals:
                            mintAddress.toString() ===
                            this.tokenConfigService.getTokenMintAddress(
                                TokenType.SOL,
                            )
                                ? 9
                                : 6,
                        exists: true,
                    });
                } catch (error) {
                    this.logger.warn(
                        `Error processing token account ${pubkey.toString()}: ${error.message}`,
                    );
                }
            }

            return accounts;
        } catch (error) {
            this.logger.error(
                `Failed to get token accounts for ${walletAddress}: ${error.message}`,
            );
            return [];
        }
    }

    /**
     * Get token balance for a specific token account
     * @param walletAddress - Wallet address
     * @param tokenType - Token type
     * @returns Token balance in smallest units
     */
    async getTokenBalance(
        walletAddress: string,
        tokenType: TokenType,
    ): Promise<bigint> {
        const accountInfo = await this.getTokenAccountInfo(
            walletAddress,
            tokenType,
        );
        return accountInfo ? accountInfo.amount : BigInt(0);
    }

    /**
     * Check if a wallet has any token accounts
     * @param walletAddress - Wallet address
     * @returns True if wallet has token accounts, false otherwise
     */
    async hasTokenAccounts(walletAddress: string): Promise<boolean> {
        const accounts = await this.getAllTokenAccounts(walletAddress);
        return accounts.length > 0;
    }
}
