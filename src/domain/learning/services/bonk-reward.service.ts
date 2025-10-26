import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BonkReward, RewardStatus } from '../entities/bonk-reward.entity';
import { LearningProgress } from '../entities/learning-progress.entity';
import { LearningModule } from '../entities/learning-module.entity';

export interface RewardProcessingResult {
    success: boolean;
    rewardId: string;
    transactionHash?: string;
    error?: string;
}

@Injectable()
export class BonkRewardService {
    private readonly logger = new Logger(BonkRewardService.name);

    constructor(
        @InjectRepository(BonkReward)
        private readonly rewardRepository: Repository<BonkReward>,
        @InjectRepository(LearningProgress)
        private readonly progressRepository: Repository<LearningProgress>,
        @InjectRepository(LearningModule)
        private readonly moduleRepository: Repository<LearningModule>,
    ) {}

    /**
     * Process pending BONK rewards
     * This method is called by a cron job to process pending rewards
     */
    // Process pending rewards every 5 minutes
    async processPendingRewards(): Promise<void> {
        this.logger.log('Starting BONK reward processing...');

        const pendingRewards = await this.rewardRepository.find({
            where: { status: RewardStatus.PENDING },
            relations: ['module'],
            order: { createdAt: 'ASC' },
        });

        this.logger.log(`Found ${pendingRewards.length} pending rewards to process`);

        for (const reward of pendingRewards) {
            try {
                await this.processReward(reward);
            } catch (error) {
                this.logger.error(
                    `Failed to process reward ${reward.id}: ${error.message}`,
                );
                await this.handleRewardError(reward, error.message);
            }
        }

        this.logger.log('BONK reward processing completed');
    }

    /**
     * Process a single reward
     */
    async processReward(reward: BonkReward): Promise<RewardProcessingResult> {
        this.logger.log(`Processing reward ${reward.id} for user ${reward.userId}`);

        try {
            // Update status to processing
            reward.status = RewardStatus.PROCESSING;
            await this.rewardRepository.save(reward);

            // Simulate BONK token transfer
            // In a real implementation, this would interact with the Solana blockchain
            const transactionHash = await this.transferBonkTokens(
                reward.userId,
                reward.amount,
            );

            // Update reward with transaction hash
            reward.status = RewardStatus.COMPLETED;
            reward.transactionHash = transactionHash;
            reward.processedAt = new Date();
            await this.rewardRepository.save(reward);

            this.logger.log(
                `Successfully processed reward ${reward.id} with transaction ${transactionHash}`,
            );

            return {
                success: true,
                rewardId: reward.id,
                transactionHash,
            };
        } catch (error) {
            this.logger.error(
                `Failed to process reward ${reward.id}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Handle reward processing error
     */
    private async handleRewardError(reward: BonkReward, errorMessage: string): Promise<void> {
        reward.retryCount += 1;
        reward.errorMessage = errorMessage;

        if (reward.retryCount >= reward.maxRetries) {
            reward.status = RewardStatus.FAILED;
            this.logger.error(
                `Reward ${reward.id} failed after ${reward.maxRetries} retries`,
            );
        } else {
            reward.status = RewardStatus.PENDING;
            this.logger.warn(
                `Reward ${reward.id} will be retried (attempt ${reward.retryCount}/${reward.maxRetries})`,
            );
        }

        await this.rewardRepository.save(reward);
    }

    /**
     * Transfer BONK tokens to user
     * This is a mock implementation - in production, this would interact with Solana
     */
    private async transferBonkTokens(
        userId: string,
        amount: number,
    ): Promise<string> {
        // Mock implementation - generate a fake transaction hash
        // In production, this would:
        // 1. Get user's wallet address
        // 2. Create a Solana transaction to transfer BONK tokens
        // 3. Sign and broadcast the transaction
        // 4. Return the transaction hash

        this.logger.log(`Transferring ${amount} BONK tokens to user ${userId}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate mock transaction hash
        const transactionHash = `bonk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.log(`BONK transfer completed with hash: ${transactionHash}`);

        return transactionHash;
    }

    /**
     * Get user's total BONK rewards
     */
    async getUserTotalRewards(userId: string): Promise<number> {
        const result = await this.rewardRepository
            .createQueryBuilder('reward')
            .select('SUM(reward.amount)', 'total')
            .where('reward.userId = :userId', { userId })
            .andWhere('reward.status = :status', { status: RewardStatus.COMPLETED })
            .getRawOne();

        return parseFloat(result?.total || '0');
    }

    /**
     * Get user's pending rewards count
     */
    async getUserPendingRewardsCount(userId: string): Promise<number> {
        return this.rewardRepository.count({
            where: { userId, status: RewardStatus.PENDING },
        });
    }

    /**
     * Get user's failed rewards
     */
    async getUserFailedRewards(userId: string): Promise<BonkReward[]> {
        return this.rewardRepository.find({
            where: { userId, status: RewardStatus.FAILED },
            relations: ['module'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Retry failed reward
     */
    async retryFailedReward(rewardId: string): Promise<RewardProcessingResult> {
        const reward = await this.rewardRepository.findOne({
            where: { id: rewardId, status: RewardStatus.FAILED },
        });

        if (!reward) {
            throw new Error(`Failed reward ${rewardId} not found`);
        }

        // Reset retry count and status
        reward.retryCount = 0;
        reward.status = RewardStatus.PENDING;
        reward.errorMessage = undefined;
        await this.rewardRepository.save(reward);

        return this.processReward(reward);
    }

    /**
     * Get reward statistics
     */
    async getRewardStatistics(): Promise<{
        totalRewards: number;
        pendingRewards: number;
        completedRewards: number;
        failedRewards: number;
        totalBonkDistributed: number;
    }> {
        const [totalRewards, pendingRewards, completedRewards, failedRewards, totalBonk] = await Promise.all([
            this.rewardRepository.count(),
            this.rewardRepository.count({ where: { status: RewardStatus.PENDING } }),
            this.rewardRepository.count({ where: { status: RewardStatus.COMPLETED } }),
            this.rewardRepository.count({ where: { status: RewardStatus.FAILED } }),
            this.rewardRepository
                .createQueryBuilder('reward')
                .select('SUM(reward.amount)', 'total')
                .where('reward.status = :status', { status: RewardStatus.COMPLETED })
                .getRawOne(),
        ]);

        return {
            totalRewards,
            pendingRewards,
            completedRewards,
            failedRewards,
            totalBonkDistributed: parseFloat(totalBonk?.total || '0'),
        };
    }

    /**
     * Clean up old failed rewards (older than 30 days)
     */
    // Clean up old failed rewards daily at 2 AM
    async cleanupOldFailedRewards(): Promise<void> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.rewardRepository
            .createQueryBuilder()
            .delete()
            .where('status = :status', { status: RewardStatus.FAILED })
            .andWhere('createdAt < :date', { date: thirtyDaysAgo })
            .execute();

        this.logger.log(`Cleaned up ${result.affected} old failed rewards`);
    }
}
