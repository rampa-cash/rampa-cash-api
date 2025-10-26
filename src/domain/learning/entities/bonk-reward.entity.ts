import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import {
    IsNumber,
    IsUUID,
    IsEnum,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { LearningModule } from './learning-module.entity';

export enum RewardStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * BONK reward entity tracking token rewards for completed learning modules
 *
 * @description This entity tracks BONK token rewards given to users for completing
 * learning modules, including transaction status and processing information.
 *
 * @example
 * ```typescript
 * const reward = new BonkReward();
 * reward.userId = 'user-uuid';
 * reward.moduleId = 'module-uuid';
 * reward.amount = 1000;
 * reward.status = RewardStatus.PENDING;
 * ```
 */
@Entity('bonk_rewards')
export class BonkReward {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'module_id' })
    @IsUUID()
    moduleId: string;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @IsNumber()
    @Min(0)
    amount: number; // BONK tokens

    @Column({
        type: 'enum',
        enum: RewardStatus,
        default: RewardStatus.PENDING,
    })
    @IsEnum(RewardStatus)
    status: RewardStatus;

    @Column({ name: 'transaction_hash', nullable: true })
    @IsOptional()
    @IsString()
    transactionHash?: string; // Blockchain transaction hash

    @Column({ name: 'processed_at', nullable: true })
    @IsOptional()
    processedAt?: Date;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    @IsOptional()
    errorMessage?: string; // Error message if processing failed

    @Column({ name: 'retry_count', default: 0 })
    @IsNumber()
    @Min(0)
    retryCount: number;

    @Column({ name: 'max_retries', default: 3 })
    @IsNumber()
    @Min(0)
    maxRetries: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => LearningModule, (module) => module.rewards)
    @JoinColumn({ name: 'module_id' })
    module: LearningModule;
}
