import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { SolanaConnectionService } from './solana-connection.service';
import { SplTokenService } from './spl-token.service';
import { AddressUtils } from '../utils/address.utils';
import {
    TransactionUtils,
    TransferParams,
    TransactionResult,
} from '../utils/transaction.utils';
import { SolanaConfig } from '../../../config/solana.config';
import { SolanaTransaction, SolanaAccountInfo, SolanaTokenBalance } from '../dto';

@Injectable()
export class SolanaService {
    private readonly logger = new Logger(SolanaService.name);
    private readonly config: SolanaConfig;

    constructor(
        private configService: ConfigService,
        private connectionService: SolanaConnectionService,
        private splTokenService: SplTokenService,
    ) {
        this.config = this.configService.get<SolanaConfig>('solana')!;
    }

    async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
        try {
            this.logger.log(`Fetching account info for address: ${address}`);

            // Validate address format
            if (!AddressUtils.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            const accountInfo =
                await this.connectionService.getAccountInfo(address);

            if (!accountInfo) {
                return null;
            }

            return {
                address: accountInfo.address,
                balance: accountInfo.balance,
                owner: accountInfo.owner,
                executable: accountInfo.executable,
                rentEpoch: accountInfo.rentEpoch,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get account info for ${address}:`,
                error,
            );
            throw new BadRequestException(
                'Failed to fetch account information',
            );
        }
    }

    async getBalance(address: string): Promise<number> {
        try {
            // Validate address format
            if (!AddressUtils.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            const balance = await this.connectionService.getBalance(address);
            return balance;
        } catch (error) {
            this.logger.error(`Failed to get balance for ${address}:`, error);
            throw new BadRequestException('Failed to fetch account balance');
        }
    }

    async getTokenBalances(address: string): Promise<SolanaTokenBalance[]> {
        try {
            this.logger.log(`Fetching token balances for address: ${address}`);

            // Validate address format
            if (!AddressUtils.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            const tokenBalances =
                await this.splTokenService.getAllTokenBalances(address);

            // Convert to SolanaTokenBalance format
            return tokenBalances.map((balance) => ({
                mint: balance.mint,
                amount: balance.amount,
                decimals: balance.decimals,
                uiAmount: balance.uiAmount,
                tokenProgram: balance.tokenProgram,
            }));
        } catch (error) {
            this.logger.error(
                `Failed to get token balances for ${address}:`,
                error,
            );
            throw new BadRequestException('Failed to fetch token balances');
        }
    }

    async sendTransaction(transaction: Transaction): Promise<string> {
        try {
            this.logger.log('Sending Solana transaction');

            const signature =
                await this.connectionService.sendTransaction(transaction);

            this.logger.log(`Transaction sent with signature: ${signature}`);
            return signature;
        } catch (error) {
            this.logger.error('Failed to send transaction:', error);
            throw new BadRequestException('Failed to send transaction');
        }
    }

    async getTransaction(signature: string): Promise<SolanaTransaction | null> {
        try {
            this.logger.log(`Fetching transaction: ${signature}`);

            // Validate signature format
            if (!TransactionUtils.isValidSignature(signature)) {
                throw new BadRequestException(
                    `Invalid transaction signature: ${signature}`,
                );
            }

            const transaction =
                await this.connectionService.getTransaction(signature);

            if (!transaction) {
                return null;
            }

            return {
                signature,
                slot: transaction.slot,
                blockTime: transaction.blockTime,
                confirmationStatus: transaction.meta?.err
                    ? 'confirmed'
                    : 'confirmed',
                err: transaction.meta?.err,
            };
        } catch (error) {
            this.logger.error(`Failed to get transaction ${signature}:`, error);
            throw new BadRequestException('Failed to fetch transaction');
        }
    }

    async confirmTransaction(
        signature: string,
        commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    ): Promise<boolean> {
        try {
            // Validate signature format
            if (!TransactionUtils.isValidSignature(signature)) {
                throw new BadRequestException(
                    `Invalid transaction signature: ${signature}`,
                );
            }

            const isConfirmed = await this.connectionService.confirmTransaction(
                signature,
                commitment,
            );
            return isConfirmed;
        } catch (error) {
            this.logger.error(
                `Failed to confirm transaction ${signature}:`,
                error,
            );
            return false;
        }
    }

    async createTransferTransaction(
        fromAddress: string,
        toAddress: string,
        amount: number,
        tokenMint?: string,
    ): Promise<Transaction> {
        try {
            this.logger.log(
                `Creating transfer transaction: ${amount} from ${fromAddress} to ${toAddress}`,
            );

            // Validate addresses
            if (!AddressUtils.isValidAddress(fromAddress)) {
                throw new BadRequestException(
                    `Invalid from address: ${fromAddress}`,
                );
            }
            if (!AddressUtils.isValidAddress(toAddress)) {
                throw new BadRequestException(
                    `Invalid to address: ${toAddress}`,
                );
            }

            const fromPublicKey =
                AddressUtils.validateAndCreatePublicKey(fromAddress);
            const toPublicKey =
                AddressUtils.validateAndCreatePublicKey(toAddress);

            // Create transfer parameters
            const transferParams: TransferParams = {
                from: fromPublicKey,
                to: toPublicKey,
                amount: tokenMint
                    ? amount
                    : TransactionUtils.solToLamports(amount),
                memo: `Transfer ${amount} ${tokenMint ? 'tokens' : 'SOL'}`,
            };

            // Create transaction
            const transaction =
                TransactionUtils.createSolTransferTransaction(transferParams);

            // Get recent blockhash
            const recentBlockhash =
                await this.connectionService.getRecentBlockhash();
            TransactionUtils.prepareTransaction(
                transaction,
                fromPublicKey,
                recentBlockhash,
            );

            return transaction;
        } catch (error) {
            this.logger.error('Failed to create transfer transaction:', error);
            throw new BadRequestException(
                'Failed to create transfer transaction',
            );
        }
    }

    estimateTransactionFee(transaction: Transaction): number {
        try {
            return TransactionUtils.estimateTransactionFee(transaction);
        } catch (error) {
            this.logger.error('Failed to estimate transaction fee:', error);
            throw new BadRequestException('Failed to estimate transaction fee');
        }
    }

    async getRecentBlockhash(): Promise<string> {
        try {
            return await this.connectionService.getRecentBlockhash();
        } catch (error) {
            this.logger.error('Failed to get recent blockhash:', error);
            throw new BadRequestException('Failed to get recent blockhash');
        }
    }

    validateAddress(address: string): boolean {
        try {
            return AddressUtils.isValidAddress(address);
        } catch (error) {
            this.logger.error(`Failed to validate address ${address}:`, error);
            return false;
        }
    }

    getNetworkInfo(): {
        network: string;
        rpcUrl: string;
        cluster: string;
    } {
        const networkInfo = this.connectionService.getNetworkInfo();
        return {
            ...networkInfo,
            cluster:
                networkInfo.network === 'mainnet-beta'
                    ? 'mainnet'
                    : networkInfo.network,
        };
    }

    /**
     * Get token balance for a specific token
     * @param walletAddress - Wallet address
     * @param tokenType - Token type (USDC, EURC, SOL)
     * @returns Token balance
     */
    async getTokenBalance(
        walletAddress: string,
        tokenType: 'USDC' | 'EURC' | 'SOL',
    ): Promise<SolanaTokenBalance | null> {
        try {
            if (tokenType === 'SOL') {
                const balance = await this.getBalance(walletAddress);
                return {
                    mint: this.config.tokenMints.SOL,
                    amount: balance,
                    decimals: 9,
                    uiAmount: TransactionUtils.lamportsToSol(balance),
                    tokenProgram: '11111111111111111111111111111111', // System Program
                };
            }

            const mintAddress =
                this.splTokenService.getTokenMintAddress(tokenType);
            const tokenBalance = await this.splTokenService.getTokenBalance(
                walletAddress,
                mintAddress,
            );

            if (!tokenBalance) {
                return null;
            }

            return {
                mint: tokenBalance.mint,
                amount: tokenBalance.amount,
                decimals: tokenBalance.decimals,
                uiAmount: tokenBalance.uiAmount,
                tokenProgram: tokenBalance.tokenProgram,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get ${tokenType} balance for ${walletAddress}:`,
                error,
            );
            throw new BadRequestException(
                `Failed to fetch ${tokenType} balance`,
            );
        }
    }

