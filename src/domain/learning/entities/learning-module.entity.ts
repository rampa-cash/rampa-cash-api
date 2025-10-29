import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import {
    IsEnum,
    IsNumber,
    IsString,
    IsOptional,
    Min,
    Max,
    IsNotEmpty,
} from 'class-validator';
import { LearningProgress } from './learning-progress.entity';
import { BonkReward } from './bonk-reward.entity';

export enum LearningCategory {
    CRYPTO_BASICS = 'crypto_basics',
    BLOCKCHAIN_TECHNOLOGY = 'blockchain_technology',
    DEFI = 'defi',
    TRADING = 'trading',
    SECURITY = 'security',
    INVESTMENT = 'investment',
    FINANCIAL_LITERACY = 'financial_literacy',
}

export enum LearningDifficulty {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
}

/**
 * Learning module entity representing educational content in the Rampa Cash system
 *
 * @description This entity stores learning modules that users can complete to earn BONK tokens.
 * Each module has educational content, difficulty level, estimated duration, and reward amount.
 *
 * @example
 * ```typescript
 * const module = new LearningModule();
 * module.title = 'Introduction to Cryptocurrency';
 * module.description = 'Learn the basics of digital currencies';
 * module.category = LearningCategory.CRYPTO_BASICS;
 * module.difficulty = LearningDifficulty.BEGINNER;
 * module.estimatedDuration = 30;
 * module.rewardAmount = 1000;
 * ```
 */
@Entity('learning_modules')
export class LearningModule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    @IsString()
    @IsNotEmpty()
    title: string;

    @Column({ type: 'text' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @Column({
        type: 'enum',
        enum: LearningCategory,
    })
    @IsEnum(LearningCategory)
    category: LearningCategory;

    @Column({
        type: 'enum',
        enum: LearningDifficulty,
    })
    @IsEnum(LearningDifficulty)
    difficulty: LearningDifficulty;

    @Column({ name: 'estimated_duration' })
    @IsNumber()
    @Min(1)
    @Max(480) // Maximum 8 hours
    estimatedDuration: number; // in minutes

    @Column({ name: 'reward_amount' })
    @IsNumber()
    @Min(0)
    rewardAmount: number; // BONK tokens

    @Column({ name: 'content_url', nullable: true })
    @IsOptional()
    @IsString()
    contentUrl?: string; // URL to learning content

    @Column({ name: 'thumbnail_url', nullable: true })
    @IsOptional()
    @IsString()
    thumbnailUrl?: string; // URL to module thumbnail

    @Column({ name: 'prerequisites', type: 'json', nullable: true })
    @IsOptional()
    prerequisites?: string[]; // Array of module IDs that must be completed first

    @Column({ name: 'tags', type: 'json', nullable: true })
    @IsOptional()
    tags?: string[]; // Array of tags for categorization

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'sort_order', default: 0 })
    @IsNumber()
    sortOrder: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @OneToMany(() => LearningProgress, (progress) => progress.module)
    progress: LearningProgress[];

    @OneToMany(() => BonkReward, (reward) => reward.module)
    rewards: BonkReward[];
}
