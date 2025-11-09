import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    InvestmentOption,
    InvestmentType,
    InvestmentRisk,
} from '../entities/investment-option.entity';
import {
    UserInvestment,
    InvestmentStatus,
} from '../entities/user-investment.entity';
import {
    InvestmentTransaction,
    TransactionType,
    TransactionStatus,
} from '../entities/investment-transaction.entity';
import {
    IInvestmentService,
    InvestmentOptionFilter,
    InvestmentStats,
    InvestmentPerformance,
} from '../interfaces/investment-service.interface';

@Injectable()
export class InvestmentService implements IInvestmentService {
    constructor(
        @InjectRepository(InvestmentOption)
        private readonly investmentOptionRepository: Repository<InvestmentOption>,
        @InjectRepository(UserInvestment)
        private readonly userInvestmentRepository: Repository<UserInvestment>,
        @InjectRepository(InvestmentTransaction)
        private readonly investmentTransactionRepository: Repository<InvestmentTransaction>,
    ) {}

    // Investment Options
    async getAllInvestmentOptions(
        filter?: InvestmentOptionFilter,
    ): Promise<InvestmentOption[]> {
        const query =
            this.investmentOptionRepository.createQueryBuilder('option');

        if (filter) {
            if (filter.type) {
                query.andWhere('option.type = :type', { type: filter.type });
            }
            if (filter.riskLevel) {
                query.andWhere('option.riskLevel = :riskLevel', {
                    riskLevel: filter.riskLevel,
                });
            }
            if (filter.minAmount) {
                query.andWhere('option.minInvestmentAmount <= :minAmount', {
                    minAmount: filter.minAmount,
                });
            }
            if (filter.maxAmount) {
                query.andWhere('option.maxInvestmentAmount >= :maxAmount', {
                    maxAmount: filter.maxAmount,
                });
            }
            if (filter.provider) {
                query.andWhere('option.provider = :provider', {
                    provider: filter.provider,
                });
            }
            if (filter.isActive !== undefined) {
                query.andWhere('option.isActive = :isActive', {
                    isActive: filter.isActive,
                });
            }
        }

        query.andWhere('option.status = :status', { status: 'active' });
        query.orderBy('option.sortOrder', 'ASC');
        query.addOrderBy('option.createdAt', 'ASC');

        return query.getMany();
    }

    async getInvestmentOptionById(
        id: string,
    ): Promise<InvestmentOption | null> {
        return this.investmentOptionRepository.findOne({
            where: { id, isActive: true },
        });
    }

    async getInvestmentOptionsByType(
        type: InvestmentType,
    ): Promise<InvestmentOption[]> {
        return this.investmentOptionRepository.find({
            where: {
                type,
                isActive: true,
                status: InvestmentStatus.ACTIVE,
            } as any,
            order: { sortOrder: 'ASC' },
        });
    }

    async getInvestmentOptionsByRisk(
        riskLevel: InvestmentRisk,
    ): Promise<InvestmentOption[]> {
        return this.investmentOptionRepository.find({
            where: {
                riskLevel,
                isActive: true,
                status: InvestmentStatus.ACTIVE,
            } as any,
            order: { sortOrder: 'ASC' },
        });
    }

    async searchInvestmentOptions(query: string): Promise<InvestmentOption[]> {
        return this.investmentOptionRepository
            .createQueryBuilder('option')
            .where('option.isActive = :isActive', { isActive: true })
            .andWhere('option.status = :status', { status: 'active' })
            .andWhere(
                '(option.name ILIKE :query OR option.description ILIKE :query)',
                { query: `%${query}%` },
            )
            .orderBy('option.sortOrder', 'ASC')
            .getMany();
    }

    // User Investments
    async getUserInvestments(
        userId: string,
        status?: InvestmentStatus,
    ): Promise<UserInvestment[]> {
        const whereCondition: any = { userId };
        if (status) {
            whereCondition.status = status;
        }

        return this.userInvestmentRepository.find({
            where: whereCondition,
            relations: ['investmentOption'],
            order: { createdAt: 'DESC' },
        });
    }

    async getUserInvestmentById(
        userId: string,
        investmentId: string,
    ): Promise<UserInvestment | null> {
        return this.userInvestmentRepository.findOne({
            where: { id: investmentId, userId },
            relations: ['investmentOption'],
        });
    }

