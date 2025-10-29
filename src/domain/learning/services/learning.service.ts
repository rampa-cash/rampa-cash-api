import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningModule, LearningCategory, LearningDifficulty } from '../entities/learning-module.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { BonkReward, RewardStatus } from '../entities/bonk-reward.entity';
import {
    LearningServiceInterface,
    LearningModuleInfo,
    LearningProgressInfo,
    BonkRewardInfo,
    LearningStats,
} from '../interfaces/learning-service.interface';

@Injectable()
export class LearningService implements LearningServiceInterface {
    constructor(
        @InjectRepository(LearningModule)
        private readonly moduleRepository: Repository<LearningModule>,
        @InjectRepository(LearningProgress)
        private readonly progressRepository: Repository<LearningProgress>,
        @InjectRepository(BonkReward)
        private readonly rewardRepository: Repository<BonkReward>,
    ) {}

    /**
     * Get all available learning modules
     */
    async getAllModules(): Promise<LearningModuleInfo[]> {
        const modules = await this.moduleRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });

        return modules.map(this.mapModuleToInfo);
    }

    /**
     * Get learning modules by category
     */
    async getModulesByCategory(category: string): Promise<LearningModuleInfo[]> {
        const modules = await this.moduleRepository.find({
            where: { category: category as LearningCategory, isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });

        return modules.map(this.mapModuleToInfo);
    }

    /**
     * Get learning modules by difficulty
     */
    async getModulesByDifficulty(
        difficulty: 'beginner' | 'intermediate' | 'advanced',
    ): Promise<LearningModuleInfo[]> {
        const modules = await this.moduleRepository.find({
            where: { difficulty: difficulty as LearningDifficulty, isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });

        return modules.map(this.mapModuleToInfo);
    }

    /**
     * Get a specific learning module by ID
     */
    async getModuleById(moduleId: string): Promise<LearningModuleInfo | null> {
        const module = await this.moduleRepository.findOne({
            where: { id: moduleId, isActive: true },
        });

        return module ? this.mapModuleToInfo(module) : null;
    }

    /**
     * Get user's learning progress
     */
    async getUserProgress(userId: string): Promise<LearningProgressInfo[]> {
        const progress = await this.progressRepository.find({
            where: { userId },
            relations: ['module'],
            order: { lastAccessedAt: 'DESC' },
        });

        return progress.map(this.mapProgressToInfo);
    }

    /**
     * Get user's progress for a specific module
     */
    async getModuleProgress(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo | null> {
        const progress = await this.progressRepository.findOne({
            where: { userId, moduleId },
            relations: ['module'],
        });

        return progress ? this.mapProgressToInfo(progress) : null;
    }

    /**
     * Start a learning module
     */
    async startModule(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo> {
        // Check if module exists
        const module = await this.moduleRepository.findOne({
            where: { id: moduleId, isActive: true },
        });

        if (!module) {
            throw new NotFoundException(`Learning module with ID ${moduleId} not found`);
        }

        // Check if user already has progress for this module
        const existingProgress = await this.progressRepository.findOne({
            where: { userId, moduleId },
        });

        if (existingProgress) {
            // Update last accessed time
            existingProgress.lastAccessedAt = new Date();
            await this.progressRepository.save(existingProgress);
            return this.mapProgressToInfo(existingProgress);
        }

        // Create new progress entry
        const progress = this.progressRepository.create({
            userId,
            moduleId,
            progress: 0,
            isCompleted: false,
            startedAt: new Date(),
            lastAccessedAt: new Date(),
            timeSpent: 0,
        });

        const savedProgress = await this.progressRepository.save(progress);
        return this.mapProgressToInfo(savedProgress);
    }

    /**
     * Update learning progress
     */
    async updateProgress(
        userId: string,
        moduleId: string,
        progress: number,
    ): Promise<LearningProgressInfo> {
        if (progress < 0 || progress > 100) {
            throw new BadRequestException('Progress must be between 0 and 100');
        }

        const existingProgress = await this.progressRepository.findOne({
            where: { userId, moduleId },
        });

        if (!existingProgress) {
            throw new NotFoundException(
                `No progress found for user ${userId} and module ${moduleId}`,
            );
        }

        existingProgress.progress = progress;
        existingProgress.lastAccessedAt = new Date();

        // Mark as completed if progress reaches 100%
        if (progress >= 100 && !existingProgress.isCompleted) {
            existingProgress.isCompleted = true;
            existingProgress.completedAt = new Date();
        }

        const savedProgress = await this.progressRepository.save(existingProgress);
        return this.mapProgressToInfo(savedProgress);
    }

    /**
     * Complete a learning module
     */
    async completeModule(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo> {
        const progress = await this.updateProgress(userId, moduleId, 100);
        return progress;
    }

    /**
     * Get user's learning statistics
     */
    async getUserStats(userId: string): Promise<LearningStats> {
        const [totalModules, completedModules, totalRewards, progress] = await Promise.all([
            this.moduleRepository.count({ where: { isActive: true } }),
            this.progressRepository.count({ where: { userId, isCompleted: true } }),
            this.rewardRepository.count({ where: { userId } }),
            this.progressRepository.find({ where: { userId } }),
        ]);

        const totalBonkEarned = await this.rewardRepository
            .createQueryBuilder('reward')
            .select('SUM(reward.amount)', 'total')
            .where('reward.userId = :userId', { userId })
            .andWhere('reward.status = :status', { status: RewardStatus.COMPLETED })
            .getRawOne();

        const averageProgress = progress.length > 0
            ? progress.reduce((sum, p) => sum + p.progress, 0) / progress.length
            : 0;

        // Calculate learning streak (simplified - consecutive days with activity)
        const lastActivity = progress.length > 0
            ? new Date(Math.max(...progress.map(p => p.lastAccessedAt.getTime())))
            : new Date();

        return {
            totalModules,
            completedModules,
            totalRewards,
            totalBonkEarned: parseFloat(totalBonkEarned?.total || '0'),
            averageProgress,
            learningStreak: 0, // TODO: Implement streak calculation
            lastActivity,
        };
    }

    /**
     * Get user's BONK rewards
     */
    async getUserRewards(userId: string): Promise<BonkRewardInfo[]> {
        const rewards = await this.rewardRepository.find({
            where: { userId },
            relations: ['module'],
            order: { createdAt: 'DESC' },
        });

        return rewards.map(this.mapRewardToInfo);
    }

    /**
     * Get pending rewards for a user
     */
    async getPendingRewards(userId: string): Promise<BonkRewardInfo[]> {
        const rewards = await this.rewardRepository.find({
            where: { userId, status: RewardStatus.PENDING },
            relations: ['module'],
            order: { createdAt: 'ASC' },
        });

        return rewards.map(this.mapRewardToInfo);
    }

    /**
     * Process BONK rewards for completed modules
     */
    async processRewards(
        userId: string,
        moduleId: string,
    ): Promise<BonkRewardInfo> {
        // Check if module is completed
        const progress = await this.progressRepository.findOne({
            where: { userId, moduleId, isCompleted: true },
        });

        if (!progress) {
            throw new BadRequestException(
                `Module ${moduleId} is not completed by user ${userId}`,
            );
        }

        // Check if reward already exists
        const existingReward = await this.rewardRepository.findOne({
            where: { userId, moduleId },
        });

        if (existingReward) {
            return this.mapRewardToInfo(existingReward);
        }

        // Get module details
        const module = await this.moduleRepository.findOne({
            where: { id: moduleId },
        });

        if (!module) {
            throw new NotFoundException(`Module ${moduleId} not found`);
        }

        // Create reward
        const reward = this.rewardRepository.create({
            userId,
            moduleId,
            amount: module.rewardAmount,
            status: RewardStatus.PENDING,
        });

        const savedReward = await this.rewardRepository.save(reward);
        return this.mapRewardToInfo(savedReward);
    }

    /**
     * Get learning leaderboard
     */
    async getLeaderboard(limit: number = 10): Promise<Array<{
        userId: string;
        totalModules: number;
        totalBonkEarned: number;
        rank: number;
    }>> {
        const results = await this.rewardRepository
            .createQueryBuilder('reward')
            .select('reward.userId', 'userId')
            .addSelect('COUNT(DISTINCT reward.moduleId)', 'totalModules')
            .addSelect('SUM(reward.amount)', 'totalBonkEarned')
            .where('reward.status = :status', { status: RewardStatus.COMPLETED })
            .groupBy('reward.userId')
            .orderBy('totalBonkEarned', 'DESC')
            .limit(limit)
            .getRawMany();

        return results.map((result, index) => ({
            userId: result.userId,
            totalModules: parseInt(result.totalModules),
            totalBonkEarned: parseFloat(result.totalBonkEarned),
            rank: index + 1,
        }));
    }

    /**
     * Get recommended modules for a user
     */
    async getRecommendedModules(
        userId: string,
        limit: number = 5,
    ): Promise<LearningModuleInfo[]> {
        // Get user's completed modules
        const completedModules = await this.progressRepository.find({
            where: { userId, isCompleted: true },
            select: ['moduleId'],
        });

        const completedModuleIds = completedModules.map(p => p.moduleId);

        // Get modules not completed by user
        const modules = await this.moduleRepository
            .createQueryBuilder('module')
            .where('module.isActive = :isActive', { isActive: true })
            .andWhere('module.id NOT IN (:...completedModuleIds)', { completedModuleIds })
            .orderBy('module.sortOrder', 'ASC')
            .addOrderBy('module.createdAt', 'ASC')
            .limit(limit)
            .getMany();

        return modules.map(this.mapModuleToInfo);
    }

    /**
     * Search learning modules
     */
    async searchModules(query: string): Promise<LearningModuleInfo[]> {
        const modules = await this.moduleRepository
            .createQueryBuilder('module')
            .where('module.isActive = :isActive', { isActive: true })
            .andWhere(
                '(module.title ILIKE :query OR module.description ILIKE :query OR module.tags::text ILIKE :query)',
                { query: `%${query}%` },
            )
            .orderBy('module.sortOrder', 'ASC')
            .addOrderBy('module.createdAt', 'ASC')
            .getMany();

        return modules.map(this.mapModuleToInfo);
    }

    // Helper methods
    private mapModuleToInfo(module: LearningModule): LearningModuleInfo {
        return {
            id: module.id,
            title: module.title,
            description: module.description,
            category: module.category,
            difficulty: module.difficulty,
            estimatedDuration: module.estimatedDuration,
            rewardAmount: module.rewardAmount,
            isCompleted: false, // This would need to be calculated based on user progress
            progress: 0, // This would need to be calculated based on user progress
            createdAt: module.createdAt,
            updatedAt: module.updatedAt,
        };
    }

    private mapProgressToInfo(progress: LearningProgress): LearningProgressInfo {
        return {
            id: progress.id,
            userId: progress.userId,
            moduleId: progress.moduleId,
            progress: progress.progress,
            isCompleted: progress.isCompleted,
            startedAt: progress.startedAt,
            completedAt: progress.completedAt,
            lastAccessedAt: progress.lastAccessedAt,
        };
    }

    private mapRewardToInfo(reward: BonkReward): BonkRewardInfo {
        return {
            id: reward.id,
            userId: reward.userId,
            moduleId: reward.moduleId,
            amount: reward.amount,
            status: reward.status,
            transactionHash: reward.transactionHash,
            createdAt: reward.createdAt,
            processedAt: reward.processedAt,
        };
    }
}
