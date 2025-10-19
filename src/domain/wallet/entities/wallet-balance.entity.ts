import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { TokenType } from '../../common/enums/token-type.enum';

/**
 * WalletBalance entity representing token balances for a specific wallet
 *
 * @description This entity stores the balance of different tokens (USDC, EURC, SOL)
 * for each wallet. Each wallet can have multiple balance records, one for each
 * supported token type. Balances are stored with 18,8 decimal precision for crypto.
 *
 * @example
 * ```typescript
 * const balance = new WalletBalance();
 * balance.walletId = 'wallet-uuid';
 * balance.tokenType = TokenType.USDC;
 * balance.balance = '100.50000000';
 * ```
 */
@Entity('wallet_balance')
@Unique(['walletId', 'tokenType'])
export class WalletBalance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'wallet_id' })
    @IsUUID()
    walletId: string;

    @Column({
        name: 'token_type',
        type: 'enum',
        enum: TokenType,
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
