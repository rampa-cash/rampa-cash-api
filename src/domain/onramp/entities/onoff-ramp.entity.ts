import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, IsUUID, IsOptional, IsString, Min } from 'class-validator';

export enum RampType {
    ONRAMP = 'onramp',
    OFFRAMP = 'offramp'
}

export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL'
}

export enum RampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

@Entity('onoff_ramps')
export class OnOffRamp {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'wallet_id' })
    @IsUUID()
    walletId: string;

    @Column({
        type: 'enum',
        enum: RampType
    })
    @IsEnum(RampType)
    type: RampType;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @Column({ name: 'fiat_amount', type: 'decimal', precision: 18, scale: 2 })
    @IsNumber()
    @Min(0.01)
    fiatAmount: number;

    @Column({ name: 'fiat_currency' })
    @IsString()
    fiatCurrency: string;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @Column({
        type: 'enum',
        enum: RampStatus,
        default: RampStatus.PENDING
    })
    @IsEnum(RampStatus)
    status: RampStatus;

    @Column()
    @IsString()
    provider: string;

    @Column({ name: 'provider_transaction_id', nullable: true })
    @IsOptional()
    @IsString()
    providerTransactionId?: string;

    @Column({ name: 'exchange_rate', type: 'decimal', precision: 18, scale: 8 })
    @IsNumber()
    @Min(0.00000001)
    exchangeRate: number;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    @IsNumber()
    @Min(0)
    fee: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'completed_at', nullable: true })
    @IsOptional()
    completedAt?: Date;

    @Column({ name: 'failed_at', nullable: true })
    @IsOptional()
    failedAt?: Date;

    @Column({ name: 'failure_reason', nullable: true })
    @IsOptional()
    @IsString()
    failureReason?: string;

    // Relationships
    @ManyToOne('User', 'onOffRamps')
    @JoinColumn({ name: 'user_id' })
    user: any;

    @ManyToOne('Wallet', 'onOffRamps')
    @JoinColumn({ name: 'wallet_id' })
    wallet: any;
}
