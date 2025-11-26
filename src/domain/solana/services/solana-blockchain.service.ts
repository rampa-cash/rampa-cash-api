import { Injectable, Logger } from '@nestjs/common';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    BlockchainService,
    BlockchainTransaction,
    BlockchainBalance,
    BlockchainConfig,
} from '../interfaces/blockchain-service.interface';
import { SolanaConnectionService } from './solana-connection.service';
import { SplTokenService } from './spl-token.service';

@Injectable()
export class SolanaBlockchainService implements BlockchainService {
    private readonly logger = new Logger(SolanaBlockchainService.name);

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly splTokenService: SplTokenService,
    ) {}

    async getBalance(
        address: string,
        token: string,
    ): Promise<BlockchainBalance> {
        try {
            const publicKey = new PublicKey(address);

            if (token === 'SOL') {
                const balance = await this.connectionService
                    .getConnection()
                    .getBalance(publicKey);
                return {
                    address,
                    token,
                    balance: BigInt(balance),
                    lastUpdated: new Date(),
                };
            } else {
                // For SPL tokens
                const mintAddress =
                    this.splTokenService.getTokenMintAddress(token as any);
                const tokenBalance = await this.splTokenService.getTokenBalance(
                    address,
                    mintAddress,
                );
                return {
                    address,
                    token,
                    balance: BigInt(
                        tokenBalance ? tokenBalance.amount.toString() : '0',
                    ),
                    lastUpdated: new Date(),
                };
            }
        } catch (error) {
            this.logger.error(
                `Failed to get balance for ${address}: ${token}`,
                error,
            );
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async getBalances(
        address: string,
        tokens: string[],
    ): Promise<BlockchainBalance[]> {
        try {
            const balances = await Promise.all(
                tokens.map((token) => this.getBalance(address, token)),
            );
            return balances;
        } catch (error) {
            this.logger.error(`Failed to get balances for ${address}`, error);
            throw new Error(`Failed to get balances: ${error.message}`);
        }
    }

    async createTransaction(
        from: string,
        to: string,
        amount: bigint,
        token: string,
        privateKey?: string,
    ): Promise<BlockchainTransaction> {
        try {
            const fromPublicKey = new PublicKey(from);
            const toPublicKey = new PublicKey(to);

            if (token === 'SOL') {
                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fromPublicKey,
                        toPubkey: toPublicKey,
                        lamports: Number(amount),
                    }),
                );

                const signature = await this.connectionService
                    .getConnection()
                    .sendTransaction(transaction, [
                        /* signers would be added here */
                    ]);

                return {
                    signature,
                    from,
                    to,
                    amount,
                    token,
                    status: 'pending',
                    timestamp: new Date(),
                };
            } else {
                // For SPL tokens, use the SPL token service
                // Note: This would need to be implemented in SplTokenService
                const signature = `spl_transfer_${Date.now()}`; // Placeholder

                return {
                    signature,
                    from,
                    to,
                    amount,
                    token,
                    status: 'pending',
                    timestamp: new Date(),
                };
            }
        } catch (error) {
            this.logger.error(
                `Failed to create transaction from ${from} to ${to}`,
                error,
            );
            throw new Error(`Failed to create transaction: ${error.message}`);
        }
    }

    async broadcastTransaction(
        transaction: BlockchainTransaction,
    ): Promise<string> {
        try {
            // In a real implementation, this would broadcast the transaction
            // For now, we'll return the signature
            this.logger.log(
                `Broadcasting transaction: ${transaction.signature}`,
            );
            return transaction.signature;
        } catch (error) {
            this.logger.error(
                `Failed to broadcast transaction: ${transaction.signature}`,
                error,
            );
            throw new Error(
                `Failed to broadcast transaction: ${error.message}`,
            );
        }
    }

    async getTransactionStatus(
        signature: string,
    ): Promise<BlockchainTransaction> {
        try {
            const transaction = await this.connectionService
                .getConnection()
                .getTransaction(signature);

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            return {
                signature,
                from: transaction.transaction.message.accountKeys[0].toString(),
                to: transaction.transaction.message.accountKeys[1].toString(),
                amount: BigInt(0), // Would need to parse from transaction data
                token: 'SOL', // Would need to determine from transaction
                status: transaction.meta?.err ? 'failed' : 'confirmed',
                blockNumber: transaction.slot,
                timestamp: new Date(transaction.blockTime! * 1000),
                fee: transaction.meta?.fee
                    ? BigInt(transaction.meta.fee)
                    : undefined,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get transaction status: ${signature}`,
                error,
            );
            throw new Error(
                `Failed to get transaction status: ${error.message}`,
            );
        }
    }

    async getTransactionHistory(
        address: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<BlockchainTransaction[]> {
        try {
            const publicKey = new PublicKey(address);
            const signatures = await this.connectionService
                .getConnection()
                .getSignaturesForAddress(publicKey, { limit });

            const transactions = await Promise.all(
                signatures.map((sig) =>
                    this.getTransactionStatus(sig.signature),
                ),
            );

            return transactions;
        } catch (error) {
            this.logger.error(
                `Failed to get transaction history for ${address}`,
                error,
            );
            throw new Error(
                `Failed to get transaction history: ${error.message}`,
            );
        }
    }

    validateAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    async getNetworkInfo(): Promise<{
        networkId: string;
        blockHeight: number;
        gasPrice?: bigint;
    }> {
        try {
            const connection = this.connectionService.getConnection();
            const blockHeight = await connection.getBlockHeight();

            return {
                networkId: 'solana-mainnet',
                blockHeight,
            };
        } catch (error) {
            this.logger.error('Failed to get network info', error);
            throw new Error(`Failed to get network info: ${error.message}`);
        }
    }

    async estimateFees(
        from: string,
        to: string,
        amount: bigint,
        token: string,
    ): Promise<bigint> {
        try {
            // For Solana, fees are typically very low and fixed
            // This is a simplified implementation
            if (token === 'SOL') {
                return BigInt(5000); // ~0.000005 SOL
            } else {
                return BigInt(10000); // SPL token transfers might cost more
            }
        } catch (error) {
            this.logger.error('Failed to estimate fees', error);
            throw new Error(`Failed to estimate fees: ${error.message}`);
        }
    }
}
