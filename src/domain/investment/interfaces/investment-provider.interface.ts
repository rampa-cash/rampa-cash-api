import { InvestmentOption } from '../entities/investment-option.entity';
import { UserInvestment } from '../entities/user-investment.entity';
import { InvestmentTransaction } from '../entities/investment-transaction.entity';

export interface InvestmentProviderConfig {
    apiKey: string;
    apiUrl: string;
    environment: 'sandbox' | 'production';
    timeout?: number;
    retries?: number;
}

export interface InvestmentProviderResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    externalId?: string;
    metadata?: Record<string, any>;
}

export interface InvestmentOptionData {
    name: string;
    description: string;
    type: string;
    riskLevel: string;
    minAmount: number;
    maxAmount: number;
    expectedReturn: number;
    managementFee: number;
    currency: string;
    metadata?: Record<string, any>;
}

export interface InvestmentRequest {
    userId: string;
    optionId: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
    userId: string;
    investmentId: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
}

export interface InvestmentValueUpdate {
    investmentId: string;
    currentValue: number;
    returnAmount: number;
    returnPercentage: number;
    lastUpdated: Date;
}

export interface IInvestmentProvider {
    // Provider Management
    initialize(config: InvestmentProviderConfig): Promise<void>;
    isHealthy(): Promise<boolean>;
    getProviderInfo(): { name: string; version: string; capabilities: string[] };

    // Investment Options
    getInvestmentOptions(): Promise<InvestmentProviderResponse<InvestmentOptionData[]>>;
    getInvestmentOption(optionId: string): Promise<InvestmentProviderResponse<InvestmentOptionData>>;
    createInvestmentOption(optionData: InvestmentOptionData): Promise<InvestmentProviderResponse<string>>;
    updateInvestmentOption(optionId: string, optionData: Partial<InvestmentOptionData>): Promise<InvestmentProviderResponse<boolean>>;
    deleteInvestmentOption(optionId: string): Promise<InvestmentProviderResponse<boolean>>;

    // Investment Operations
    createInvestment(request: InvestmentRequest): Promise<InvestmentProviderResponse<{
        investmentId: string;
        externalTransactionId: string;
        status: string;
    }>>;
    processInvestment(investmentId: string): Promise<InvestmentProviderResponse<{
        status: string;
        externalTransactionId: string;
    }>>;
    cancelInvestment(investmentId: string): Promise<InvestmentProviderResponse<boolean>>;

    // Withdrawal Operations
    createWithdrawal(request: WithdrawalRequest): Promise<InvestmentProviderResponse<{
        withdrawalId: string;
        externalTransactionId: string;
        status: string;
    }>>;
    processWithdrawal(withdrawalId: string): Promise<InvestmentProviderResponse<{
        status: string;
        externalTransactionId: string;
    }>>;
    cancelWithdrawal(withdrawalId: string): Promise<InvestmentProviderResponse<boolean>>;

    // Value and Performance
    getInvestmentValue(investmentId: string): Promise<InvestmentProviderResponse<{
        currentValue: number;
        returnAmount: number;
        returnPercentage: number;
        lastUpdated: Date;
    }>>;
    getAllInvestmentValues(userId: string): Promise<InvestmentProviderResponse<InvestmentValueUpdate[]>>;
    updateInvestmentValue(investmentId: string): Promise<InvestmentProviderResponse<InvestmentValueUpdate>>;

    // Transaction Management
    getTransactionStatus(transactionId: string): Promise<InvestmentProviderResponse<{
        status: string;
        externalTransactionId: string;
        processedAt?: Date;
        failureReason?: string;
    }>>;
    getInvestmentTransactions(investmentId: string): Promise<InvestmentProviderResponse<{
        transactions: Array<{
            id: string;
            type: string;
            amount: number;
            status: string;
            createdAt: Date;
            processedAt?: Date;
        }>;
    }>>;

    // Reporting and Analytics
    getInvestmentPerformance(investmentId: string, period?: string): Promise<InvestmentProviderResponse<{
        totalReturn: number;
        returnPercentage: number;
        periodReturn: number;
        periodReturnPercentage: number;
        volatility: number;
        sharpeRatio: number;
    }>>;
    getPortfolioPerformance(userId: string): Promise<InvestmentProviderResponse<{
        totalValue: number;
        totalReturn: number;
        returnPercentage: number;
        diversification: number;
        riskScore: number;
    }>>;
}
