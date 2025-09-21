import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, IsUUID, IsOptional, IsString, Min } from 'class-validator';

export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL'
}

export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

@Entity('transaction')
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'sender_id' })
    @IsUUID()
    senderId: string;

    @Column({ name: 'recipient_id' })
    @IsUUID()
    recipientId: string;

    @Column({ name: 'sender_wallet_id' })
    @IsUUID()
    senderWalletId: string;

    @Column({ name: 'recipient_wallet_id' })
    @IsUUID()
    recipientWalletId: string;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @IsNumber()
    @Min(0.00000001) // Minimum amount to prevent zero transactions
    amount: number;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    @IsEnum(TransactionStatus)
    status: TransactionStatus;

    @Column({ name: 'solana_transaction_hash', nullable: true })
    @IsOptional()
    @IsString()
    solanaTransactionHash?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    @IsNumber()
    @Min(0)
    fee: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'confirmed_at', nullable: true })
    @IsOptional()
    confirmedAt?: Date;

    @Column({ name: 'failed_at', nullable: true })
    @IsOptional()
    failedAt?: Date;

    @Column({ name: 'failure_reason', nullable: true })
    @IsOptional()
    @IsString()
    failureReason?: string;

    // Relationships
    @ManyToOne('User', 'sentTransactions')
    @JoinColumn({ name: 'sender_id' })
    sender: any;

    @ManyToOne('User', 'receivedTransactions')
    @JoinColumn({ name: 'recipient_id' })
    recipient: any;

    @ManyToOne('Wallet', 'sentTransactions')
    @JoinColumn({ name: 'sender_wallet_id' })
    senderWallet: any;

    @ManyToOne('Wallet', 'receivedTransactions')
    @JoinColumn({ name: 'recipient_wallet_id' })
    recipientWallet: any;
}
