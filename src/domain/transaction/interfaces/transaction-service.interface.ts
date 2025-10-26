import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';

export interface TransactionRequest {
    fromUserId: string;
    toUserId?: string;
    toExternalAddress?: string;
    amount: bigint;
    token: string;
    description?: string;
    memo?: string;
    fromAddress?: string;
    metadata?: Record<string, any>;
}

export interface TransactionResult {
    transactionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'confirmed';
    signature?: string;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}

export interface TransactionHistory {
    transactionId: string;
    fromUserId: string;
    toUserId?: string;
    toExternalAddress?: string;
    amount: bigint;
    token: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    signature?: string;
    description?: string;
    createdAt: Date;
    completedAt?: Date;
    metadata?: Record<string, any>;
}

export interface TransactionService {
    /**
     * Create a new transaction
     */
    createTransaction(request: TransactionRequest): Promise<TransactionResult>;

    /**
     * Get transaction by ID
     */
    getTransaction(transactionId: string): Promise<TransactionHistory | null>;

    /**
     * Get transaction history for a user
     */
    getTransactionHistory(
        userId: string,
        limit?: number,
        offset?: number,
        token?: string,
    ): Promise<TransactionHistory[]>;

    /**
     * Get sent transactions for a user
     */
    getSentTransactions(
        userId: string,
        limit?: number,
        offset?: number,
    ): Promise<TransactionHistory[]>;

    /**
     * Get received transactions for a user
     */
    getReceivedTransactions(
        userId: string,
        limit?: number,
        offset?: number,
    ): Promise<TransactionHistory[]>;

    /**
     * Update transaction status
     */
    updateTransactionStatus(
        transactionId: string,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        signature?: string,
        error?: string,
    ): Promise<void>;

    /**
     * Validate transaction request
     */
    validateTransaction(request: TransactionRequest): Promise<{
        isValid: boolean;
        errors: string[];
    }>;

    /**
     * Check if user has sufficient balance
     */
    checkBalance(
        userId: string,
        amount: bigint,
        token: string,
    ): Promise<{
        hasBalance: boolean;
        currentBalance: bigint;
    }>;

    /**
     * Process pending transactions
     */
    processPendingTransactions(): Promise<void>;

    /**
     * Get transaction statistics for a user
     */
    getTransactionStats(userId: string): Promise<{
        totalSent: bigint;
        totalReceived: bigint;
        transactionCount: number;
        successRate: number;
    }>;
}

export interface TransactionConfig {
    maxTransactionAmount: bigint;
    minTransactionAmount: bigint;
    supportedTokens: string[];
    processingTimeout: number;
    retryAttempts: number;
}
