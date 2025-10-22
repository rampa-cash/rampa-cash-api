import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { CryptoDecimalColumn } from '../../common/decorators/decimal-precision.decorator';
import {
    CreateDateColumnStandard,
    UpdateDateColumnStandard,
} from '../../common/decorators/date-columns.decorator';

export enum BalanceChangeType {
    TRANSFER_IN = 'transfer_in',
    TRANSFER_OUT = 'transfer_out',
    ONRAMP = 'onramp',
    OFFRAMP = 'offramp',
    BLOCKCHAIN_SYNC = 'blockchain_sync',
    MANUAL_ADJUSTMENT = 'manual_adjustment',
    FEE_DEDUCTION = 'fee_deduction',
    REWARD = 'reward',
    REFUND = 'refund',
}

@Entity('balance_history')
@Index(['walletId', 'tokenType', 'createdAt'])
@Index(['walletId', 'changeType', 'createdAt'])
@Index(['createdAt'])
export class BalanceHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'wallet_id' })
    walletId: string;

    @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'wallet_id' })
    wallet: Wallet;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType,
    })
    tokenType: TokenType;

    @CryptoDecimalColumn({
        name: 'previous_balance',
        default: 0,
        comment: 'Previous balance with 18,8 precision',
    })
    previousBalance: number;

    @CryptoDecimalColumn({
        name: 'new_balance',
        default: 0,
        comment: 'New balance with 18,8 precision',
    })
    newBalance: number;

    @CryptoDecimalColumn({
        name: 'change_amount',
        default: 0,
        comment: 'Balance change amount with 18,8 precision',
    })
    changeAmount: number;

    @Column({
        name: 'change_type',
        type: 'enum',
        enum: BalanceChangeType,
    })
    changeType: BalanceChangeType;

    @Column({
        name: 'transaction_id',
        nullable: true,
    })
    transactionId?: string;

    @Column({
        name: 'solana_transaction_hash',
        nullable: true,
    })
    solanaTransactionHash?: string;

    @Column({
        name: 'description',
        nullable: true,
        length: 500,
    })
    description?: string;

    @Column({
        name: 'metadata',
        type: 'jsonb',
        nullable: true,
    })
    metadata?: Record<string, any>;

    @CreateDateColumnStandard({
        comment: 'Balance history record creation timestamp',
    })
    createdAt: Date;

    @UpdateDateColumnStandard({
        comment: 'Balance history record last update timestamp',
    })
    updatedAt: Date;
}
