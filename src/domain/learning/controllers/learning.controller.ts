import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { LearningService } from '../services/learning.service';
import { BonkRewardService } from '../services/bonk-reward.service';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import {
    LearningModuleInfo,
    LearningProgressInfo,
    BonkRewardInfo,
    LearningStats,
} from '../interfaces/learning-service.interface';

export class StartModuleDto {
    moduleId: string;
}

export class UpdateProgressDto {
    moduleId: string;
    progress: number;
}

export class CompleteModuleDto {
    moduleId: string;
}

@ApiTags('Learning')
@Controller('learning')
@UseGuards(SessionValidationGuard)
export class LearningController {
    constructor(
        private readonly learningService: LearningService,
        private readonly bonkRewardService: BonkRewardService,
    ) {}

    @Get('modules')
    @ApiOperation({ summary: 'Get all available learning modules' })
    @ApiResponse({
        status: 200,
        description: 'Learning modules retrieved successfully',
    })
    async getAllModules(): Promise<LearningModuleInfo[]> {
        return this.learningService.getAllModules();
    }

    @Get('modules/category/:category')
    @ApiOperation({ summary: 'Get learning modules by category' })
    @ApiParam({ name: 'category', description: 'Learning module category' })
    @ApiResponse({
        status: 200,
        description: 'Learning modules retrieved successfully',
    })
    async getModulesByCategory(
        @Param('category') category: string,
    ): Promise<LearningModuleInfo[]> {
        return this.learningService.getModulesByCategory(category);
    }

    @Get('modules/difficulty/:difficulty')
    @ApiOperation({ summary: 'Get learning modules by difficulty' })
    @ApiParam({
        name: 'difficulty',
        description: 'Learning module difficulty',
        enum: ['beginner', 'intermediate', 'advanced'],
    })
    @ApiResponse({
        status: 200,
        description: 'Learning modules retrieved successfully',
    })
    async getModulesByDifficulty(
        @Param('difficulty')
        difficulty: 'beginner' | 'intermediate' | 'advanced',
    ): Promise<LearningModuleInfo[]> {
        return this.learningService.getModulesByDifficulty(difficulty);
    }

