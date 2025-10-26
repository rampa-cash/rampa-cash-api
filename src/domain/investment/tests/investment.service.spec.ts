import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentService } from '../services/investment.service';
import { InvestmentOption, InvestmentType, InvestmentRisk } from '../entities/investment-option.entity';
import { UserInvestment, InvestmentStatus } from '../entities/user-investment.entity';
import { InvestmentTransaction, TransactionType, TransactionStatus } from '../entities/investment-transaction.entity';

describe('InvestmentService', () => {
    let service: InvestmentService;
    let investmentOptionRepository: Repository<InvestmentOption>;
    let userInvestmentRepository: Repository<UserInvestment>;
    let investmentTransactionRepository: Repository<InvestmentTransaction>;

    const mockInvestmentOption = {
        id: 'option-1',
        name: 'Test Investment Option',
        description: 'Test Description',
        type: InvestmentType.TOKENIZED_ASSET,
        riskLevel: InvestmentRisk.MEDIUM,
        minInvestmentAmount: 100,
        maxInvestmentAmount: 10000,
        expectedReturn: 0.08,
        managementFee: 0.02,
        provider: 'Test Provider',
        currency: 'USDC',
        isActive: true,
        status: 'active',
    };

    const mockUserInvestment = {
        id: 'investment-1',
        userId: 'user-1',
        investmentOptionId: 'option-1',
        amount: 1000,
        currentValue: 1100,
        totalReturn: 100,
        returnPercentage: 10,
        status: InvestmentStatus.ACTIVE,
        startDate: new Date(),
    };

    const mockTransaction = {
        id: 'transaction-1',
        userId: 'user-1',
        userInvestmentId: 'investment-1',
        type: TransactionType.INVESTMENT,
        amount: 1000,
        currency: 'USDC',
        status: TransactionStatus.PENDING,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvestmentService,
                {
                    provide: getRepositoryToken(InvestmentOption),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            addOrderBy: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            getMany: jest.fn(),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(UserInvestment),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            getMany: jest.fn(),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(InvestmentTransaction),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<InvestmentService>(InvestmentService);
        investmentOptionRepository = module.get<Repository<InvestmentOption>>(
            getRepositoryToken(InvestmentOption),
        );
        userInvestmentRepository = module.get<Repository<UserInvestment>>(
            getRepositoryToken(UserInvestment),
        );
        investmentTransactionRepository = module.get<Repository<InvestmentTransaction>>(
            getRepositoryToken(InvestmentTransaction),
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllInvestmentOptions', () => {
        it('should return all investment options', async () => {
            jest.mocked(investmentOptionRepository.createQueryBuilder).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockInvestmentOption]),
            } as any);

            const result = await service.getAllInvestmentOptions();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Investment Option');
        });

        it('should filter investment options', async () => {
            jest.mocked(investmentOptionRepository.createQueryBuilder).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockInvestmentOption]),
            } as any);

            const filter = {
                type: InvestmentType.TOKENIZED_ASSET,
                riskLevel: InvestmentRisk.MEDIUM,
            };

            const result = await service.getAllInvestmentOptions(filter);

            expect(result).toHaveLength(1);
        });
    });

    describe('getInvestmentOptionById', () => {
        it('should return investment option by ID', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(mockInvestmentOption);

            const result = await service.getInvestmentOptionById('option-1');

            expect(result).toBeDefined();
            expect(result?.id).toBe('option-1');
            expect(investmentOptionRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'option-1', isActive: true },
            });
        });

        it('should return null if option not found', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(null);

            const result = await service.getInvestmentOptionById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('createUserInvestment', () => {
        it('should create user investment', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(mockInvestmentOption);
            jest.mocked(userInvestmentRepository.create).mockReturnValue(mockUserInvestment as any);
            jest.mocked(userInvestmentRepository.save).mockResolvedValue(mockUserInvestment as any);

            const result = await service.createUserInvestment('user-1', 'option-1', 1000);

            expect(result).toBeDefined();
            expect(result.userId).toBe('user-1');
            expect(result.investmentOptionId).toBe('option-1');
            expect(result.amount).toBe(1000);
            expect(userInvestmentRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                investmentOptionId: 'option-1',
                amount: 1000,
                currentValue: 1000,
                status: InvestmentStatus.PENDING,
                startDate: expect.any(Date),
            });
        });

        it('should throw error if investment option not found', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(null);

            await expect(service.createUserInvestment('user-1', 'nonexistent', 1000)).rejects.toThrow(
                'Investment option not found',
            );
        });

        it('should throw error if amount below minimum', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(mockInvestmentOption);

            await expect(service.createUserInvestment('user-1', 'option-1', 50)).rejects.toThrow(
                'Minimum investment amount is 100',
            );
        });

        it('should throw error if amount above maximum', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(mockInvestmentOption);

            await expect(service.createUserInvestment('user-1', 'option-1', 20000)).rejects.toThrow(
                'Maximum investment amount is 10000',
            );
        });
    });

    describe('getUserInvestments', () => {
        it('should return user investments', async () => {
            jest.mocked(userInvestmentRepository.find).mockResolvedValue([mockUserInvestment]);

            const result = await service.getUserInvestments('user-1');

            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe('user-1');
            expect(userInvestmentRepository.find).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                relations: ['investmentOption'],
                order: { createdAt: 'DESC' },
            });
        });

        it('should filter by status', async () => {
            jest.mocked(userInvestmentRepository.find).mockResolvedValue([mockUserInvestment]);

            const result = await service.getUserInvestments('user-1', InvestmentStatus.ACTIVE);

            expect(result).toHaveLength(1);
            expect(userInvestmentRepository.find).toHaveBeenCalledWith({
                where: { userId: 'user-1', status: InvestmentStatus.ACTIVE },
                relations: ['investmentOption'],
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('processInvestment', () => {
        it('should process investment and create transaction', async () => {
            jest.mocked(investmentOptionRepository.findOne).mockResolvedValue(mockInvestmentOption);
            jest.mocked(userInvestmentRepository.create).mockReturnValue(mockUserInvestment as any);
            jest.mocked(userInvestmentRepository.save).mockResolvedValue(mockUserInvestment as any);
            jest.mocked(investmentTransactionRepository.create).mockReturnValue(mockTransaction as any);
            jest.mocked(investmentTransactionRepository.save).mockResolvedValue(mockTransaction as any);

            const result = await service.processInvestment('user-1', 'option-1', 1000);

            expect(result).toBeDefined();
            expect(result.type).toBe(TransactionType.INVESTMENT);
            expect(result.amount).toBe(1000);
            expect(investmentTransactionRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                userInvestmentId: 'investment-1',
                type: TransactionType.INVESTMENT,
                amount: 1000,
                currency: 'USDC',
                status: TransactionStatus.PENDING,
            });
        });
    });

    describe('processWithdrawal', () => {
        it('should process withdrawal', async () => {
            jest.mocked(userInvestmentRepository.findOne).mockResolvedValue(mockUserInvestment as any);
            jest.mocked(investmentTransactionRepository.create).mockReturnValue(mockTransaction as any);
            jest.mocked(investmentTransactionRepository.save).mockResolvedValue(mockTransaction as any);

            const result = await service.processWithdrawal('user-1', 'investment-1', 500);

            expect(result).toBeDefined();
            expect(result.type).toBe(TransactionType.WITHDRAWAL);
            expect(result.amount).toBe(500);
        });

        it('should throw error if insufficient value', async () => {
            jest.mocked(userInvestmentRepository.findOne).mockResolvedValue(mockUserInvestment as any);

            await expect(service.processWithdrawal('user-1', 'investment-1', 2000)).rejects.toThrow(
                'Insufficient investment value for withdrawal',
            );
        });
    });

    describe('getUserInvestmentStats', () => {
        it('should return user investment statistics', async () => {
            jest.mocked(userInvestmentRepository.find).mockResolvedValue([mockUserInvestment]);
            jest.mocked(investmentTransactionRepository.find).mockResolvedValue([]);

            const result = await service.getUserInvestmentStats('user-1');

            expect(result).toBeDefined();
            expect(result.totalInvested).toBe(1000);
            expect(result.totalValue).toBe(1100);
            expect(result.totalReturn).toBe(100);
            expect(result.returnPercentage).toBe(10);
        });
    });

    describe('updateInvestmentValue', () => {
        it('should update investment value', async () => {
            jest.mocked(userInvestmentRepository.findOne).mockResolvedValue(mockUserInvestment as any);
            jest.mocked(userInvestmentRepository.save).mockResolvedValue(mockUserInvestment as any);

            const result = await service.updateInvestmentValue('investment-1', 1200);

            expect(result).toBeDefined();
            expect(userInvestmentRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    currentValue: 1200,
                    totalReturn: 200,
                    returnPercentage: 20,
                }),
            );
        });

        it('should throw error if investment not found', async () => {
            jest.mocked(userInvestmentRepository.findOne).mockResolvedValue(null);

            await expect(service.updateInvestmentValue('nonexistent', 1200)).rejects.toThrow(
                'Investment not found',
            );
        });
    });
});
