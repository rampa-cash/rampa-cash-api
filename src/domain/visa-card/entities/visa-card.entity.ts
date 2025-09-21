import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, IsUUID, IsOptional, IsString, Min } from 'class-validator';

export enum CardType {
    PHYSICAL = 'physical',
    VIRTUAL = 'virtual'
}

export enum CardStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled'
}

@Entity('visa_cards')
export class VISACard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'card_number' })
    @IsString()
    cardNumber: string;

    @Column({
        name: 'card_type',
        type: 'enum',
        enum: CardType
    })
    @IsEnum(CardType)
    cardType: CardType;

    @Column({
        type: 'enum',
        enum: CardStatus,
        default: CardStatus.PENDING
    })
    @IsEnum(CardStatus)
    status: CardStatus;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    @IsNumber()
    @Min(0)
    balance: number;

    @Column({ name: 'daily_limit', type: 'decimal', precision: 18, scale: 2 })
    @IsNumber()
    @Min(0.01)
    dailyLimit: number;

    @Column({ name: 'monthly_limit', type: 'decimal', precision: 18, scale: 2 })
    @IsNumber()
    @Min(0.01)
    monthlyLimit: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'activated_at', nullable: true })
    @IsOptional()
    activatedAt?: Date;

    @Column({ name: 'expires_at' })
    expiresAt: Date;

    // Relationships
    @OneToOne('User', 'visaCard')
    @JoinColumn({ name: 'user_id' })
    user: any;
}
