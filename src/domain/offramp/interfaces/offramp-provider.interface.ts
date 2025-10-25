import { OffRampStatus } from '../entities/offramp-transaction.entity';

export interface OffRampQuote {
    provider: string;
    tokenAmount: number;
    fiatAmount: number;
    fiatCurrency: string;
    exchangeRate: number;
    fee: number;
    estimatedTime: string;
    expiresAt: Date;
}

export interface OffRampInitiationRequest {
    userId: string;
    walletId: string;
    tokenAmount: number;
    tokenType: string;
    fiatCurrency: string;
    bankAccountId?: string;
}

export interface OffRampInitiationResponse {
    transactionId: string;
    providerTransactionId: string;
    status: OffRampStatus;
    quote: OffRampQuote;
    redirectUrl?: string;
    expiresAt: Date;
}

export interface OffRampStatusResponse {
    transactionId: string;
    providerTransactionId: string;
    status: OffRampStatus;
    fiatAmount: number;
    fiatCurrency: string;
    completedAt?: Date;
    failureReason?: string;
}

export interface IOffRampProvider {
    /**
     * Get a quote for off-ramp transaction
     */
    getQuote(request: {
        tokenAmount: number;
        tokenType: string;
        fiatCurrency: string;
    }): Promise<OffRampQuote>;

    /**
     * Initiate an off-ramp transaction
     */
    initiateOffRamp(
        request: OffRampInitiationRequest,
    ): Promise<OffRampInitiationResponse>;

    /**
     * Get the status of an off-ramp transaction
     */
    getOffRampStatus(
        providerTransactionId: string,
    ): Promise<OffRampStatusResponse>;

    /**
     * Cancel an off-ramp transaction
     */
    cancelOffRamp(providerTransactionId: string): Promise<boolean>;

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): Promise<string[]>;

    /**
     * Get minimum and maximum amounts
     */
    getLimits(fiatCurrency: string): Promise<{
        minAmount: number;
        maxAmount: number;
    }>;
}