    @Get('modules/search')
    @ApiOperation({ summary: 'Search learning modules' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    @ApiResponse({
        status: 200,
        description: 'Search results retrieved successfully',
    })
    async searchModules(
        @Query('q') query: string,
    ): Promise<LearningModuleInfo[]> {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Search query is required');
        }
        return this.learningService.searchModules(query);
    }

    @Get('modules/:id')
    @ApiOperation({ summary: 'Get a specific learning module by ID' })
    @ApiParam({ name: 'id', description: 'Learning module ID' })
    @ApiResponse({
        status: 200,
        description: 'Learning module retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Learning module not found' })
    async getModuleById(@Param('id') id: string): Promise<LearningModuleInfo> {
        const module = await this.learningService.getModuleById(id);
        if (!module) {
            throw new NotFoundException(
                `Learning module with ID ${id} not found`,
            );
        }
        return module;
    }

    @Get('progress')
    @ApiOperation({ summary: 'Get user learning progress' })
    @ApiResponse({
        status: 200,
        description: 'Learning progress retrieved successfully',
    })
    async getUserProgress(
        @Request() req: any,
    ): Promise<LearningProgressInfo[]> {
        const sessionUser = req.sessionUser;
        return this.learningService.getUserProgress(sessionUser.id);
    }

    @Get('progress/:moduleId')
    @ApiOperation({ summary: 'Get user progress for a specific module' })
    @ApiParam({ name: 'moduleId', description: 'Learning module ID' })
    @ApiResponse({
        status: 200,
        description: 'Module progress retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Module progress not found' })
    async getModuleProgress(
        @Request() req: any,
        @Param('moduleId') moduleId: string,
    ): Promise<LearningProgressInfo> {
        const sessionUser = req.sessionUser;
        const progress = await this.learningService.getModuleProgress(
            sessionUser.id,
            moduleId,
        );
        if (!progress) {
            throw new NotFoundException(
                `No progress found for module ${moduleId}`,
            );
        }
        return progress;
    }

    @Post('modules/:id/start')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Start a learning module' })
    @ApiParam({ name: 'id', description: 'Learning module ID' })
    @ApiResponse({
        status: 201,
        description: 'Learning module started successfully',
    })
    @ApiResponse({ status: 404, description: 'Learning module not found' })
    async startModule(
        @Request() req: any,
        @Param('id') moduleId: string,
    ): Promise<LearningProgressInfo> {
        const sessionUser = req.sessionUser;
        return this.learningService.startModule(sessionUser.id, moduleId);
    }

    @Post('modules/:id/progress')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update learning progress' })
    @ApiParam({ name: 'id', description: 'Learning module ID' })
    @ApiResponse({ status: 200, description: 'Progress updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid progress value' })
    @ApiResponse({ status: 404, description: 'Module progress not found' })
    async updateProgress(
        @Request() req: any,
        @Param('id') moduleId: string,
        @Body() body: UpdateProgressDto,
    ): Promise<LearningProgressInfo> {
        const sessionUser = req.sessionUser;
        return this.learningService.updateProgress(
            sessionUser.id,
            moduleId,
            body.progress,
        );
    }

    @Post('modules/:id/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete a learning module' })
    @ApiParam({ name: 'id', description: 'Learning module ID' })
    @ApiResponse({ status: 200, description: 'Module completed successfully' })
    @ApiResponse({ status: 404, description: 'Module progress not found' })
    async completeModule(
        @Request() req: any,
        @Param('id') moduleId: string,
    ): Promise<LearningProgressInfo> {
        const sessionUser = req.sessionUser;
        return this.learningService.completeModule(sessionUser.id, moduleId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get user learning statistics' })
    @ApiResponse({
        status: 200,
        description: 'Learning statistics retrieved successfully',
    })
    async getUserStats(@Request() req: any): Promise<LearningStats> {
        const sessionUser = req.sessionUser;
        return this.learningService.getUserStats(sessionUser.id);
    }

    @Get('rewards')
    @ApiOperation({ summary: 'Get user BONK rewards' })
    @ApiResponse({
        status: 200,
        description: 'BONK rewards retrieved successfully',
    })
    async getUserRewards(@Request() req: any): Promise<BonkRewardInfo[]> {
        const sessionUser = req.sessionUser;
        return this.learningService.getUserRewards(sessionUser.id);
    }

    @Get('rewards/pending')
    @ApiOperation({ summary: 'Get user pending BONK rewards' })
    @ApiResponse({
        status: 200,
        description: 'Pending rewards retrieved successfully',
    })
    async getPendingRewards(@Request() req: any): Promise<BonkRewardInfo[]> {
        const sessionUser = req.sessionUser;
        return this.learningService.getPendingRewards(sessionUser.id);
    }

    @Post('rewards/process')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Process BONK rewards for completed modules' })
    @ApiResponse({ status: 200, description: 'Rewards processed successfully' })
    @ApiResponse({ status: 400, description: 'Module not completed' })
    async processRewards(
        @Request() req: any,
        @Body() body: CompleteModuleDto,
    ): Promise<BonkRewardInfo> {
        const sessionUser = req.sessionUser;
        return this.learningService.processRewards(
            sessionUser.id,
            body.moduleId,
        );
    }

    @Get('leaderboard')
    @ApiOperation({ summary: 'Get learning leaderboard' })
    @ApiQuery({
        name: 'limit',
        description: 'Number of results to return',
        required: false,
    })
    @ApiResponse({
        status: 200,
        description: 'Leaderboard retrieved successfully',
    })
    async getLeaderboard(@Query('limit') limit?: number): Promise<
        Array<{
            userId: string;
            totalModules: number;
            totalBonkEarned: number;
            rank: number;
        }>
    > {
        return this.learningService.getLeaderboard(limit);
    }

    @Get('recommended')
    @ApiOperation({ summary: 'Get recommended learning modules for user' })
    @ApiQuery({
        name: 'limit',
        description: 'Number of recommendations to return',
        required: false,
    })
    @ApiResponse({
        status: 200,
        description: 'Recommended modules retrieved successfully',
    })
    async getRecommendedModules(
        @Request() req: any,
        @Query('limit') limit?: number,
    ): Promise<LearningModuleInfo[]> {
        const sessionUser = req.sessionUser;
        return this.learningService.getRecommendedModules(
            sessionUser.id,
            limit,
        );
    }

    @Get('rewards/total')
    @ApiOperation({ summary: 'Get user total BONK rewards earned' })
    @ApiResponse({
        status: 200,
        description: 'Total rewards retrieved successfully',
    })
    async getTotalRewards(@Request() req: any): Promise<{ total: number }> {
        const sessionUser = req.sessionUser;
        const total = await this.bonkRewardService.getUserTotalRewards(
            sessionUser.id,
        );
        return { total };
    }

    @Get('rewards/pending-count')
    @ApiOperation({ summary: 'Get user pending rewards count' })
    @ApiResponse({
        status: 200,
        description: 'Pending count retrieved successfully',
    })
    async getPendingRewardsCount(
        @Request() req: any,
    ): Promise<{ count: number }> {
        const sessionUser = req.sessionUser;
        const count = await this.bonkRewardService.getUserPendingRewardsCount(
            sessionUser.id,
        );
        return { count };
    }

    @Get('rewards/failed')
    @ApiOperation({ summary: 'Get user failed rewards' })
    @ApiResponse({
        status: 200,
        description: 'Failed rewards retrieved successfully',
    })
    async getFailedRewards(@Request() req: any): Promise<BonkRewardInfo[]> {
        const sessionUser = req.sessionUser;
        const failedRewards = await this.bonkRewardService.getUserFailedRewards(
            sessionUser.id,
        );
        return failedRewards.map((reward) => ({
            id: reward.id,
            userId: reward.userId,
            moduleId: reward.moduleId,
            amount: reward.amount,
            status: reward.status,
            transactionHash: reward.transactionHash,
            createdAt: reward.createdAt,
            processedAt: reward.processedAt,
        }));
    }

    @Post('rewards/:id/retry')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Retry a failed reward' })
    @ApiParam({ name: 'id', description: 'Reward ID' })
    @ApiResponse({
        status: 200,
        description: 'Reward retry initiated successfully',
    })
    @ApiResponse({ status: 404, description: 'Failed reward not found' })
    async retryFailedReward(
        @Request() req: any,
        @Param('id') rewardId: string,
    ): Promise<{ success: boolean; message: string }> {
        const sessionUser = req.sessionUser;
        try {
            const result =
                await this.bonkRewardService.retryFailedReward(rewardId);
            return {
                success: result.success,
                message: result.success
                    ? 'Reward retry initiated successfully'
                    : 'Reward retry failed',
            };
        } catch (error) {
            throw new NotFoundException(error.message);
        }
    }
}
