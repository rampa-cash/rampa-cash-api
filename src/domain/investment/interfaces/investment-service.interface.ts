import { InvestmentOption, InvestmentType, InvestmentRisk } from '../entities/investment-option.entity';
import { UserInvestment, InvestmentStatus } from '../entities/user-investment.entity';
import { InvestmentTransaction, TransactionType } from '../entities/investment-transaction.entity';

export interface InvestmentOptionFilter {
    type?: InvestmentType;
    riskLevel?: InvestmentRisk;
    minAmount?: number;
    maxAmount?: number;
    provider?: string;
    isActive?: boolean;
}

export interface InvestmentStats {
    totalInvested: number;
    totalValue: number;
    totalReturn: number;
    returnPercentage: number;
    activeInvestments: number;
    completedInvestments: number;
    totalFees: number;
}

export interface InvestmentPerformance {
    investmentId: string;
    name: string;
    type: InvestmentType;
    amount: number;
    currentValue: number;
    return: number;
    returnPercentage: number;
    daysHeld: number;
}

export interface IInvestmentService {
    // Investment Options
    getAllInvestmentOptions(filter?: InvestmentOptionFilter): Promise<InvestmentOption[]>;
    getInvestmentOptionById(id: string): Promise<InvestmentOption | null>;
    getInvestmentOptionsByType(type: InvestmentType): Promise<InvestmentOption[]>;
    getInvestmentOptionsByRisk(riskLevel: InvestmentRisk): Promise<InvestmentOption[]>;
    searchInvestmentOptions(query: string): Promise<InvestmentOption[]>;

    // User Investments
    getUserInvestments(userId: string, status?: InvestmentStatus): Promise<UserInvestment[]>;
    getUserInvestmentById(userId: string, investmentId: string): Promise<UserInvestment | null>;
    createUserInvestment(
        userId: string,
        investmentOptionId: string,
        amount: number,
    ): Promise<UserInvestment>;
    updateInvestmentStatus(
        investmentId: string,
        status: InvestmentStatus,
    ): Promise<UserInvestment>;
    pauseInvestment(investmentId: string): Promise<UserInvestment>;
    resumeInvestment(investmentId: string): Promise<UserInvestment>;
    cancelInvestment(investmentId: string): Promise<UserInvestment>;

    // Investment Operations
    processInvestment(
        userId: string,
        investmentOptionId: string,
        amount: number,
    ): Promise<InvestmentTransaction>;
    processWithdrawal(
        userId: string,
        investmentId: string,
        amount: number,
    ): Promise<InvestmentTransaction>;
    processDividend(
        userId: string,
        investmentId: string,
        amount: number,
    ): Promise<InvestmentTransaction>;

    // Statistics and Analytics
    getUserInvestmentStats(userId: string): Promise<InvestmentStats>;
    getUserInvestmentPerformance(userId: string): Promise<InvestmentPerformance[]>;
    getInvestmentOptionPerformance(optionId: string): Promise<any>;
    getTopPerformingInvestments(limit?: number): Promise<InvestmentPerformance[]>;

    // Value Updates
    updateInvestmentValue(investmentId: string, newValue: number): Promise<UserInvestment>;
    updateAllInvestmentValues(): Promise<void>;
    calculateInvestmentReturns(investmentId: string): Promise<{
        totalReturn: number;
        returnPercentage: number;
    }>;
}
