import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';

export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL'
}

@Entity('wallet_balance')
export class WalletBalance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'wallet_id' })
    @IsUUID()
    walletId: string;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    @IsNumber()
    @Min(0)
    balance: number;

    @Column({ name: 'last_updated' })
    lastUpdated: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne('Wallet', 'balances')
    @JoinColumn({ name: 'wallet_id' })
    wallet: any;
}
