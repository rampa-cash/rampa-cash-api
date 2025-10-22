import { CreateTransactionDto, TransactionQueryDto } from '../dto';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

/**
 * Interface for Transaction Service operations
 * Defines the contract for transaction management operations
 */
export interface ITransactionService {
    /**
     * Creates a new transaction
     * @param createTransactionDto - Transaction creation data
     * @returns Promise<Transaction> - The created transaction
     */
    create(createTransactionDto: CreateTransactionDto): Promise<Transaction>;

    /**
     * Finds all transactions with optional filtering
     * @param query - Optional query parameters for filtering
     * @returns Promise<Transaction[]> - Array of transactions
     */
    findAll(query?: TransactionQueryDto): Promise<Transaction[]>;

    /**
     * Finds a transaction by ID
     * @param id - The transaction ID
     * @returns Promise<Transaction> - The transaction if found
     * @throws NotFoundException if transaction not found
     */
    findOne(id: string): Promise<Transaction>;

    /**
     * Finds transactions for a specific user
     * @param userId - The user ID
     * @param limit - Maximum number of transactions to return
     * @param offset - Number of transactions to skip
     * @returns Promise<Transaction[]> - Array of user transactions
     */
    findByUser(
        userId: string,
        limit?: number,
        offset?: number,
    ): Promise<Transaction[]>;

    /**
     * Finds transactions by status
     * @param status - The transaction status
     * @returns Promise<Transaction[]> - Array of transactions with the specified status
     */
    findByStatus(status: TransactionStatus): Promise<Transaction[]>;

    /**
     * Confirms a pending transaction
     * @param id - The transaction ID
     * @param solanaTransactionHash - The Solana transaction hash
     * @returns Promise<Transaction> - The confirmed transaction
     */
    confirmTransaction(
        id: string,
        solanaTransactionHash: string,
    ): Promise<Transaction>;

    /**
     * Marks a transaction as failed
     * @param id - The transaction ID
     * @param failureReason - Reason for failure
     * @returns Promise<Transaction> - The failed transaction
     */
    failTransaction(id: string, failureReason: string): Promise<Transaction>;

    /**
     * Cancels a pending transaction
     * @param id - The transaction ID
     * @param userId - The user ID (must be the sender)
     * @returns Promise<Transaction> - The cancelled transaction
     */
    cancelTransaction(id: string, userId: string): Promise<Transaction>;

    /**
     * Gets all pending transactions
     * @returns Promise<Transaction[]> - Array of pending transactions
     */
    findPendingTransactions(): Promise<Transaction[]>;

    /**
     * Gets all confirmed transactions
     * @returns Promise<Transaction[]> - Array of confirmed transactions
     */
    findConfirmedTransactions(): Promise<Transaction[]>;

    /**
     * Gets all failed transactions
     * @returns Promise<Transaction[]> - Array of failed transactions
     */
    findFailedTransactions(): Promise<Transaction[]>;

    /**
     * Gets transaction statistics for a user
     * @param userId - The user ID
     * @param startDate - Optional start date for filtering
     * @param endDate - Optional end date for filtering
     * @returns Promise<TransactionStats> - Transaction statistics
     */
    getTransactionStats(
        userId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalSent: number;
        totalReceived: number;
        totalFees: number;
        transactionCount: number;
    }>;
}
