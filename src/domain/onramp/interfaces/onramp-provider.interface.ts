import { OnRampProvider } from '../entities/onramp-transaction.entity';

export interface OnRampProviderConfig {
    provider: OnRampProvider;
    apiKey: string;
    secretKey?: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
    baseUrl?: string;
}

export interface OnRampRequest {
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    tokenType: string;
    returnUrl?: string;
    metadata?: Record<string, any>;
}

export interface OnRampResponse {
    transactionId: string;
    providerTransactionId: string;
    paymentUrl?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    expiresAt?: Date;
    metadata?: Record<string, any>;
}

export interface OnRampStatusResponse {
    transactionId: string;
    providerTransactionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    amount?: number;
    currency?: string;
    tokenAmount?: number;
    tokenType?: string;
    fee?: number;
    exchangeRate?: number;
    failureReason?: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
}

export interface OnRampWebhookData {
    providerTransactionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    amount?: number;
    currency?: string;
    tokenAmount?: number;
    tokenType?: string;
    fee?: number;
    exchangeRate?: number;
    failureReason?: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
}

export interface IOnRampProvider {
    /**
     * Initialize the provider with configuration
     */
    initialize(config: OnRampProviderConfig): Promise<void>;

    /**
     * Create a new on-ramp transaction
     */
    createTransaction(request: OnRampRequest): Promise<OnRampResponse>;

    /**
     * Get the status of an on-ramp transaction
     */
    getTransactionStatus(
        providerTransactionId: string,
    ): Promise<OnRampStatusResponse>;

    /**
     * Process a webhook from the provider
     */
    processWebhook(data: OnRampWebhookData): Promise<void>;

    /**
     * Cancel an on-ramp transaction
     */
    cancelTransaction(providerTransactionId: string): Promise<boolean>;

    /**
     * Get supported currencies for the provider
     */
    getSupportedCurrencies(): Promise<string[]>;

    /**
     * Get supported tokens for the provider
     */
    getSupportedTokens(): Promise<string[]>;

    /**
     * Get exchange rate for a currency pair
     */
    getExchangeRate(currency: string, tokenType: string): Promise<number>;

    /**
     * Get minimum and maximum amounts for a currency
     */
    getAmountLimits(currency: string): Promise<{ min: number; max: number }>;

    /**
     * Validate if a transaction is valid
     */
    validateTransaction(providerTransactionId: string): Promise<boolean>;
}
