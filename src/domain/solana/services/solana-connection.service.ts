import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    Connection,
    PublicKey,
    Commitment,
    GetAccountInfoConfig,
    GetProgramAccountsConfig,
} from '@solana/web3.js';
import { SolanaConfig } from '../../../config/solana.config';
import { AccountInfo, TokenAccountInfo } from '../dto';

@Injectable()
export class SolanaConnectionService implements OnModuleInit {
    private readonly logger = new Logger(SolanaConnectionService.name);
    private connection: Connection;
    private readonly config: SolanaConfig;

    constructor(private configService: ConfigService) {
        this.config = this.configService.get<SolanaConfig>('solana')!;
    }

    async onModuleInit() {
        await this.initializeConnection();
    }

    /**
     * Initialize the Solana connection
     */
    private async initializeConnection(): Promise<void> {
        try {
            this.connection = new Connection(this.config.rpcUrl, {
                commitment: this.config.commitment,
                confirmTransactionInitialTimeout: this.config.timeout,
            });

            // Test the connection
            const version = await this.connection.getVersion();
            this.logger.log(
                `Connected to Solana ${this.config.network} network: ${version['solana-core']}`,
            );
        } catch (error) {
            this.logger.error('Failed to initialize Solana connection', error);
            throw error;
        }
    }

    /**
     * Get the Solana connection instance
     */
    getConnection(): Connection {
        if (!this.connection) {
            throw new Error('Solana connection not initialized');
        }
        return this.connection;
    }

    /**
     * Get account information
     * @param address - Account address
     * @param commitment - Commitment level
     * @returns Account information
     */
    async getAccountInfo(
        address: string,
        commitment?: Commitment,
    ): Promise<AccountInfo | null> {
        try {
            const publicKey = new PublicKey(address);
            const accountInfo = await this.connection.getAccountInfo(
                publicKey,
                commitment,
            );

            if (!accountInfo) {
                return null;
            }

            return {
                address,
                balance: accountInfo.lamports,
                owner: accountInfo.owner.toBase58(),
                executable: accountInfo.executable,
                rentEpoch: accountInfo.rentEpoch ?? 0,
                data: accountInfo.data,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get account info for ${address}`,
                error,
            );
            throw error;
        }
    }

    /**
     * Get account balance
     * @param address - Account address
     * @param commitment - Commitment level
     * @returns Balance in lamports
     */
    async getBalance(
        address: string,
        commitment?: Commitment,
    ): Promise<number> {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(
                publicKey,
                commitment,
            );
            return balance;
        } catch (error) {
            this.logger.error(`Failed to get balance for ${address}`, error);
            throw error;
        }
    }

    /**
     * Get multiple account balances
     * @param addresses - Array of account addresses
     * @param commitment - Commitment level
     * @returns Array of balances in lamports
     */
    async getMultipleBalances(
        addresses: string[],
        commitment?: Commitment,
    ): Promise<(number | null)[]> {
        try {
            const publicKeys = addresses.map((addr) => new PublicKey(addr));
            const balances = await this.connection.getMultipleAccountsInfo(
                publicKeys,
                commitment,
            );

            return balances.map((account) =>
                account ? account.lamports : null,
            );
        } catch (error) {
            this.logger.error(`Failed to get multiple balances`, error);
            throw error;
        }
    }

    /**
     * Get recent blockhash
     * @param commitment - Commitment level
     * @returns Recent blockhash
     */
    async getRecentBlockhash(commitment?: Commitment): Promise<string> {
        try {
            const { blockhash } =
                await this.connection.getLatestBlockhash(commitment);
            return blockhash;
        } catch (error) {
            this.logger.error('Failed to get recent blockhash', error);
            throw error;
        }
    }

    /**
     * Get minimum balance for rent exemption
     * @param dataLength - Length of data to store
     * @returns Minimum balance in lamports
     */
    async getMinimumBalanceForRentExemption(
        dataLength: number,
    ): Promise<number> {
        try {
            return await this.connection.getMinimumBalanceForRentExemption(
                dataLength,
            );
        } catch (error) {
            this.logger.error(
                'Failed to get minimum balance for rent exemption',
                error,
            );
            throw error;
        }
    }

    /**
     * Get transaction signature status
     * @param signature - Transaction signature
     * @param commitment - Commitment level
     * @returns Transaction status
     */
    async getSignatureStatus(
        signature: string,
        commitment?: Commitment,
    ): Promise<any> {
        try {
            const status = await this.connection.getSignatureStatus(signature, {
                searchTransactionHistory: true,
            });
            return status;
        } catch (error) {
            this.logger.error(
                `Failed to get signature status for ${signature}`,
                error,
            );
            throw error;
        }
    }

    /**
     * Get transaction details
     * @param signature - Transaction signature
     * @param commitment - Commitment level
     * @returns Transaction details
     */
    async getTransaction(
        signature: string,
        commitment?: Commitment,
    ): Promise<any> {
        try {
            const transaction = await this.connection.getTransaction(
                signature,
                {
                    commitment: commitment as any,
                    maxSupportedTransactionVersion: 0,
                },
            );
            return transaction;
        } catch (error) {
            this.logger.error(`Failed to get transaction ${signature}`, error);
            throw error;
        }
    }

    /**
     * Send and confirm transaction
     * @param transaction - Transaction to send
     * @param commitment - Commitment level
     * @returns Transaction signature
     */
    async sendAndConfirmTransaction(
        transaction: any,
        commitment?: Commitment,
    ): Promise<string> {
        try {
            const signature = await this.connection.sendTransaction(
                transaction,
                {
                    skipPreflight: false,
                    preflightCommitment: 'processed',
                },
            );
            await this.connection.confirmTransaction(
                {
                    signature,
                    abortSignal: new AbortController().signal,
                } as any,
                commitment || this.config.commitment,
            );
            return signature;
        } catch (error) {
            this.logger.error('Failed to send and confirm transaction', error);
            throw error;
        }
    }

    /**
     * Send transaction without confirmation
     * @param transaction - Transaction to send
     * @returns Transaction signature
     */
    async sendTransaction(transaction: any): Promise<string> {
        try {
            const signature = await this.connection.sendTransaction(
                transaction,
                {
                    skipPreflight: false,
                    preflightCommitment: 'processed',
                },
            );
            return signature;
        } catch (error) {
            this.logger.error('Failed to send transaction', error);
            throw error;
        }
    }

    /**
     * Confirm transaction
     * @param signature - Transaction signature
     * @param commitment - Commitment level
     * @returns Confirmation status
     */
    async confirmTransaction(
        signature: string,
        commitment?: Commitment,
    ): Promise<boolean> {
        try {
            const status = await this.connection.confirmTransaction(
                signature,
                commitment,
            );
            return !status.value.err;
        } catch (error) {
            this.logger.error(
                `Failed to confirm transaction ${signature}`,
                error,
            );
            return false;
        }
    }

    /**
     * Get network information
     * @returns Network information
     */
    getNetworkInfo(): { network: string; rpcUrl: string; commitment: string } {
        return {
            network: this.config.network,
            rpcUrl: this.config.rpcUrl,
            commitment: this.config.commitment,
        };
    }

    /**
     * Check if connection is healthy
     * @returns true if connection is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            await this.connection.getVersion();
            return true;
        } catch (error) {
            this.logger.error('Solana connection health check failed', error);
            return false;
        }
    }
}
