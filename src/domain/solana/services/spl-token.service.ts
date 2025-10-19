import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    Connection,
    PublicKey,
    AccountInfo,
    ParsedAccountData,
    ParsedTransactionWithMeta,
    ParsedInstruction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createTransferInstruction,
} from '@solana/spl-token';
import {} from '@solana/spl-token';
import { SolanaConnectionService } from './solana-connection.service';
import { SolanaConfig } from '../../../config/solana.config';
import { TokenBalance, TokenAccount, TransferTokenParams } from '../dto';

@Injectable()
export class SplTokenService {
    private readonly logger = new Logger(SplTokenService.name);
    private readonly config: SolanaConfig;

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly configService: ConfigService,
    ) {
        this.config = this.configService.get<SolanaConfig>('solana')!;
    }

    /**
     * Get token balance for a specific mint
     * @param walletAddress - Wallet address
     * @param mintAddress - Token mint address
     * @returns Token balance information
     */
    async getTokenBalance(
        walletAddress: string,
        mintAddress: string,
    ): Promise<TokenBalance | null> {
        try {
            const connection = this.connectionService.getConnection();
            const walletPublicKey = new PublicKey(walletAddress);
            const mintPublicKey = new PublicKey(mintAddress);

            // Get the associated token account address
            const tokenAccountAddress = await getAssociatedTokenAddress(
                mintPublicKey,
                walletPublicKey,
            );

            try {
                const accountInfo =
                    await connection.getParsedAccountInfo(tokenAccountAddress);

                if (!accountInfo.value || !accountInfo.value.data) {
                    return null;
                }

                const parsedData = accountInfo.value.data as ParsedAccountData;
                const tokenInfo = parsedData.parsed.info;

                return {
                    mint: mintAddress,
                    amount: Number(tokenInfo.tokenAmount.amount),
                    decimals: tokenInfo.tokenAmount.decimals,
                    uiAmount: Number(tokenInfo.tokenAmount.uiAmount),
                    tokenProgram: accountInfo.value.owner.toString(),
                    owner: walletAddress,
                };
            } catch (error) {
                // Token account doesn't exist
                this.logger.debug(
                    `Token account not found for ${walletAddress} and mint ${mintAddress}`,
                );
                return null;
            }
        } catch (error) {
            this.logger.error(
                `Failed to get token balance for ${walletAddress}`,
                error,
            );
            throw new BadRequestException('Failed to fetch token balance');
        }
    }

    /**
     * Get all token balances for a wallet
     * @param walletAddress - Wallet address
     * @returns Array of token balances
     */
    async getAllTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
        try {
            const connection = this.connectionService.getConnection();
            const walletPublicKey = new PublicKey(walletAddress);

            // Get all token accounts for the wallet
            const tokenAccounts =
                await connection.getParsedTokenAccountsByOwner(
                    walletPublicKey,
                    {
                        programId: TOKEN_PROGRAM_ID,
                    },
                );

            const balances: TokenBalance[] = [];

            for (const { pubkey, account } of tokenAccounts.value) {
                const parsedData = account.data;
                const tokenInfo = parsedData.parsed.info;

                balances.push({
                    mint: tokenInfo.mint,
                    amount: Number(tokenInfo.tokenAmount.amount),
                    decimals: tokenInfo.tokenAmount.decimals,
                    uiAmount: Number(tokenInfo.tokenAmount.uiAmount),
                    tokenProgram: account.owner.toString(),
                    owner: walletAddress,
                });
            }

            return balances;
        } catch (error) {
            this.logger.error(
                `Failed to get all token balances for ${walletAddress}`,
                error,
            );
            throw new BadRequestException('Failed to fetch token balances');
        }
    }

    /**
     * Get token account information
     * @param tokenAccountAddress - Token account address
     * @returns Token account information
     */
    async getTokenAccountInfo(
        tokenAccountAddress: string,
    ): Promise<TokenAccount | null> {
        try {
            const connection = this.connectionService.getConnection();
            const publicKey = new PublicKey(tokenAccountAddress);

            const accountInfo =
                await connection.getParsedAccountInfo(publicKey);

            if (!accountInfo.value || !accountInfo.value.data) {
                return null;
            }

            const parsedData = accountInfo.value.data as ParsedAccountData;
            const tokenInfo = parsedData.parsed.info;

            return {
                address: tokenAccountAddress,
                mint: tokenInfo.mint,
                owner: tokenInfo.owner,
                amount: Number(tokenInfo.tokenAmount.amount),
                decimals: tokenInfo.tokenAmount.decimals,
                uiAmount: Number(tokenInfo.tokenAmount.uiAmount),
            };
        } catch (error) {
            this.logger.error(
                `Failed to get token account info for ${tokenAccountAddress}`,
                error,
            );
            return null;
        }
    }

    /**
     * Create transfer instruction for SPL tokens
     * @param params - Transfer parameters
     * @returns Transfer instruction
     */
    async createTransferInstruction(params: TransferTokenParams) {
        try {
            const connection = this.connectionService.getConnection();

            // Get source and destination token accounts
            const sourceTokenAccount = await getAssociatedTokenAddress(
                params.mint,
                params.from,
            );
            const destinationTokenAccount = await getAssociatedTokenAddress(
                params.mint,
                params.to,
            );

            // Create transfer instruction
            const transferInstruction = createTransferInstruction(
                sourceTokenAccount,
                destinationTokenAccount,
                params.from,
                params.amount,
            );

            return transferInstruction;
        } catch (error) {
            this.logger.error('Failed to create transfer instruction', error);
            throw new BadRequestException(
                'Failed to create transfer instruction',
            );
        }
    }

    /**
     * Get token mint information
     * @param mintAddress - Token mint address
     * @returns Mint information
     */
    async getMintInfo(
        mintAddress: string,
    ): Promise<{ decimals: number; supply: number } | null> {
        try {
            const connection = this.connectionService.getConnection();
            const mintPublicKey = new PublicKey(mintAddress);

            const mintInfo =
                await connection.getParsedAccountInfo(mintPublicKey);

            if (!mintInfo.value || !mintInfo.value.data) {
                return null;
            }

            const parsedData = mintInfo.value.data as ParsedAccountData;
            const mintData = parsedData.parsed.info;

            return {
                decimals: mintData.decimals,
                supply: Number(mintData.supply),
            };
        } catch (error) {
            this.logger.error(
                `Failed to get mint info for ${mintAddress}`,
                error,
            );
            throw new BadRequestException('Failed to fetch mint information');
        }
    }

    /**
     * Get token mint address for supported tokens
     * @param tokenType - Token type (USDC, EURC, SOL)
     * @returns Mint address
     */
    getTokenMintAddress(tokenType: 'USDC' | 'EURC' | 'SOL'): string {
        switch (tokenType) {
            case 'USDC':
                return this.config.tokenMints.USDC;
            case 'EURC':
                return this.config.tokenMints.EURC;
            case 'SOL':
                return this.config.tokenMints.SOL;
            default:
                throw new BadRequestException(
                    `Unsupported token type: ${tokenType}`,
                );
        }
    }

    /**
     * Convert token amount to proper units based on decimals
     * @param amount - Amount in UI units
     * @param decimals - Token decimals
     * @returns Amount in token units
     */
    convertToTokenUnits(amount: number, decimals: number): number {
        return Math.floor(amount * Math.pow(10, decimals));
    }

    /**
     * Convert token units to UI units based on decimals
     * @param amount - Amount in token units
     * @param decimals - Token decimals
     * @returns Amount in UI units
     */
    convertToUIUnits(amount: number, decimals: number): number {
        return amount / Math.pow(10, decimals);
    }

    /**
     * Get token transaction history
     * @param walletAddress - Wallet address
     * @param mintAddress - Token mint address (optional)
     * @param limit - Number of transactions to fetch
     * @returns Array of token transactions
     */
    async getTokenTransactionHistory(
        walletAddress: string,
        mintAddress?: string,
        limit: number = 10,
    ): Promise<ParsedTransactionWithMeta[]> {
        try {
            const connection = this.connectionService.getConnection();
            const walletPublicKey = new PublicKey(walletAddress);

            // Get transaction signatures
            const signatures = await connection.getSignaturesForAddress(
                walletPublicKey,
                { limit },
            );

            // Get transaction details
            const transactions = await connection.getParsedTransactions(
                signatures.map((s) => s.signature),
                {
                    maxSupportedTransactionVersion: 0,
                },
            );

            // Filter for token transactions if mint is specified
            if (mintAddress) {
                return transactions.filter(
                    (tx): tx is ParsedTransactionWithMeta => {
                        if (!tx) return false;
                        return (
                            (tx.meta?.postTokenBalances?.some(
                                (balance) => balance.mint === mintAddress,
                            ) ??
                                false) ||
                            (tx.meta?.preTokenBalances?.some(
                                (balance) => balance.mint === mintAddress,
                            ) ??
                                false)
                        );
                    },
                );
            }

            return transactions.filter(
                (tx): tx is ParsedTransactionWithMeta => tx !== null,
            );
        } catch (error) {
            this.logger.error(
                `Failed to get token transaction history for ${walletAddress}`,
                error,
            );
            throw new BadRequestException(
                'Failed to fetch transaction history',
            );
        }
    }
}