    /**
     * Create SPL token transfer transaction
     * @param fromAddress - Sender address
     * @param toAddress - Recipient address
     * @param amount - Amount to transfer
     * @param tokenType - Token type (USDC, EURC)
     * @returns Transaction object
     */
    async createTokenTransferTransaction(
        fromAddress: string,
        toAddress: string,
        amount: number,
        tokenType: 'USDC' | 'EURC',
    ): Promise<Transaction> {
        try {
            this.logger.log(
                `Creating ${tokenType} transfer transaction: ${amount} from ${fromAddress} to ${toAddress}`,
            );

            // Validate addresses
            if (!AddressUtils.isValidAddress(fromAddress)) {
                throw new BadRequestException(
                    `Invalid from address: ${fromAddress}`,
                );
            }
            if (!AddressUtils.isValidAddress(toAddress)) {
                throw new BadRequestException(
                    `Invalid to address: ${toAddress}`,
                );
            }

            const fromPublicKey =
                AddressUtils.validateAndCreatePublicKey(fromAddress);
            const toPublicKey =
                AddressUtils.validateAndCreatePublicKey(toAddress);
            const mintAddress =
                this.splTokenService.getTokenMintAddress(tokenType);
            const mintPublicKey =
                AddressUtils.validateAndCreatePublicKey(mintAddress);

            // Get token decimals
            const mintInfo =
                await this.splTokenService.getMintInfo(mintAddress);
            if (!mintInfo) {
                throw new BadRequestException(
                    `Failed to get mint info for ${tokenType}`,
                );
            }

            // Convert amount to token units
            const tokenAmount = this.splTokenService.convertToTokenUnits(
                amount,
                mintInfo.decimals,
            );

            // Create transfer instruction
            const transferInstruction =
                await this.splTokenService.createTransferInstruction({
                    from: fromPublicKey,
                    to: toPublicKey,
                    mint: mintPublicKey,
                    amount: tokenAmount,
                    decimals: mintInfo.decimals,
                });

            // Create transaction
            const transaction = new Transaction();
            transaction.add(transferInstruction);

            // Get recent blockhash and prepare transaction
            const recentBlockhash =
                await this.connectionService.getRecentBlockhash();
            TransactionUtils.prepareTransaction(
                transaction,
                fromPublicKey,
                recentBlockhash,
            );

            return transaction;
        } catch (error) {
            this.logger.error(
                `Failed to create ${tokenType} transfer transaction:`,
                error,
            );
            throw new BadRequestException(
                `Failed to create ${tokenType} transfer transaction`,
            );
        }
    }

    /**
     * Check if the Solana connection is healthy
     * @returns true if connection is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            return await this.connectionService.isHealthy();
        } catch (error) {
            this.logger.error('Solana health check failed:', error);
            return false;
        }
    }
}
