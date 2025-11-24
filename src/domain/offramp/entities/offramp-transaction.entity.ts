import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';

export enum OffRampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum OffRampProvider {
    TRANSAK = 'transak',
    MOONPAY = 'moonpay',
    RAMP = 'ramp',
    WYRE = 'wyre',
}

@Entity('offramp_transactions')
export class OffRampTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'wallet_id' })
    walletId: string;

    @Column({ name: 'provider' })
    provider: OffRampProvider;

    @Column({ name: 'status' })
    status: OffRampStatus;

    @Column({ name: 'token_amount', type: 'decimal', precision: 18, scale: 8 })
    tokenAmount: number;

    @Column({ name: 'token_type' })
    tokenType: string;

    @Column({
        name: 'fiat_amount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
    })
    fiatAmount?: number; // Nullable, set from webhook

    @Column({ name: 'fiat_currency', length: 3 })
    fiatCurrency: string;

    @Column({
        name: 'exchange_rate',
        type: 'decimal',
        precision: 18,
        scale: 8,
        nullable: true,
    })
    exchangeRate: number;

    @Column({
        name: 'fee',
        type: 'decimal',
        precision: 18,
        scale: 8,
        nullable: true,
    })
    fee: number;

    @Column({ name: 'provider_transaction_id', nullable: true })
    providerTransactionId: string;

    @Column({ name: 'bank_account_id', nullable: true })
    bankAccountId: string;

    @Column({ name: 'failure_reason', nullable: true })
    failureReason: string;

    @Column({ name: 'completed_at', nullable: true })
    completedAt: Date;

    @Column({ name: 'failed_at', nullable: true })
    failedAt: Date;

    @Column({ name: 'wallet_address', nullable: true })
    walletAddress?: string; // Solana wallet address for webhook matching

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: Record<string, any>; // Store partnerCustomerId, etc.

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Wallet)
    @JoinColumn({ name: 'wallet_id' })
    wallet: Wallet;
}
