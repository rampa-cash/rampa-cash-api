import { PublicKey } from '@solana/web3.js';

export interface BlockchainTransaction {
    signature: string;
    from: string;
    to: string;
    amount: bigint;
    token: string;
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
    timestamp: Date;
    fee?: bigint;
}

export interface BlockchainBalance {
    address: string;
    token: string;
    balance: bigint;
    lastUpdated: Date;
}

export interface BlockchainService {
    /**
     * Get the current balance for a specific token at an address
     */
    getBalance(address: string, token: string): Promise<BlockchainBalance>;

    /**
     * Get balances for multiple tokens at an address
     */
    getBalances(address: string, tokens: string[]): Promise<BlockchainBalance[]>;

    /**
     * Create and sign a transaction
     */
    createTransaction(
        from: string,
        to: string,
        amount: bigint,
        token: string,
        privateKey?: string
    ): Promise<BlockchainTransaction>;

    /**
     * Broadcast a signed transaction to the network
     */
    broadcastTransaction(transaction: BlockchainTransaction): Promise<string>;

    /**
     * Get transaction status by signature
     */
    getTransactionStatus(signature: string): Promise<BlockchainTransaction>;

    /**
     * Get transaction history for an address
     */
    getTransactionHistory(
        address: string,
        limit?: number,
        offset?: number
    ): Promise<BlockchainTransaction[]>;

    /**
     * Validate if an address is valid for this blockchain
     */
    validateAddress(address: string): boolean;

    /**
     * Get network information
     */
    getNetworkInfo(): Promise<{
        networkId: string;
        blockHeight: number;
        gasPrice?: bigint;
    }>;

    /**
     * Estimate transaction fees
     */
    estimateFees(
        from: string,
        to: string,
        amount: bigint,
        token: string
    ): Promise<bigint>;
}

export interface BlockchainConfig {
    rpcUrl: string;
    networkId: string;
    gasPrice?: bigint;
    timeout?: number;
    retries?: number;
}