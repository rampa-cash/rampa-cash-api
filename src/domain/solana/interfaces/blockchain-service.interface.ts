import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * Blockchain service interface following Dependency Inversion Principle (DIP)
 * Supports multiple blockchain providers (Solana, Ethereum in future)
 */
export interface BlockchainService extends ExternalService {
    /**
     * Get wallet balance for a specific token
     * @param walletAddress - Wallet address
     * @param tokenType - Token type (USDC, EURC, SOL)
     * @returns Balance information
     */
    getBalance(walletAddress: string, tokenType: TokenType): Promise<BalanceInfo>;

    /**
     * Get all token balances for a wallet
     * @param walletAddress - Wallet address
     * @returns Array of balance information
     */
    getAllBalances(walletAddress: string): Promise<BalanceInfo[]>;

    /**
     * Send tokens to another wallet
     * @param transaction - Transaction details
     * @returns Transaction result
     */
    sendTransaction(transaction: TransactionRequest): Promise<TransactionResult>;

    /**
     * Get transaction status
     * @param transactionHash - Transaction hash
     * @returns Transaction status
     */
    getTransactionStatus(transactionHash: string): Promise<TransactionStatus>;

    /**
     * Get transaction history for a wallet
     * @param walletAddress - Wallet address
     * @param limit - Number of transactions to return
     * @param offset - Offset for pagination
     * @returns Array of transaction information
     */
    getTransactionHistory(walletAddress: string, limit?: number, offset?: number): Promise<TransactionInfo[]>;

    /**
     * Validate wallet address
     * @param address - Wallet address to validate
     * @returns True if valid, false otherwise
     */
    validateAddress(address: string): Promise<boolean>;

    /**
     * Get network information
     * @returns Network information
     */
    getNetworkInfo(): Promise<NetworkInfo>;
}

/**
 * Token types supported by the blockchain
 */
export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL'
}

/**
 * Balance information
 */
export interface BalanceInfo {
    tokenType: TokenType;
    balance: string;
    decimals: number;
    mintAddress: string;
    lastUpdated: Date;
}

/**
 * Transaction request
 */
export interface TransactionRequest {
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenType: TokenType;
    memo?: string;
    priorityFee?: string;
}

/**
 * Transaction result
 */
export interface TransactionResult {
    transactionHash: string;
    status: TransactionStatus;
    blockNumber?: number;
    gasUsed?: string;
    fee?: string;
    timestamp: Date;
}

/**
 * Transaction status
 */
export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

/**
 * Transaction information
 */
export interface TransactionInfo {
    transactionHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenType: TokenType;
    status: TransactionStatus;
    blockNumber?: number;
    timestamp: Date;
    fee?: string;
    memo?: string;
}

/**
 * Network information
 */
export interface NetworkInfo {
    name: string;
    chainId: string;
    rpcUrl: string;
    blockExplorerUrl: string;
    isTestnet: boolean;
}
