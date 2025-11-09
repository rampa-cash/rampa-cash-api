import { LearningModule } from '../entities/learning-module.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { BonkReward } from '../entities/bonk-reward.entity';

export interface LearningModuleInfo {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number; // in minutes
    rewardAmount: number; // BONK tokens
    isCompleted: boolean;
    progress: number; // percentage 0-100
    createdAt: Date;
    updatedAt: Date;
}

export interface LearningProgressInfo {
    id: string;
    userId: string;
    moduleId: string;
    progress: number; // percentage 0-100
    isCompleted: boolean;
    startedAt: Date;
    completedAt?: Date;
    lastAccessedAt: Date;
}

export interface BonkRewardInfo {
    id: string;
    userId: string;
    moduleId: string;
    amount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transactionHash?: string;
    createdAt: Date;
    processedAt?: Date;
}

export interface LearningStats {
    totalModules: number;
    completedModules: number;
    totalRewards: number;
    totalBonkEarned: number;
    averageProgress: number;
    learningStreak: number; // consecutive days
    lastActivity: Date;
}

export interface LearningServiceInterface {
    /**
     * Get all available learning modules
     */
    getAllModules(): Promise<LearningModuleInfo[]>;

    /**
     * Get learning modules by category
     */
    getModulesByCategory(category: string): Promise<LearningModuleInfo[]>;

    /**
     * Get learning modules by difficulty
     */
    getModulesByDifficulty(
        difficulty: 'beginner' | 'intermediate' | 'advanced',
    ): Promise<LearningModuleInfo[]>;

    /**
     * Get a specific learning module by ID
     */
    getModuleById(moduleId: string): Promise<LearningModuleInfo | null>;

    /**
     * Get user's learning progress
     */
    getUserProgress(userId: string): Promise<LearningProgressInfo[]>;

    /**
     * Get user's progress for a specific module
     */
    getModuleProgress(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo | null>;

    /**
     * Start a learning module
     */
    startModule(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo>;

    /**
     * Update learning progress
     */
    updateProgress(
        userId: string,
        moduleId: string,
        progress: number,
    ): Promise<LearningProgressInfo>;

    /**
     * Complete a learning module
     */
    completeModule(
        userId: string,
        moduleId: string,
    ): Promise<LearningProgressInfo>;

    /**
     * Get user's learning statistics
     */
    getUserStats(userId: string): Promise<LearningStats>;

    /**
     * Get user's BONK rewards
     */
    getUserRewards(userId: string): Promise<BonkRewardInfo[]>;

    /**
     * Get pending rewards for a user
     */
    getPendingRewards(userId: string): Promise<BonkRewardInfo[]>;

    /**
     * Process BONK rewards for completed modules
     */
    processRewards(userId: string, moduleId: string): Promise<BonkRewardInfo>;

    /**
     * Get learning leaderboard
     */
    getLeaderboard(limit?: number): Promise<
        Array<{
            userId: string;
            totalModules: number;
            totalBonkEarned: number;
            rank: number;
        }>
    >;

    /**
     * Get recommended modules for a user
     */
    getRecommendedModules(
        userId: string,
        limit?: number,
    ): Promise<LearningModuleInfo[]>;

    /**
     * Search learning modules
     */
    searchModules(query: string): Promise<LearningModuleInfo[]>;
}
