import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { IsEnum, IsNumber, IsUUID, IsString, IsOptional, Min } from 'class-validator';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { CryptoDecimalColumn } from '../../common/decorators/decimal-precision.decorator';

export enum OnRampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum OnRampProvider {
    TRANSAK = 'transak',
    MOONPAY = 'moonpay',
    RAMP = 'ramp',
    WYRE = 'wyre',
}

/**
 * OnRampTransaction entity representing adding funds from traditional payment methods
 *
 * @description This entity stores on-ramp transactions where users add funds to their
 * wallet using traditional payment methods (bank transfer, card, etc.). The transaction
 * represents the conversion from fiat currency to crypto tokens.
 */
@Entity('onramp_transactions')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['provider', 'status'])
export class OnRampTransaction {
    @PrimaryGeneratedColumn('uuid')
    @IsUUID()
    id: string;

    @Column('uuid')
    @IsUUID()
    userId: string;

    @Column('uuid')
    @IsUUID()
    walletId: string;

    @Column('decimal', { precision: 18, scale: 8 })
    @CryptoDecimalColumn()
    @IsNumber()
    @Min(0)
    amount: number; // Fiat amount

    @Column({ length: 3 })
    @IsString()
    currency: string; // Fiat currency (USD, EUR, etc.)

    @Column({
        type: 'enum',
        enum: TokenType,
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @Column('decimal', { precision: 18, scale: 8 })
    @CryptoDecimalColumn()
    @IsNumber()
    @Min(0)
    tokenAmount: number; // Crypto amount

    @Column({
        type: 'enum',
        enum: OnRampStatus,
        default: OnRampStatus.PENDING,
    })
    @IsEnum(OnRampStatus)
    status: OnRampStatus;

    @Column({
        type: 'enum',
        enum: OnRampProvider,
    })
    @IsEnum(OnRampProvider)
    provider: OnRampProvider;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    providerTransactionId?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    providerOrderId?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    providerPaymentUrl?: string;

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    @CryptoDecimalColumn()
    @IsOptional()
    @IsNumber()
    @Min(0)
    fee?: number; // Provider fee

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    @CryptoDecimalColumn()
    @IsOptional()
    @IsNumber()
    @Min(0)
    exchangeRate?: number; // Fiat to crypto exchange rate

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    failureReason?: string;

    @Column({ type: 'jsonb', nullable: true })
    @IsOptional()
    metadata?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    completedAt?: Date;

    @Column({ nullable: true })
    failedAt?: Date;

    // Relations
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user?: User;

    @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'walletId' })
    wallet?: Wallet;
}
