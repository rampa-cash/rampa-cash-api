import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { InvestmentOption } from './investment-option.entity';

export enum InvestmentStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed',
}

export enum InvestmentAction {
    INVEST = 'invest',
    WITHDRAW = 'withdraw',
    REINVEST = 'reinvest',
    PAUSE = 'pause',
    RESUME = 'resume',
}

@Entity('user_investments')
@Index(['userId', 'status'])
@Index(['investmentOptionId', 'status'])
@Index(['userId', 'investmentOptionId'])
export class UserInvestment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    investmentOptionId: string;

    @ManyToOne(() => InvestmentOption)
    @JoinColumn({ name: 'investmentOptionId' })
    investmentOption: InvestmentOption;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    amount: number; // Amount invested

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    currentValue: number; // Current value of investment

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    totalReturn: number; // Total return earned

    @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
    returnPercentage: number; // Return percentage

    @Column({
        type: 'enum',
        enum: InvestmentStatus,
        default: InvestmentStatus.PENDING,
    })
    status: InvestmentStatus;

    @Column({ type: 'timestamp', nullable: true })
    startDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastValueUpdate: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    externalTransactionId: string; // External provider transaction ID

    @Column({ type: 'varchar', length: 255, nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Additional data

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
