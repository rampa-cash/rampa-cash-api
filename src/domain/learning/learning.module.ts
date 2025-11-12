import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningController } from './controllers/learning.controller';
import { LearningService } from './services/learning.service';
import { BonkRewardService } from './services/bonk-reward.service';
import { LearningModule as LearningModuleEntity } from './entities/learning-module.entity';
import { LearningProgress } from './entities/learning-progress.entity';
import { BonkReward } from './entities/bonk-reward.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            LearningModuleEntity,
            LearningProgress,
            BonkReward,
        ]),
        AuthModule,
        UserModule, // Required for SessionValidationGuard which needs UserService
    ],
    controllers: [LearningController],
    providers: [LearningService, BonkRewardService],
    exports: [LearningService, BonkRewardService],
})
export class LearningModule {}
