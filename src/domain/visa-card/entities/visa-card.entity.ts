import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
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
import { FiatDecimalColumn } from '../../common/decorators/decimal-precision.decorator';
import {
    IsCardNumber,
    IsEnumValue,
    IsStringLength,
} from '../../common/decorators/validation.decorator';
import {
    CreateDateColumnStandard,
    TimezoneDateColumn,
} from '../../common/decorators/date-columns.decorator';

export enum CardType {
    PHYSICAL = 'physical',
    VIRTUAL = 'virtual',
}

export enum CardStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled',
}

@Entity('visa_card')
export class VISACard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'card_number' })
    @IsCardNumber()
    cardNumber: string;

    @Column({
        name: 'card_type',
        type: 'enum',
        enum: CardType,
    })
    @IsEnumValue(CardType)
    cardType: CardType;

    @Column({
        type: 'enum',
        enum: CardStatus,
        default: CardStatus.PENDING,
    })
    @IsEnumValue(CardStatus)
    status: CardStatus;

    @FiatDecimalColumn({
        default: 0,
        comment: 'Card balance with 18,2 precision',
    })
    @IsNumber()
    @Min(0)
    balance: number;

    @FiatDecimalColumn({
        name: 'daily_limit',
        comment: 'Daily spending limit with 18,2 precision',
    })
    @IsNumber()
    @Min(0.01)
    dailyLimit: number;

    @FiatDecimalColumn({
        name: 'monthly_limit',
        comment: 'Monthly spending limit with 18,2 precision',
    })
    @IsNumber()
    @Min(0.01)
    monthlyLimit: number;

    @CreateDateColumnStandard({
        comment: 'VISA card creation timestamp',
    })
    createdAt: Date;

    @TimezoneDateColumn({
        name: 'activated_at',
        nullable: true,
        comment: 'Timestamp when VISA card was activated',
    })
    @IsOptional()
    activatedAt?: Date;

    @TimezoneDateColumn({
        name: 'expires_at',
        comment: 'Timestamp when VISA card expires',
    })
    expiresAt: Date;

    // Relationships
    @OneToOne('User', 'visaCard')
    @JoinColumn({ name: 'user_id' })
    user: any;
}
