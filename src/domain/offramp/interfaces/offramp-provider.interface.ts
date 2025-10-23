import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * Off-ramp provider interface following Dependency Inversion Principle (DIP)
 * Supports multiple payment providers for withdrawing funds
 */
export interface OffRampProvider extends ExternalService {
    /**
     * Initiate off-ramp transaction
     * @param request - Off-ramp request details
     * @returns Off-ramp transaction result
     */
    initiateOffRamp(request: OffRampRequest): Promise<OffRampResult>;

    /**
     * Get off-ramp transaction status
     * @param transactionId - Transaction ID
     * @returns Transaction status
     */
    getTransactionStatus(transactionId: string): Promise<OffRampStatus>;

    /**
     * Complete off-ramp transaction
     * @param transactionId - Transaction ID
     * @param confirmationData - Confirmation data from provider
     * @returns Completion result
     */
    completeTransaction(transactionId: string, confirmationData: any): Promise<OffRampCompletion>;

    /**
     * Cancel off-ramp transaction
     * @param transactionId - Transaction ID
     * @returns Cancellation result
     */
    cancelTransaction(transactionId: string): Promise<OffRampCancellation>;

    /**
     * Get supported withdrawal methods
     * @returns Array of supported withdrawal methods
     */
    getSupportedWithdrawalMethods(): Promise<WithdrawalMethod[]>;

    /**
     * Get supported currencies
     * @returns Array of supported currencies
     */
    getSupportedCurrencies(): Promise<Currency[]>;

    /**
     * Calculate fees for off-ramp transaction
     * @param amount - Transaction amount
     * @param currency - Currency code
     * @param withdrawalMethod - Withdrawal method
     * @returns Fee calculation
     */
    calculateFees(amount: string, currency: string, withdrawalMethod: string): Promise<FeeCalculation>;

    /**
     * Validate withdrawal destination
     * @param destination - Withdrawal destination
     * @param method - Withdrawal method
     * @returns Validation result
     */
    validateDestination(destination: string, method: string): Promise<ValidationResult>;
}

/**
 * Off-ramp request
 */
export interface OffRampRequest {
    userId: string;
    amount: string;
    tokenType: string;
    currency: string;
    withdrawalMethod: string;
    destination: string;
    userInfo: UserInfo;
    metadata?: Record<string, any>;
}

/**
 * Off-ramp result
 */
export interface OffRampResult {
    transactionId: string;
    status: OffRampStatus;
    estimatedArrival: Date;
    fees: FeeCalculation;
    instructions?: string[];
    trackingInfo?: TrackingInfo;
}

/**
 * Off-ramp status
 */
export enum OffRampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired'
}

/**
 * Off-ramp completion
 */
export interface OffRampCompletion {
    transactionId: string;
    status: OffRampStatus;
    completedAt: Date;
    finalAmount: string;
    fees: FeeCalculation;
    trackingInfo?: TrackingInfo;
}

/**
 * Off-ramp cancellation
 */
export interface OffRampCancellation {
    transactionId: string;
    status: OffRampStatus;
    cancelledAt: Date;
    refundAmount?: string;
    refundMethod?: string;
}

/**
 * Withdrawal method
 */
export interface WithdrawalMethod {
    id: string;
    name: string;
    type: string;
    supportedCurrencies: string[];
    minAmount: string;
    maxAmount: string;
    processingTime: string;
    fees: FeeStructure;
    requirements: string[];
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
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions?: string[];
}

/**
 * Tracking information
 */
export interface TrackingInfo {
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
    status?: string;
}

/**
 * User information for off-ramp
 */
export interface UserInfo {
    userId: string;
    email?: string;
    phone?: string;
    name?: string;
    country?: string;
    kycStatus: string;
}
