import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum InvestmentType {
    TOKENIZED_ASSET = 'tokenized_asset',
    TOKENIZED_ETF = 'tokenized_etf',
    CRYPTO_FUND = 'crypto_fund',
    STAKING_POOL = 'staking_pool',
}

export enum InvestmentRisk {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    VERY_HIGH = 'very_high',
}

export enum InvestmentStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    MAINTENANCE = 'maintenance',
}

@Entity('investment_options')
@Index(['type', 'status'])
@Index(['riskLevel', 'status'])
@Index(['isActive', 'status'])
export class InvestmentOption {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: InvestmentType,
    })
    type: InvestmentType;

    @Column({
        type: 'enum',
        enum: InvestmentRisk,
    })
    riskLevel: InvestmentRisk;

    @Column({
        type: 'enum',
        enum: InvestmentStatus,
        default: InvestmentStatus.ACTIVE,
    })
    status: InvestmentStatus;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    minInvestmentAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
    maxInvestmentAmount: number;

    @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
    expectedReturn: number; // Annual percentage return

    @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
    managementFee: number; // Annual management fee percentage

    @Column({ type: 'varchar', length: 100, nullable: true })
    provider: string; // External provider name

    @Column({ type: 'varchar', length: 255, nullable: true })
    providerId: string; // External provider's ID for this option

    @Column({ type: 'varchar', length: 50, nullable: true })
    currency: string; // Base currency (USDC, EURC, etc.)

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Additional provider-specific data

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
