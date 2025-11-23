import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import {
    CreateDateColumnStandard,
    UpdateDateColumnStandard,
    TimezoneDateColumn,
} from '../../common/decorators/date-columns.decorator';

export enum VerificationSource {
    RAMPA = 'rampa',
    TRANSAK = 'transak',
}

export enum SumsubReviewStatus {
    INITIATED = 'initiated',
    PENDING = 'pending',
    REVIEW = 'review',
    COMPLETED = 'completed',
    ON_HOLD = 'on_hold',
    REJECTED = 'rejected',
}

@Entity('sumsub_applicant')
export class SumsubApplicantEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ name: 'user_id' })
    userId: string;

    @Index({ unique: true })
    @Column({ name: 'applicant_id', nullable: true })
    applicantId?: string;

    @Column({ name: 'external_user_id', nullable: true })
    externalUserId?: string;

    @Column({ name: 'level_name', nullable: true })
    levelName?: string;

    @Column({
        name: 'review_status',
        type: 'enum',
        enum: SumsubReviewStatus,
        default: SumsubReviewStatus.INITIATED,
    })
    reviewStatus: SumsubReviewStatus;

    @Column({ name: 'review_result', type: 'jsonb', nullable: true })
    reviewResult?: any;

    @Column({
        name: 'source',
        type: 'enum',
        enum: VerificationSource,
        default: VerificationSource.RAMPA,
    })
    source: VerificationSource;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @TimezoneDateColumn({
        name: 'last_synced_at',
        nullable: true,
        comment: 'Last time we synced status with SumSub',
    })
    lastSyncedAt?: Date;

    @CreateDateColumnStandard({
        comment: 'Applicant link creation timestamp',
    })
    createdAt: Date;

    @UpdateDateColumnStandard({
        comment: 'Applicant link update timestamp',
    })
    updatedAt: Date;
}
