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
import {
    CryptoDecimalColumn,
    FiatDecimalColumn,
    ExchangeRateDecimalColumn,
} from '../../common/decorators/decimal-precision.decorator';
import {
    IsAmount,
    IsEnumValue,
    IsStringLength,
} from '../../common/decorators/validation.decorator';
import {
    CreateDateColumnStandard,
    TimezoneDateColumn,
} from '../../common/decorators/date-columns.decorator';

export enum RampType {
    ONRAMP = 'onramp',
    OFFRAMP = 'offramp',
}

export enum RampStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('onoff_ramp')
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
        enum: RampType,
    })
    @IsEnumValue(RampType)
    type: RampType;

    @CryptoDecimalColumn({ comment: 'Crypto amount with 18,8 precision' })
    @IsAmount(0.00000001)
    amount: number;

    @FiatDecimalColumn({
        name: 'fiat_amount',
        comment: 'Fiat amount with 18,2 precision',
    })
    @IsAmount(0.01)
    fiatAmount: number;

    @Column({ name: 'fiat_currency' })
    @IsStringLength(3, 3)
    fiatCurrency: string;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType,
    })
    @IsEnumValue(TokenType)
    tokenType: TokenType;

    @Column({
        type: 'enum',
        enum: RampStatus,
        default: RampStatus.PENDING,
    })
    @IsEnumValue(RampStatus)
    status: RampStatus;

    @Column()
    @IsStringLength(1, 50)
    provider: string;

    @Column({ name: 'provider_transaction_id', nullable: true })
    @IsOptional()
    @IsStringLength(1, 100)
    providerTransactionId?: string;

    @ExchangeRateDecimalColumn({
        name: 'exchange_rate',
        comment: 'Exchange rate with 18,8 precision',
    })
    @IsAmount(0.00000001)
    exchangeRate: number;

    @CryptoDecimalColumn({
        default: 0,
        comment: 'Ramp fee with 18,8 precision',
    })
    @IsAmount(0)
    fee: number;

    @CreateDateColumnStandard({
        comment: 'On/Off ramp creation timestamp',
    })
    createdAt: Date;

    @TimezoneDateColumn({
        name: 'completed_at',
        nullable: true,
        comment: 'Timestamp when ramp operation was completed',
    })
    @IsOptional()
    completedAt?: Date;

    @TimezoneDateColumn({
        name: 'failed_at',
        nullable: true,
        comment: 'Timestamp when ramp operation failed',
    })
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
