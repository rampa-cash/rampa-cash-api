import { DomainEvent } from '../../common/events/domain-event.base';
import { TokenType } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';

/**
 * Event published when a new transaction is created
 *
 * @description This event is published whenever a new transaction
 * is created in the system. It contains all the relevant information
 * about the transaction for event handlers to process, including
 * sender, recipient, amount, and status.
 *
 * @example
 * ```typescript
 * const event = new TransactionCreatedEvent(
 *   'tx-123',
 *   'user-456',
 *   'user-789',
 *   'wallet-abc',
 *   'wallet-def',
 *   100.50,
 *   TokenType.USDC,
 *   'solana-hash-xyz'
 * );
 *
 * eventBus.publish(event);
 * ```
 */
export class TransactionCreatedEvent extends DomainEvent {
    /**
     * Unique identifier of the transaction
     */
    public readonly transactionId: string;

    /**
     * ID of the user who sent the transaction
     */
    public readonly senderId: string;

    /**
     * ID of the user who will receive the transaction
     */
    public readonly recipientId: string;

    /**
     * ID of the sender's wallet
     */
    public readonly senderWalletId: string;

    /**
     * ID of the recipient's wallet
     */
    public readonly recipientWalletId: string;

    /**
     * Amount being transferred
     */
    public readonly amount: number;

    /**
     * Type of token being transferred
     */
    public readonly tokenType: TokenType;

    /**
     * Solana transaction hash (if available)
     */
    public readonly solanaTransactionHash?: string;

    /**
     * Current status of the transaction
     */
    public readonly status: TransactionStatus;

    /**
     * Transaction fee (if applicable)
     */
    public readonly fee?: number;

    constructor(
        transactionId: string,
        senderId: string,
        recipientId: string,
        senderWalletId: string,
        recipientWalletId: string,
        amount: number,
        tokenType: TokenType,
        status: TransactionStatus = TransactionStatus.PENDING,
        solanaTransactionHash?: string,
        fee?: number,
        occurredAt: Date = new Date(),
        metadata: Record<string, any> = {},
    ) {
        super('TransactionCreated', occurredAt, {
            transactionId,
            senderId,
            recipientId,
            senderWalletId,
            recipientWalletId,
            amount,
            tokenType,
            status,
            solanaTransactionHash,
            fee,
            ...metadata,
        });

        this.transactionId = transactionId;
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.senderWalletId = senderWalletId;
        this.recipientWalletId = recipientWalletId;
        this.amount = amount;
        this.tokenType = tokenType;
        this.status = status;
        this.solanaTransactionHash = solanaTransactionHash;
        this.fee = fee;
    }

    /**
     * Get the total value of the transaction including fees
     */
    public getTotalValue(): number {
        return this.amount + (this.fee || 0);
    }

    /**
     * Check if this is a high-value transaction (above threshold)
     */
    public isHighValue(threshold: number = 1000): boolean {
        return this.amount >= threshold;
    }

    /**
     * Get a human-readable description of the transaction
     */
    public getDescription(): string {
        return `Transfer ${this.amount} ${this.tokenType} from ${this.senderId} to ${this.recipientId}`;
    }

    /**
     * Check if the transaction is pending
     */
    public isPending(): boolean {
        return this.status === TransactionStatus.PENDING;
    }

    /**
     * Check if the transaction is confirmed
     */
    public isConfirmed(): boolean {
        return this.status === TransactionStatus.CONFIRMED;
    }

    /**
     * Check if the transaction failed
     */
    public isFailed(): boolean {
        return this.status === TransactionStatus.FAILED;
    }

    /**
     * Check if the transaction is cancelled
     */
    public isCancelled(): boolean {
        return this.status === TransactionStatus.CANCELLED;
    }

    /**
     * Check if this is a self-transaction (sender and recipient are the same)
     */
    public isSelfTransaction(): boolean {
        return this.senderId === this.recipientId;
    }

    /**
     * Get the net amount (amount minus fees)
     */
    public getNetAmount(): number {
        return this.amount - (this.fee || 0);
    }

    /**
     * Check if the transaction has a Solana hash
     */
    public hasSolanaHash(): boolean {
        return !!this.solanaTransactionHash;
    }
}