    async createUserInvestment(
        userId: string,
        investmentOptionId: string,
        amount: number,
    ): Promise<UserInvestment> {
        const investmentOption =
            await this.getInvestmentOptionById(investmentOptionId);
        if (!investmentOption) {
            throw new NotFoundException('Investment option not found');
        }

        if (
            investmentOption.minInvestmentAmount &&
            amount < investmentOption.minInvestmentAmount
        ) {
            throw new BadRequestException(
                `Minimum investment amount is ${investmentOption.minInvestmentAmount}`,
            );
        }

        if (
            investmentOption.maxInvestmentAmount &&
            amount > investmentOption.maxInvestmentAmount
        ) {
            throw new BadRequestException(
                `Maximum investment amount is ${investmentOption.maxInvestmentAmount}`,
            );
        }

        const userInvestment = this.userInvestmentRepository.create({
            userId,
            investmentOptionId,
            amount,
            currentValue: amount,
            status: InvestmentStatus.PENDING,
            startDate: new Date(),
        });

        return this.userInvestmentRepository.save(userInvestment);
    }

    async updateInvestmentStatus(
        investmentId: string,
        status: InvestmentStatus,
    ): Promise<UserInvestment> {
        const investment = await this.userInvestmentRepository.findOne({
            where: { id: investmentId },
        });

        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        investment.status = status;
        if (status === InvestmentStatus.COMPLETED) {
            investment.endDate = new Date();
        }

        return this.userInvestmentRepository.save(investment);
    }

    async pauseInvestment(investmentId: string): Promise<UserInvestment> {
        return this.updateInvestmentStatus(
            investmentId,
            InvestmentStatus.PAUSED,
        );
    }

    async resumeInvestment(investmentId: string): Promise<UserInvestment> {
        return this.updateInvestmentStatus(
            investmentId,
            InvestmentStatus.ACTIVE,
        );
    }

    async cancelInvestment(investmentId: string): Promise<UserInvestment> {
        return this.updateInvestmentStatus(
            investmentId,
            InvestmentStatus.CANCELLED,
        );
    }

    // Investment Operations
    async processInvestment(
        userId: string,
        investmentOptionId: string,
        amount: number,
    ): Promise<InvestmentTransaction> {
        const userInvestment = await this.createUserInvestment(
            userId,
            investmentOptionId,
            amount,
        );

        const transaction = this.investmentTransactionRepository.create({
            userId,
            userInvestmentId: userInvestment.id,
            type: TransactionType.INVESTMENT,
            amount,
            currency: 'USDC', // Default currency
            status: TransactionStatus.PENDING,
        });

        return this.investmentTransactionRepository.save(transaction);
    }

    async processWithdrawal(
        userId: string,
        investmentId: string,
        amount: number,
    ): Promise<InvestmentTransaction> {
        const investment = await this.getUserInvestmentById(
            userId,
            investmentId,
        );
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        if (investment.currentValue < amount) {
            throw new BadRequestException(
                'Insufficient investment value for withdrawal',
            );
        }

        const transaction = this.investmentTransactionRepository.create({
            userId,
            userInvestmentId: investmentId,
            type: TransactionType.WITHDRAWAL,
            amount,
            currency: 'USDC',
            status: TransactionStatus.PENDING,
        });

        return this.investmentTransactionRepository.save(transaction);
    }

    async processDividend(
        userId: string,
        investmentId: string,
        amount: number,
    ): Promise<InvestmentTransaction> {
        const investment = await this.getUserInvestmentById(
            userId,
            investmentId,
        );
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        const transaction = this.investmentTransactionRepository.create({
            userId,
            userInvestmentId: investmentId,
            type: TransactionType.DIVIDEND,
            amount,
            currency: 'USDC',
            status: TransactionStatus.PENDING,
        });

        return this.investmentTransactionRepository.save(transaction);
    }

    // Statistics and Analytics
    async getUserInvestmentStats(userId: string): Promise<InvestmentStats> {
        const investments = await this.getUserInvestments(userId);

        const totalInvested = investments.reduce(
            (sum, inv) => sum + Number(inv.amount),
            0,
        );
        const totalValue = investments.reduce(
            (sum, inv) => sum + Number(inv.currentValue),
            0,
        );
        const totalReturn = investments.reduce(
            (sum, inv) => sum + Number(inv.totalReturn),
            0,
        );
        const activeInvestments = investments.filter(
            (inv) => inv.status === InvestmentStatus.ACTIVE,
        ).length;
        const completedInvestments = investments.filter(
            (inv) => inv.status === InvestmentStatus.COMPLETED,
        ).length;

        const transactions = await this.investmentTransactionRepository.find({
            where: { userId, type: TransactionType.FEE },
        });
        const totalFees = transactions.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0,
        );

