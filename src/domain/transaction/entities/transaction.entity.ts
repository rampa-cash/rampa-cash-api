import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import {
    IsEnum,
    IsNumber,
    IsUUID,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { TokenType } from '../../common/enums/token-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { CryptoDecimalColumn } from '../../common/decorators/decimal-precision.decorator';
import {
    IsAmount,
    IsEnumValue,
    IsStringLength,
} from '../../common/decorators/validation.decorator';
import {
    CreateDateColumnStandard,
    TimezoneDateColumn,
} from '../../common/decorators/date-columns.decorator';

/**
 * Transaction entity representing a cryptocurrency transaction in the Rampa Cash system
 *
 * @description This entity stores transaction information including sender/recipient details,
 * amounts, status, and Solana transaction hashes. Transactions can be transfers between
 * users or other financial operations. Amounts are stored with 18,8 decimal precision.
 *
 * @example
 * ```typescript
 * const transaction = new Transaction();
 * transaction.senderId = 'user-uuid';
 * transaction.recipientId = 'user-uuid';
 * transaction.amount = '50.25000000';
 * transaction.tokenType = TokenType.USDC;
 * transaction.status = TransactionStatus.PENDING;
 * ```
 */
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

    @CryptoDecimalColumn({ comment: 'Transaction amount with 18,8 precision' })
    @IsAmount(0.00000001) // Minimum amount to prevent zero transactions
    amount: number;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType,
    })
    @IsEnumValue(TokenType)
    tokenType: TokenType;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    @IsEnumValue(TransactionStatus)
    status: TransactionStatus;

    @Column({ name: 'solana_transaction_hash', nullable: true })
    @IsOptional()
    @IsString()
    solanaTransactionHash?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsStringLength(1, 500)
    description?: string;

    @CryptoDecimalColumn({
        default: 0,
        comment: 'Transaction fee with 18,8 precision',
    })
    @IsAmount(0)
    fee: number;

    @CreateDateColumnStandard({
        comment: 'Transaction creation timestamp',
    })
    createdAt: Date;

    @TimezoneDateColumn({
        name: 'confirmed_at',
        nullable: true,
        comment: 'Timestamp when transaction was confirmed on blockchain',
    })
    @IsOptional()
    confirmedAt?: Date;

    @TimezoneDateColumn({
        name: 'failed_at',
        nullable: true,
        comment: 'Timestamp when transaction failed',
    })
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
