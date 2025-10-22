import { DomainEvent } from '../../common/events/domain-event.base';
import { TokenType } from '../../common/enums/token-type.enum';

/**
 * Event published when a wallet balance is updated
 *
 * @description This event is published whenever a wallet balance
 * is updated, either through a transaction, on-ramp, off-ramp, or
 * manual adjustment. It contains the balance change information
 * for event handlers to process.
 *
 * @example
 * ```typescript
 * const event = new WalletBalanceUpdatedEvent(
 *   'wallet-123',
 *   'user-456',
 *   TokenType.USDC,
 *   1000.50,
 *   900.50,
 *   100.00,
 *   'transaction-789'
 * );
 *
 * eventBus.publish(event);
 * ```
 */
export class WalletBalanceUpdatedEvent extends DomainEvent {
    /**
     * Unique identifier of the wallet
     */
    public readonly walletId: string;

    /**
     * ID of the user who owns the wallet
     */
    public readonly userId: string;

    /**
     * Type of token whose balance was updated
     */
    public readonly tokenType: TokenType;

    /**
     * New balance after the update
     */
    public readonly newBalance: number;

    /**
     * Previous balance before the update
     */
    public readonly previousBalance: number;

    /**
     * Amount of the balance change (positive for increase, negative for decrease)
     */
    public readonly balanceChange: number;

    /**
     * ID of the transaction that caused the balance change (if applicable)
     */
    public readonly transactionId?: string;

    /**
     * ID of the on-ramp that caused the balance change (if applicable)
     */
    public readonly onRampId?: string;

    /**
     * ID of the off-ramp that caused the balance change (if applicable)
     */
    public readonly offRampId?: string;

    /**
     * Reason for the balance update
     */
    public readonly reason: string;

    constructor(
        walletId: string,
        userId: string,
        tokenType: TokenType,
        newBalance: number,
        previousBalance: number,
        balanceChange: number,
        reason: string = 'balance_updated',
        transactionId?: string,
        onRampId?: string,
        offRampId?: string,
        occurredAt: Date = new Date(),
        metadata: Record<string, any> = {},
    ) {
        super('WalletBalanceUpdated', occurredAt, {
            walletId,
            userId,
            tokenType,
            newBalance,
            previousBalance,
            balanceChange,
            reason,
            transactionId,
            onRampId,
            offRampId,
            ...metadata,
        });

        this.walletId = walletId;
        this.userId = userId;
        this.tokenType = tokenType;
        this.newBalance = newBalance;
        this.previousBalance = previousBalance;
        this.balanceChange = balanceChange;
        this.reason = reason;
        this.transactionId = transactionId;
        this.onRampId = onRampId;
        this.offRampId = offRampId;
    }

    /**
     * Check if the balance increased
     */
    public isIncrease(): boolean {
        return this.balanceChange > 0;
    }

    /**
     * Check if the balance decreased
     */
    public isDecrease(): boolean {
        return this.balanceChange < 0;
    }

    /**
     * Check if the balance remained the same
     */
    public isNoChange(): boolean {
        return this.balanceChange === 0;
    }

    /**
     * Get the percentage change in balance
     */
    public getPercentageChange(): number {
        if (this.previousBalance === 0) {
            return this.balanceChange > 0 ? 100 : 0;
        }
        return (this.balanceChange / this.previousBalance) * 100;
    }

    /**
     * Check if this is a significant balance change (above threshold)
     */
    public isSignificantChange(threshold: number = 100): boolean {
        return Math.abs(this.balanceChange) >= threshold;
    }

    /**
     * Get a human-readable description of the balance change
     */
    public getDescription(): string {
        const changeType = this.isIncrease()
            ? 'increased'
            : this.isDecrease()
              ? 'decreased'
              : 'unchanged';
        const changeAmount = Math.abs(this.balanceChange);
        return `Wallet balance ${changeType} by ${changeAmount} ${this.tokenType} (${this.previousBalance} → ${this.newBalance})`;
    }

    /**
     * Check if the balance change was caused by a transaction
     */
    public isFromTransaction(): boolean {
        return !!this.transactionId;
    }

    /**
     * Check if the balance change was caused by an on-ramp
     */
    public isFromOnRamp(): boolean {
        return !!this.onRampId;
    }

    /**
     * Check if the balance change was caused by an off-ramp
     */
    public isFromOffRamp(): boolean {
        return !!this.offRampId;
    }

    /**
     * Get the source of the balance change
     */
    public getChangeSource(): string {
        if (this.transactionId) return `transaction:${this.transactionId}`;
        if (this.onRampId) return `onramp:${this.onRampId}`;
        if (this.offRampId) return `offramp:${this.offRampId}`;
        return this.reason;
    }

    /**
     * Check if the wallet now has a zero balance
     */
    public isZeroBalance(): boolean {
        return this.newBalance === 0;
    }

    /**
     * Check if the wallet now has a positive balance
     */
    public isPositiveBalance(): boolean {
        return this.newBalance > 0;
    }

    /**
     * Check if the wallet now has a negative balance (should not happen)
     */
    public isNegativeBalance(): boolean {
        return this.newBalance < 0;
    }
}
