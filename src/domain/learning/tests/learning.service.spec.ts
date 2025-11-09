import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningService } from '../services/learning.service';
import {
    LearningModule as LearningModuleEntity,
    LearningCategory,
    LearningDifficulty,
} from '../entities/learning-module.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { BonkReward, RewardStatus } from '../entities/bonk-reward.entity';

describe('LearningService', () => {
    let service: LearningService;
    let moduleRepository: Repository<LearningModuleEntity>;
    let progressRepository: Repository<LearningProgress>;
    let rewardRepository: Repository<BonkReward>;

    const mockModule = {
        id: 'module-1',
        title: 'Test Module',
        description: 'Test Description',
        category: LearningCategory.CRYPTO_BASICS,
        difficulty: LearningDifficulty.BEGINNER,
        estimatedDuration: 30,
        rewardAmount: 1000,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        moduleId: 'module-1',
        progress: 50,
        isCompleted: false,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        timeSpent: 15,
    };

    const mockReward = {
        id: 'reward-1',
        userId: 'user-1',
        moduleId: 'module-1',
        amount: 1000,
        status: RewardStatus.PENDING,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LearningService,
                {
                    provide: getRepositoryToken(LearningModuleEntity),
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
                            select: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            getRawMany: jest.fn(),
                            getRawOne: jest.fn(),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(LearningProgress),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(BonkReward),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            select: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            getRawMany: jest.fn(),
                            getRawOne: jest.fn(),
                        })),
                    },
                },
            ],
        }).compile();

        service = module.get<LearningService>(LearningService);
        moduleRepository = module.get<Repository<LearningModuleEntity>>(
            getRepositoryToken(LearningModuleEntity),
        );
        progressRepository = module.get<Repository<LearningProgress>>(
            getRepositoryToken(LearningProgress),
        );
        rewardRepository = module.get<Repository<BonkReward>>(
            getRepositoryToken(BonkReward),
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllModules', () => {
        it('should return all active learning modules', async () => {
            jest.mocked(moduleRepository.find).mockResolvedValue([mockModule]);

            const result = await service.getAllModules();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('module-1');
            expect(result[0].title).toBe('Test Module');
            expect(moduleRepository.find).toHaveBeenCalledWith({
                where: { isActive: true },
                order: { sortOrder: 'ASC', createdAt: 'ASC' },
            });
        });
    });

    describe('getModulesByCategory', () => {
        it('should return modules filtered by category', async () => {
            jest.mocked(moduleRepository.find).mockResolvedValue([mockModule]);

            const result = await service.getModulesByCategory('crypto_basics');

            expect(result).toHaveLength(1);
            expect(moduleRepository.find).toHaveBeenCalledWith({
                where: { category: 'crypto_basics', isActive: true },
                order: { sortOrder: 'ASC', createdAt: 'ASC' },
            });
        });
    });

    describe('getModulesByDifficulty', () => {
        it('should return modules filtered by difficulty', async () => {
            jest.mocked(moduleRepository.find).mockResolvedValue([mockModule]);

            const result = await service.getModulesByDifficulty('beginner');

            expect(result).toHaveLength(1);
            expect(moduleRepository.find).toHaveBeenCalledWith({
                where: { difficulty: 'beginner', isActive: true },
                order: { sortOrder: 'ASC', createdAt: 'ASC' },
            });
        });
    });

    describe('getModuleById', () => {
        it('should return a specific module by ID', async () => {
            jest.mocked(moduleRepository.findOne).mockResolvedValue(mockModule);

            const result = await service.getModuleById('module-1');

            expect(result).toBeDefined();
            expect(result?.id).toBe('module-1');
            expect(moduleRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'module-1', isActive: true },
            });
        });

        it('should return null if module not found', async () => {
            jest.mocked(moduleRepository.findOne).mockResolvedValue(null);

            const result = await service.getModuleById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getUserProgress', () => {
        it('should return user learning progress', async () => {
            jest.mocked(progressRepository.find).mockResolvedValue([
                mockProgress,
            ]);

            const result = await service.getUserProgress('user-1');

            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe('user-1');
            expect(progressRepository.find).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                relations: ['module'],
                order: { lastAccessedAt: 'DESC' },
            });
        });
    });

    describe('startModule', () => {
        it('should start a new learning module', async () => {
            jest.mocked(moduleRepository.findOne).mockResolvedValue(mockModule);
            jest.mocked(progressRepository.findOne).mockResolvedValue(null);
            jest.mocked(progressRepository.create).mockReturnValue(
                mockProgress as any,
            );
            jest.mocked(progressRepository.save).mockResolvedValue(
                mockProgress as any,
            );

            const result = await service.startModule('user-1', 'module-1');

            expect(result).toBeDefined();
            expect(result.userId).toBe('user-1');
            expect(result.moduleId).toBe('module-1');
            expect(progressRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                moduleId: 'module-1',
                progress: 0,
                isCompleted: false,
                startedAt: expect.any(Date),
                lastAccessedAt: expect.any(Date),
                timeSpent: 0,
            });
        });

        it('should update existing progress if already started', async () => {
            jest.mocked(moduleRepository.findOne).mockResolvedValue(mockModule);
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                mockProgress as any,
            );
            jest.mocked(progressRepository.save).mockResolvedValue(
                mockProgress as any,
            );

            const result = await service.startModule('user-1', 'module-1');

            expect(result).toBeDefined();
            expect(progressRepository.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException if module not found', async () => {
            jest.mocked(moduleRepository.findOne).mockResolvedValue(null);

            await expect(
                service.startModule('user-1', 'nonexistent'),
            ).rejects.toThrow('Learning module with ID nonexistent not found');
        });
    });

    describe('updateProgress', () => {
        it('should update learning progress', async () => {
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                mockProgress as any,
            );
            jest.mocked(progressRepository.save).mockResolvedValue(
                mockProgress as any,
            );

            const result = await service.updateProgress(
                'user-1',
                'module-1',
                75,
            );

            expect(result).toBeDefined();
            expect(progressRepository.save).toHaveBeenCalled();
        });

        it('should mark as completed when progress reaches 100%', async () => {
            const completedProgress = {
                ...mockProgress,
                progress: 100,
                isCompleted: true,
            };
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                mockProgress as any,
            );
            jest.mocked(progressRepository.save).mockResolvedValue(
                completedProgress as any,
            );

            const result = await service.updateProgress(
                'user-1',
                'module-1',
                100,
            );

            expect(result).toBeDefined();
            expect(progressRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    progress: 100,
                    isCompleted: true,
                    completedAt: expect.any(Date),
                }),
            );
        });

        it('should throw BadRequestException for invalid progress', async () => {
            await expect(
                service.updateProgress('user-1', 'module-1', 150),
            ).rejects.toThrow('Progress must be between 0 and 100');
        });

        it('should throw NotFoundException if progress not found', async () => {
            jest.mocked(progressRepository.findOne).mockResolvedValue(null);

            await expect(
                service.updateProgress('user-1', 'module-1', 50),
            ).rejects.toThrow(
                'No progress found for user user-1 and module module-1',
            );
        });
    });

    describe('completeModule', () => {
        it('should complete a learning module', async () => {
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                mockProgress as any,
            );
            jest.mocked(progressRepository.save).mockResolvedValue(
                mockProgress as any,
            );

            const result = await service.completeModule('user-1', 'module-1');

            expect(result).toBeDefined();
            expect(progressRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    progress: 100,
                    isCompleted: true,
                    completedAt: expect.any(Date),
                }),
            );
        });
    });

    describe('getUserStats', () => {
        it('should return user learning statistics', async () => {
            jest.mocked(moduleRepository.count).mockResolvedValue(10);
            jest.mocked(progressRepository.count).mockResolvedValue(5);
            jest.mocked(rewardRepository.count).mockResolvedValue(3);
            jest.mocked(progressRepository.find).mockResolvedValue([
                mockProgress as any,
            ]);
            jest.mocked(rewardRepository.createQueryBuilder).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
            } as any);

            const result = await service.getUserStats('user-1');

            expect(result).toBeDefined();
            expect(result.totalModules).toBe(10);
            expect(result.completedModules).toBe(5);
            expect(result.totalRewards).toBe(3);
            expect(result.totalBonkEarned).toBe(5000);
        });
    });

    describe('processRewards', () => {
        it('should process BONK rewards for completed module', async () => {
            const completedProgress = { ...mockProgress, isCompleted: true };
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                completedProgress as any,
            );
            jest.mocked(moduleRepository.findOne).mockResolvedValue(mockModule);
            jest.mocked(rewardRepository.findOne).mockResolvedValue(null);
            jest.mocked(rewardRepository.create).mockReturnValue(
                mockReward as any,
            );
            jest.mocked(rewardRepository.save).mockResolvedValue(
                mockReward as any,
            );

            const result = await service.processRewards('user-1', 'module-1');

            expect(result).toBeDefined();
            expect(result.userId).toBe('user-1');
            expect(result.moduleId).toBe('module-1');
            expect(rewardRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                moduleId: 'module-1',
                amount: 1000,
                status: RewardStatus.PENDING,
            });
        });

        it('should throw BadRequestException if module not completed', async () => {
            jest.mocked(progressRepository.findOne).mockResolvedValue(
                mockProgress as any,
            );

            await expect(
                service.processRewards('user-1', 'module-1'),
            ).rejects.toThrow(
                'Module module-1 is not completed by user user-1',
            );
        });
    });

    describe('searchModules', () => {
        it('should search learning modules by query', async () => {
            jest.mocked(moduleRepository.createQueryBuilder).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockModule]),
            } as any);

            const result = await service.searchModules('crypto');

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Test Module');
        });
    });
});