        return {
            totalInvested,
            totalValue,
            totalReturn,
            returnPercentage:
                totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0,
            activeInvestments,
            completedInvestments,
            totalFees,
        };
    }

    async getUserInvestmentPerformance(
        userId: string,
    ): Promise<InvestmentPerformance[]> {
        const investments = await this.getUserInvestments(userId);

        return investments.map((inv) => {
            const daysHeld = inv.startDate
                ? Math.floor(
                      (Date.now() - inv.startDate.getTime()) /
                          (1000 * 60 * 60 * 24),
                  )
                : 0;

            return {
                investmentId: inv.id,
                name: inv.investmentOption?.name || 'Unknown',
                type:
                    inv.investmentOption?.type ||
                    InvestmentType.TOKENIZED_ASSET,
                amount: Number(inv.amount),
                currentValue: Number(inv.currentValue),
                return: Number(inv.totalReturn),
                returnPercentage: Number(inv.returnPercentage),
                daysHeld,
            };
        });
    }

    async getInvestmentOptionPerformance(optionId: string): Promise<any> {
        const investments = await this.userInvestmentRepository.find({
            where: { investmentOptionId: optionId },
        });

        const totalInvested = investments.reduce(
            (sum, inv) => sum + Number(inv.amount),
            0,
        );
        const totalValue = investments.reduce(
            (sum, inv) => sum + Number(inv.currentValue),
            0,
        );
        const totalReturn = investments.reduce(
            (sum, inv) => sum + Number(inv.totalReturn),
            0,
        );

        return {
            totalInvestments: investments.length,
            totalInvested,
            totalValue,
            totalReturn,
            averageReturn:
                investments.length > 0 ? totalReturn / investments.length : 0,
            returnPercentage:
                totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0,
        };
    }

    async getTopPerformingInvestments(
        limit: number = 10,
    ): Promise<InvestmentPerformance[]> {
        const investments = await this.userInvestmentRepository
            .createQueryBuilder('investment')
            .leftJoinAndSelect('investment.investmentOption', 'option')
            .where('investment.status = :status', {
                status: InvestmentStatus.ACTIVE,
            })
            .orderBy('investment.returnPercentage', 'DESC')
            .limit(limit)
            .getMany();

        return investments.map((inv) => {
            const daysHeld = inv.startDate
                ? Math.floor(
                      (Date.now() - inv.startDate.getTime()) /
                          (1000 * 60 * 60 * 24),
                  )
                : 0;

            return {
                investmentId: inv.id,
                name: inv.investmentOption?.name || 'Unknown',
                type:
                    inv.investmentOption?.type ||
                    InvestmentType.TOKENIZED_ASSET,
                amount: Number(inv.amount),
                currentValue: Number(inv.currentValue),
                return: Number(inv.totalReturn),
                returnPercentage: Number(inv.returnPercentage),
                daysHeld,
            };
        });
    }

    // Value Updates
    async updateInvestmentValue(
        investmentId: string,
        newValue: number,
    ): Promise<UserInvestment> {
        const investment = await this.userInvestmentRepository.findOne({
            where: { id: investmentId },
        });

        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        const previousValue = Number(investment.currentValue);
        investment.currentValue = newValue;
        investment.totalReturn = newValue - Number(investment.amount);
        investment.returnPercentage =
            Number(investment.amount) > 0
                ? (investment.totalReturn / Number(investment.amount)) * 100
                : 0;
        investment.lastValueUpdate = new Date();

        return this.userInvestmentRepository.save(investment);
    }

    async updateAllInvestmentValues(): Promise<void> {
        // This would typically integrate with external providers to get real-time values
        // For now, this is a placeholder
        console.log('Updating all investment values...');
    }

    async calculateInvestmentReturns(investmentId: string): Promise<{
        totalReturn: number;
        returnPercentage: number;
    }> {
        const investment = await this.userInvestmentRepository.findOne({
            where: { id: investmentId },
        });

        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        const totalReturn =
            Number(investment.currentValue) - Number(investment.amount);
        const returnPercentage =
            Number(investment.amount) > 0
                ? (totalReturn / Number(investment.amount)) * 100
                : 0;

        return { totalReturn, returnPercentage };
    }
}
