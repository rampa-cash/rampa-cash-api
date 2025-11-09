import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentController } from '../controllers/investment.controller';
import { InvestmentService } from '../services/investment.service';
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
} from '../entities/investment-transaction.entity';

describe('Investment Integration Tests', () => {
    let app: TestingModule;
    let investmentController: InvestmentController;
    let investmentService: InvestmentService;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [
                        InvestmentOption,
                        UserInvestment,
                        InvestmentTransaction,
                    ],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([
                    InvestmentOption,
                    UserInvestment,
                    InvestmentTransaction,
                ]),
            ],
            controllers: [InvestmentController],
            providers: [InvestmentService],
        }).compile();

        investmentController =
            app.get<InvestmentController>(InvestmentController);
        investmentService = app.get<InvestmentService>(InvestmentService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Investment Options Management', () => {
        it('should create and retrieve investment options', async () => {
            // Create test investment options
            const options = [
                {
                    name: 'Tokenized Gold ETF',
                    description: 'Invest in tokenized gold',
                    type: InvestmentType.TOKENIZED_ETF,
                    riskLevel: InvestmentRisk.LOW,
                    minInvestmentAmount: 100,
                    maxInvestmentAmount: 10000,
                    expectedReturn: 0.05,
                    managementFee: 0.01,
                    provider: 'GoldProvider',
                    currency: 'USDC',
                    isActive: true,
                    status: 'active',
                    sortOrder: 0,
                },
                {
                    name: 'Crypto Growth Fund',
                    description: 'High-growth crypto fund',
                    type: InvestmentType.CRYPTO_FUND,
                    riskLevel: InvestmentRisk.HIGH,
                    minInvestmentAmount: 500,
                    maxInvestmentAmount: 50000,
                    expectedReturn: 0.15,
                    managementFee: 0.03,
                    provider: 'CryptoProvider',
                    currency: 'USDC',
                    isActive: true,
                    status: 'active',
                    sortOrder: 1,
                },
            ];

            for (const optionData of options) {
                const option =
                    await investmentService.createInvestmentOption(optionData);
                expect(option).toBeDefined();
                expect(option.name).toBe(optionData.name);
            }

            // Get all options
            const allOptions =
                await investmentController.getAllInvestmentOptions();
            expect(allOptions).toHaveLength(2);

            // Filter by type
            const etfOptions =
                await investmentController.getInvestmentOptionsByType(
                    InvestmentType.TOKENIZED_ETF,
                );
            expect(etfOptions).toHaveLength(1);
            expect(etfOptions[0].name).toBe('Tokenized Gold ETF');

            // Filter by risk level
            const highRiskOptions =
                await investmentController.getInvestmentOptionsByRisk(
                    InvestmentRisk.HIGH,
                );
            expect(highRiskOptions).toHaveLength(1);
            expect(highRiskOptions[0].name).toBe('Crypto Growth Fund');

            // Search options
            const searchResults =
                await investmentController.searchInvestmentOptions({
                    query: 'Gold',
                });
            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].name).toBe('Tokenized Gold ETF');
        });
    });

    describe('User Investment Flow', () => {
        it('should handle complete investment lifecycle', async () => {
            // Create investment option
            const optionData = {
                name: 'Test Investment',
                description: 'Test investment option',
                type: InvestmentType.TOKENIZED_ASSET,
                riskLevel: InvestmentRisk.MEDIUM,
                minInvestmentAmount: 100,
                maxInvestmentAmount: 10000,
                expectedReturn: 0.08,
                managementFee: 0.02,
                provider: 'TestProvider',
                currency: 'USDC',
                isActive: true,
                status: 'active',
                sortOrder: 0,
            };

            const option =
                await investmentService.createInvestmentOption(optionData);
            const userId = 'test-user-1';

            // Create investment
            const investment = await investmentService.createUserInvestment(
                userId,
                option.id,
                1000,
            );
            expect(investment).toBeDefined();
            expect(investment.userId).toBe(userId);
            expect(investment.amount).toBe(1000);
            expect(investment.status).toBe(InvestmentStatus.PENDING);

            // Process investment
            const transaction = await investmentService.processInvestment(
                userId,
                option.id,
                1000,
            );
            expect(transaction).toBeDefined();
            expect(transaction.type).toBe(TransactionType.INVESTMENT);
            expect(transaction.amount).toBe(1000);

            // Update investment status to active
            const activeInvestment =
                await investmentService.updateInvestmentStatus(
                    investment.id,
                    InvestmentStatus.ACTIVE,
                );
            expect(activeInvestment.status).toBe(InvestmentStatus.ACTIVE);

            // Update investment value
            const updatedInvestment =
                await investmentService.updateInvestmentValue(
                    investment.id,
                    1100,
                );
            expect(updatedInvestment.currentValue).toBe(1100);
            expect(updatedInvestment.totalReturn).toBe(100);
            expect(updatedInvestment.returnPercentage).toBe(10);

            // Pause investment
            const pausedInvestment = await investmentService.pauseInvestment(
                investment.id,
            );
            expect(pausedInvestment.status).toBe(InvestmentStatus.PAUSED);

            // Resume investment
            const resumedInvestment = await investmentService.resumeInvestment(
                investment.id,
            );
            expect(resumedInvestment.status).toBe(InvestmentStatus.ACTIVE);

            // Process withdrawal
            const withdrawal = await investmentService.processWithdrawal(
                userId,
                investment.id,
                200,
            );
            expect(withdrawal).toBeDefined();
            expect(withdrawal.type).toBe(TransactionType.WITHDRAWAL);
            expect(withdrawal.amount).toBe(200);

            // Cancel investment
            const cancelledInvestment =
                await investmentService.cancelInvestment(investment.id);
            expect(cancelledInvestment.status).toBe(InvestmentStatus.CANCELLED);
        });
    });

    describe('Investment Statistics and Analytics', () => {
        it('should provide investment statistics', async () => {
            const userId = 'test-user-2';

            // Create multiple investments
            const options = [
                {
                    name: 'Option 1',
                    description: 'Test option 1',
                    type: InvestmentType.TOKENIZED_ASSET,
                    riskLevel: InvestmentRisk.LOW,
                    minInvestmentAmount: 100,
                    maxInvestmentAmount: 10000,
                    expectedReturn: 0.05,
                    managementFee: 0.01,
                    provider: 'Provider1',
                    currency: 'USDC',
                    isActive: true,
                    status: 'active',
                    sortOrder: 0,
                },
                {
                    name: 'Option 2',
                    description: 'Test option 2',
                    type: InvestmentType.CRYPTO_FUND,
                    riskLevel: InvestmentRisk.HIGH,
                    minInvestmentAmount: 500,
                    maxInvestmentAmount: 50000,
                    expectedReturn: 0.15,
                    managementFee: 0.03,
                    provider: 'Provider2',
                    currency: 'USDC',
                    isActive: true,
                    status: 'active',
                    sortOrder: 1,
                },
            ];

            const createdOptions = [];
            for (const optionData of options) {
                const option =
                    await investmentService.createInvestmentOption(optionData);
                createdOptions.push(option);
            }

            // Create investments
            const investments = [];
            for (let i = 0; i < createdOptions.length; i++) {
                const investment = await investmentService.createUserInvestment(
                    userId,
                    createdOptions[i].id,
                    1000 * (i + 1),
                );
                investments.push(investment);

                // Update to active status
                await investmentService.updateInvestmentStatus(
                    investment.id,
                    InvestmentStatus.ACTIVE,
                );

                // Update values with different returns
                const newValue = 1000 * (i + 1) * (1.1 + i * 0.05); // 10% and 15% returns
                await investmentService.updateInvestmentValue(
                    investment.id,
                    newValue,
                );
            }

            // Get user stats
            const stats =
                await investmentService.getUserInvestmentStats(userId);
            expect(stats).toBeDefined();
            expect(stats.totalInvested).toBe(3000); // 1000 + 2000
            expect(stats.activeInvestments).toBe(2);
            expect(stats.returnPercentage).toBeGreaterThan(0);

            // Get user performance
            const performance =
                await investmentService.getUserInvestmentPerformance(userId);
            expect(performance).toHaveLength(2);
            expect(performance[0].amount).toBe(1000);
            expect(performance[1].amount).toBe(2000);

            // Get top performing investments
            const topPerforming =
                await investmentService.getTopPerformingInvestments(5);
            expect(topPerforming).toBeDefined();
        });
    });

    describe('Investment Option Performance', () => {
        it('should track investment option performance', async () => {
            // Create investment option
            const optionData = {
                name: 'Performance Test Option',
                description: 'Test option for performance tracking',
                type: InvestmentType.TOKENIZED_ETF,
                riskLevel: InvestmentRisk.MEDIUM,
                minInvestmentAmount: 100,
                maxInvestmentAmount: 10000,
                expectedReturn: 0.08,
                managementFee: 0.02,
                provider: 'PerformanceProvider',
                currency: 'USDC',
                isActive: true,
                status: 'active',
                sortOrder: 0,
            };

            const option =
                await investmentService.createInvestmentOption(optionData);

            // Create multiple investments for this option
            const userIds = ['user-1', 'user-2', 'user-3'];
            const amounts = [1000, 2000, 1500];

            for (let i = 0; i < userIds.length; i++) {
                const investment = await investmentService.createUserInvestment(
                    userIds[i],
                    option.id,
                    amounts[i],
                );

                // Update to active status
                await investmentService.updateInvestmentStatus(
                    investment.id,
                    InvestmentStatus.ACTIVE,
                );

                // Update with different returns
                const returnMultiplier = 1.05 + i * 0.02; // 5%, 7%, 9% returns
                const newValue = amounts[i] * returnMultiplier;
                await investmentService.updateInvestmentValue(
                    investment.id,
                    newValue,
                );
            }

            // Get option performance
            const performance =
                await investmentService.getInvestmentOptionPerformance(
                    option.id,
                );
            expect(performance).toBeDefined();
            expect(performance.totalInvestments).toBe(3);
            expect(performance.totalInvested).toBe(4500); // 1000 + 2000 + 1500
            expect(performance.returnPercentage).toBeGreaterThan(0);
        });
    });
});
