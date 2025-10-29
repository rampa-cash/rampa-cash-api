import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningController } from '../controllers/learning.controller';
import { LearningService } from '../services/learning.service';
import { BonkRewardService } from '../services/bonk-reward.service';
import { LearningModule as LearningModuleEntity } from '../entities/learning-module.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { BonkReward } from '../entities/bonk-reward.entity';
import { LearningCategory, LearningDifficulty } from '../entities/learning-module.entity';
import { RewardStatus } from '../entities/bonk-reward.entity';

describe('Learning Integration Tests', () => {
    let app: TestingModule;
    let learningController: LearningController;
    let learningService: LearningService;
    let bonkRewardService: BonkRewardService;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [LearningModuleEntity, LearningProgress, BonkReward],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([LearningModuleEntity, LearningProgress, BonkReward]),
            ],
            controllers: [LearningController],
            providers: [LearningService, BonkRewardService],
        }).compile();

        learningController = app.get<LearningController>(LearningController);
        learningService = app.get<LearningService>(LearningService);
        bonkRewardService = app.get<BonkRewardService>(BonkRewardService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Learning Module Flow', () => {
        it('should create and retrieve learning modules', async () => {
            // Create a test module
            const moduleData = {
                title: 'Crypto Basics',
                description: 'Learn the fundamentals of cryptocurrency',
                category: LearningCategory.CRYPTO_BASICS,
                difficulty: LearningDifficulty.BEGINNER,
                estimatedDuration: 30,
                rewardAmount: 1000,
                isActive: true,
                sortOrder: 0,
            };

            const createdModule = await learningService.createModule(moduleData);
            expect(createdModule).toBeDefined();
            expect(createdModule.title).toBe('Crypto Basics');

            // Retrieve all modules
            const modules = await learningController.getAllModules();
            expect(modules).toHaveLength(1);
            expect(modules[0].title).toBe('Crypto Basics');
        });

        it('should handle user progress through learning modules', async () => {
            // Create a test module
            const moduleData = {
                title: 'Advanced Trading',
                description: 'Learn advanced trading strategies',
                category: LearningCategory.TRADING,
                difficulty: LearningDifficulty.ADVANCED,
                estimatedDuration: 60,
                rewardAmount: 2000,
                isActive: true,
                sortOrder: 1,
            };

            const module = await learningService.createModule(moduleData);
            const userId = 'test-user-1';

            // Start module
            const progress = await learningService.startModule(userId, module.id);
            expect(progress).toBeDefined();
            expect(progress.userId).toBe(userId);
            expect(progress.moduleId).toBe(module.id);
            expect(progress.progress).toBe(0);
            expect(progress.isCompleted).toBe(false);

            // Update progress
            const updatedProgress = await learningService.updateProgress(
                userId,
                module.id,
                50,
            );
            expect(updatedProgress.progress).toBe(50);

            // Complete module
            const completedProgress = await learningService.completeModule(
                userId,
                module.id,
            );
            expect(completedProgress.isCompleted).toBe(true);
            expect(completedProgress.progress).toBe(100);
        });

        it('should process BONK rewards for completed modules', async () => {
            // Create a test module
            const moduleData = {
                title: 'DeFi Fundamentals',
                description: 'Learn about decentralized finance',
                category: LearningCategory.DEFI,
                difficulty: LearningDifficulty.INTERMEDIATE,
                estimatedDuration: 45,
                rewardAmount: 1500,
                isActive: true,
                sortOrder: 2,
            };

            const module = await learningService.createModule(moduleData);
            const userId = 'test-user-2';

            // Start and complete module
            await learningService.startModule(userId, module.id);
            await learningService.completeModule(userId, module.id);

            // Process rewards
            const reward = await learningService.processRewards(userId, module.id);
            expect(reward).toBeDefined();
            expect(reward.userId).toBe(userId);
            expect(reward.moduleId).toBe(module.id);
            expect(reward.amount).toBe(1500);
            expect(reward.status).toBe(RewardStatus.PENDING);
        });

        it('should provide user learning statistics', async () => {
            const userId = 'test-user-3';

            // Create multiple modules
            const modules = [
                {
                    title: 'Module 1',
                    description: 'Test module 1',
                    category: LearningCategory.CRYPTO_BASICS,
                    difficulty: LearningDifficulty.BEGINNER,
                    estimatedDuration: 30,
                    rewardAmount: 1000,
                    isActive: true,
                    sortOrder: 3,
                },
                {
                    title: 'Module 2',
                    description: 'Test module 2',
                    category: LearningCategory.TRADING,
                    difficulty: LearningDifficulty.INTERMEDIATE,
                    estimatedDuration: 45,
                    rewardAmount: 1500,
                    isActive: true,
                    sortOrder: 4,
                },
            ];

            for (const moduleData of modules) {
                const module = await learningService.createModule(moduleData);
                await learningService.startModule(userId, module.id);
                await learningService.completeModule(userId, module.id);
                await learningService.processRewards(userId, module.id);
            }

            // Get user stats
            const stats = await learningService.getUserStats(userId);
            expect(stats).toBeDefined();
            expect(stats.completedModules).toBe(2);
            expect(stats.totalBonkEarned).toBe(2500);
        });

        it('should search learning modules', async () => {
            // Create modules with different titles
            const modules = [
                {
                    title: 'Bitcoin Fundamentals',
                    description: 'Learn about Bitcoin',
                    category: LearningCategory.CRYPTO_BASICS,
                    difficulty: LearningDifficulty.BEGINNER,
                    estimatedDuration: 30,
                    rewardAmount: 1000,
                    isActive: true,
                    sortOrder: 5,
                },
                {
                    title: 'Ethereum Smart Contracts',
                    description: 'Learn about Ethereum',
                    category: LearningCategory.CRYPTO_BASICS,
                    difficulty: LearningDifficulty.INTERMEDIATE,
                    estimatedDuration: 45,
                    rewardAmount: 1500,
                    isActive: true,
                    sortOrder: 6,
                },
            ];

            for (const moduleData of modules) {
                await learningService.createModule(moduleData);
            }

            // Search for Bitcoin-related modules
            const searchResults = await learningService.searchModules('Bitcoin');
            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].title).toBe('Bitcoin Fundamentals');
        });

        it('should filter modules by category and difficulty', async () => {
            // Get modules by category
            const cryptoModules = await learningController.getModulesByCategory(
                'crypto_basics',
            );
            expect(cryptoModules.length).toBeGreaterThan(0);

            // Get modules by difficulty
            const beginnerModules = await learningController.getModulesByDifficulty(
                'beginner',
            );
            expect(beginnerModules.length).toBeGreaterThan(0);
        });
    });

    describe('BONK Reward System', () => {
        it('should create and track BONK rewards', async () => {
            const userId = 'test-user-4';
            const moduleId = 'test-module-1';

            // Create reward
            const reward = await bonkRewardService.createReward(
                userId,
                moduleId,
                1000,
            );
            expect(reward).toBeDefined();
            expect(reward.userId).toBe(userId);
            expect(reward.amount).toBe(1000);
            expect(reward.status).toBe(RewardStatus.PENDING);

            // Get user rewards
            const userRewards = await bonkRewardService.getUserRewards(userId);
            expect(userRewards).toHaveLength(1);
            expect(userRewards[0].amount).toBe(1000);

            // Update reward status
            const updatedReward = await bonkRewardService.updateRewardStatus(
                reward.id,
                RewardStatus.CONFIRMED,
            );
            expect(updatedReward.status).toBe(RewardStatus.CONFIRMED);
        });

        it('should provide reward statistics', async () => {
            // Create multiple rewards
            const rewards = [
                { userId: 'user-1', moduleId: 'module-1', amount: 1000 },
                { userId: 'user-2', moduleId: 'module-2', amount: 1500 },
                { userId: 'user-3', moduleId: 'module-3', amount: 2000 },
            ];

            for (const rewardData of rewards) {
                await bonkRewardService.createReward(
                    rewardData.userId,
                    rewardData.moduleId,
                    rewardData.amount,
                );
            }

            // Get reward stats
            const stats = await bonkRewardService.getRewardStats();
            expect(stats).toBeDefined();
            expect(stats.totalRewards).toBe(3);

            // Get top earners
            const topEarners = await bonkRewardService.getTopEarners(10);
            expect(topEarners).toBeDefined();
        });
    });
});
