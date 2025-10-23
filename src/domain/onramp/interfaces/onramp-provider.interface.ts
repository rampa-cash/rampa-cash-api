import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * On-ramp provider interface following Dependency Inversion Principle (DIP)
 * Supports multiple payment providers for adding funds
 */
export interface OnRampProvider extends ExternalService {
    /**
     * Initiate on-ramp transaction
     * @param request - On-ramp request details
     * @returns On-ramp transaction result
     */
    initiateOnRamp(request: OnRampRequest): Promise<OnRampResult>;

    /**
     * Get on-ramp transaction status
     * @param transactionId - Transaction ID
     * @returns Transaction status
     */
    getTransactionStatus(transactionId: string): Promise<OnRampStatus>;

    /**
     * Complete on-ramp transaction
     * @param transactionId - Transaction ID
     * @param confirmationData - Confirmation data from provider
     * @returns Completion result
     */
    completeTransaction(transactionId: string, confirmationData: any): Promise<OnRampCompletion>;

    /**
     * Cancel on-ramp transaction
     * @param transactionId - Transaction ID
     * @returns Cancellation result
     */
    cancelTransaction(transactionId: string): Promise<OnRampCancellation>;

    /**
     * Get supported payment methods
     * @returns Array of supported payment methods
     */
    getSupportedPaymentMethods(): Promise<PaymentMethod[]>;

    /**
     * Get supported currencies
     * @returns Array of supported currencies
     */
    getSupportedCurrencies(): Promise<Currency[]>;

    /**
     * Calculate fees for on-ramp transaction
     * @param amount - Transaction amount
     * @param currency - Currency code
     * @param paymentMethod - Payment method
     * @returns Fee calculation
     */
    calculateFees(amount: string, currency: string, paymentMethod: string): Promise<FeeCalculation>;
}

/**
 * On-ramp request
 */
export interface OnRampRequest {
    userId: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    walletAddress: string;
    tokenType: string;
    userInfo: UserInfo;
    metadata?: Record<string, any>;
}

/**
 * On-ramp result
 */
export interface OnRampResult {
    transactionId: string;
    status: OnRampStatus;
    paymentUrl?: string;
    qrCode?: string;
    expiresAt: Date;
    fees: FeeCalculation;
    instructions?: string[];
}

/**
 * On-ramp status
 */
export enum OnRampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired'
}

/**
 * On-ramp completion
 */
export interface OnRampCompletion {
    transactionId: string;
    status: OnRampStatus;
    blockchainTransactionHash?: string;
    completedAt: Date;
    finalAmount: string;
    fees: FeeCalculation;
}

/**
 * On-ramp cancellation
 */
export interface OnRampCancellation {
    transactionId: string;
    status: OnRampStatus;
    cancelledAt: Date;
    refundAmount?: string;
    refundMethod?: string;
}

/**
 * Payment method
 */
export interface PaymentMethod {
    id: string;
    name: string;
    type: string;
    supportedCurrencies: string[];
    minAmount: string;
    maxAmount: string;
    processingTime: string;
    fees: FeeStructure;
}

/**
 * Currency
 */
export interface Currency {
    code: string;
    name: string;
    symbol: string;
    decimals: number;
    isSupported: boolean;
}

/**
 * Fee calculation
 */
export interface FeeCalculation {
    providerFee: string;
    networkFee: string;
    totalFee: string;
    netAmount: string;
    breakdown: FeeBreakdown[];
}

/**
 * Fee structure
 */
export interface FeeStructure {
    fixed: string;
    percentage: number;
    minFee: string;
    maxFee: string;
}

/**
 * Fee breakdown
 */
export interface FeeBreakdown {
    type: string;
    amount: string;
    description: string;
}

/**
 * User information for on-ramp
 */
export interface UserInfo {
    userId: string;
    email?: string;
    phone?: string;
    name?: string;
    country?: string;
    kycStatus: string;
}
