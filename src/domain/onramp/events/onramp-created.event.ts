import { DomainEvent } from '../../common/events/domain-event.base';
import { TokenType } from '../../common/enums/token-type.enum';
import { RampStatus } from '../entities/onoff-ramp.entity';

/**
 * Event published when a new on-ramp transaction is created
 *
 * @description This event is published whenever a user initiates
 * a new on-ramp transaction (fiat to crypto conversion). It contains
 * all the relevant information about the transaction for event handlers
 * to process.
 *
 * @example
 * ```typescript
 * const event = new OnRampCreatedEvent(
 *   'onramp-123',
 *   'user-456',
 *   'wallet-789',
 *   1000.00,
 *   850.00,
 *   'EUR',
 *   TokenType.USDC,
 *   'provider-xyz'
 * );
 *
 * eventBus.publish(event);
 * ```
 */
export class OnRampCreatedEvent extends DomainEvent {
    /**
     * Unique identifier of the on-ramp transaction
     */
    public readonly onRampId: string;

    /**
     * ID of the user who initiated the on-ramp
     */
    public readonly userId: string;

    /**
     * ID of the wallet that will receive the crypto
     */
    public readonly walletId: string;

    /**
     * Amount in fiat currency
     */
    public readonly fiatAmount: number;

    /**
     * Amount in crypto currency
     */
    public readonly cryptoAmount: number;

    /**
     * Fiat currency code (e.g., 'EUR', 'USD')
     */
    public readonly fiatCurrency: string;

    /**
     * Type of crypto token to be received
     */
    public readonly tokenType: TokenType;

    /**
     * Provider used for the on-ramp (e.g., 'MoonPay', 'Ramp')
     */
    public readonly provider: string;

    /**
     * Exchange rate used for the conversion
     */
    public readonly exchangeRate: number;

    /**
     * Current status of the on-ramp transaction
     */
    public readonly status: RampStatus;

    constructor(
        onRampId: string,
        userId: string,
        walletId: string,
        fiatAmount: number,
        cryptoAmount: number,
        fiatCurrency: string,
        tokenType: TokenType,
        provider: string,
        exchangeRate: number,
        status: RampStatus = RampStatus.PENDING,
        occurredAt: Date = new Date(),
        metadata: Record<string, any> = {},
    ) {
        super('OnRampCreated', occurredAt, {
            onRampId,
            userId,
            walletId,
            fiatAmount,
            cryptoAmount,
            fiatCurrency,
            tokenType,
            provider,
            exchangeRate,
            status,
            ...metadata,
        });

        this.onRampId = onRampId;
        this.userId = userId;
        this.walletId = walletId;
        this.fiatAmount = fiatAmount;
        this.cryptoAmount = cryptoAmount;
        this.fiatCurrency = fiatCurrency;
        this.tokenType = tokenType;
        this.provider = provider;
        this.exchangeRate = exchangeRate;
        this.status = status;
    }

    /**
     * Get the total value of the on-ramp in fiat currency
     */
    public getTotalFiatValue(): number {
        return this.fiatAmount;
    }

    /**
     * Get the total value of the on-ramp in crypto currency
     */
    public getTotalCryptoValue(): number {
        return this.cryptoAmount;
    }

    /**
     * Check if this is a high-value on-ramp (above threshold)
     */
    public isHighValue(threshold: number = 1000): boolean {
        return this.fiatAmount >= threshold;
    }

    /**
     * Get a human-readable description of the on-ramp
     */
    public getDescription(): string {
        return `On-ramp ${this.fiatAmount} ${this.fiatCurrency} → ${this.cryptoAmount} ${this.tokenType} via ${this.provider}`;
    }

    /**
     * Check if the on-ramp is in a pending state
     */
    public isPending(): boolean {
        return this.status === RampStatus.PENDING;
    }

    /**
     * Check if the on-ramp is completed
     */
    public isCompleted(): boolean {
        return this.status === RampStatus.COMPLETED;
    }

    /**
     * Check if the on-ramp failed
     */
    public isFailed(): boolean {
        return this.status === RampStatus.FAILED;
    }
}
