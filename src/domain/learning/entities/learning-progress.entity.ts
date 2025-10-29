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
    IsBoolean,
    IsOptional,
    Min,
    Max,
} from 'class-validator';
import { LearningModule } from './learning-module.entity';

/**
 * Learning progress entity tracking user progress through learning modules
 *
 * @description This entity tracks individual user progress through learning modules,
 * including completion status, progress percentage, and timestamps.
 *
 * @example
 * ```typescript
 * const progress = new LearningProgress();
 * progress.userId = 'user-uuid';
 * progress.moduleId = 'module-uuid';
 * progress.progress = 75;
 * progress.isCompleted = false;
 * ```
 */
@Entity('learning_progress')
export class LearningProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'module_id' })
    @IsUUID()
    moduleId: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    @IsNumber()
    @Min(0)
    @Max(100)
    progress: number; // percentage 0-100

    @Column({ name: 'is_completed', default: false })
    @IsBoolean()
    isCompleted: boolean;

    @Column({ name: 'started_at' })
    startedAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    @IsOptional()
    completedAt?: Date;

    @Column({ name: 'last_accessed_at' })
    lastAccessedAt: Date;

    @Column({ name: 'time_spent', default: 0 })
    @IsNumber()
    @Min(0)
    timeSpent: number; // in minutes

    @Column({ name: 'notes', type: 'text', nullable: true })
    @IsOptional()
    notes?: string; // User notes about the module

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne(() => LearningModule, (module) => module.progress)
    @JoinColumn({ name: 'module_id' })
    module: LearningModule;
}
