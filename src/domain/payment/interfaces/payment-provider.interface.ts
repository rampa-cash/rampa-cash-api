export interface PaymentMethod {
    id: string;
    type: 'card' | 'bank' | 'wallet' | 'crypto';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    bankName?: string;
    accountType?: 'checking' | 'savings';
    isDefault: boolean;
    isVerified: boolean;
    createdAt: Date;
}

export interface PaymentIntent {
    id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
    clientSecret?: string;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentMethodRequest {
    type: 'card' | 'bank' | 'wallet' | 'crypto';
    token?: string;
    bankAccount?: {
        accountNumber: string;
        routingNumber: string;
        accountType: 'checking' | 'savings';
        bankName: string;
    };
    cardDetails?: {
        number: string;
        expiryMonth: number;
        expiryYear: number;
        cvc: string;
        name: string;
    };
    walletAddress?: string;
}

export interface PaymentIntentRequest {
    amount: number;
    currency: string;
    paymentMethodId?: string;
    paymentMethodRequest?: PaymentMethodRequest;
    metadata?: Record<string, any>;
    description?: string;
}

export interface RefundRequest {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface Refund {
    id: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
    reason?: string;
    createdAt: Date;
}

export interface IPaymentProvider {
    /**
     * Create a payment method
     */
    createPaymentMethod(request: PaymentMethodRequest): Promise<PaymentMethod>;

    /**
     * Get payment methods for a user
     */
    getPaymentMethods(userId: string): Promise<PaymentMethod[]>;

    /**
     * Update a payment method
     */
    updatePaymentMethod(
        paymentMethodId: string,
        updates: Partial<PaymentMethod>,
    ): Promise<PaymentMethod>;

    /**
     * Delete a payment method
     */
    deletePaymentMethod(paymentMethodId: string): Promise<boolean>;

    /**
     * Create a payment intent
     */
    createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent>;

    /**
     * Confirm a payment intent
     */
    confirmPaymentIntent(
        paymentIntentId: string,
        paymentMethodId?: string,
    ): Promise<PaymentIntent>;

    /**
     * Cancel a payment intent
     */
    cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

    /**
     * Get payment intent status
     */
    getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

    /**
     * Create a refund
     */
    createRefund(request: RefundRequest): Promise<Refund>;

    /**
     * Get refund status
     */
    getRefund(refundId: string): Promise<Refund>;

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): Promise<string[]>;

    /**
     * Get supported payment methods
     */
    getSupportedPaymentMethods(): Promise<string[]>;

    /**
     * Validate webhook signature
     */
    validateWebhookSignature(payload: string, signature: string): boolean;

    /**
     * Process webhook event
     */
    processWebhookEvent(event: any): Promise<void>;
}
