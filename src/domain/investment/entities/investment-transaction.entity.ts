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
import { UserInvestment } from './user-investment.entity';

export enum TransactionType {
    INVESTMENT = 'investment',
    WITHDRAWAL = 'withdrawal',
    DIVIDEND = 'dividend',
    REINVESTMENT = 'reinvestment',
    FEE = 'fee',
    REFUND = 'refund',
}

export enum TransactionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

@Entity('investment_transactions')
@Index(['userId', 'status'])
@Index(['userInvestmentId', 'type'])
@Index(['externalTransactionId'])
export class InvestmentTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    userInvestmentId: string;

    @ManyToOne(() => UserInvestment)
    @JoinColumn({ name: 'userInvestmentId' })
    userInvestment: UserInvestment;

    @Column({
        type: 'enum',
        enum: TransactionType,
    })
    type: TransactionType;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status: TransactionStatus;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    amount: number;

    @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
    fee: number;

    @Column({ type: 'varchar', length: 50 })
    currency: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    externalTransactionId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ type: 'varchar', length: 500, nullable: true })
    failureReason: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
