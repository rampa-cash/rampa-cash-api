import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { IsString, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import {
    IsSolanaAddress,
    IsStringLength,
    IsEnumValue,
} from '../../common/decorators/validation.decorator';
import {
    CreateDateColumnStandard,
    UpdateDateColumnStandard,
} from '../../common/decorators/date-columns.decorator';

export enum WalletType {
    // Modern wallet providers
    PARA = 'para',
    PHANTOM = 'phantom',
    SOLFLARE = 'solflare',
}

/**
 * Wallet entity representing a user's wallet in the Rampa Cash system
 *
 * @description This entity stores wallet information from various providers (Para, Phantom, Solflare, etc.)
 * including Solana addresses, public keys, and provider-specific data. Each user can have multiple wallets
 * from different providers. The wallet can have multiple token balances (USDC, EURC, SOL).
 *
 * @example
 * ```typescript
 * const wallet = new Wallet();
 * wallet.userId = 'user-uuid';
 * wallet.address = 'SolanaAddress123...';
 * wallet.publicKey = 'PublicKey123...';
 * wallet.walletType = WalletType.PARA;
 * wallet.externalWalletId = 'external-wallet-id';
 * ```
 */
@Entity('wallet')
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ name: 'external_wallet_id', nullable: true })
    @IsString()
    externalWalletId?: string;

    @Column({ unique: true })
    @IsSolanaAddress()
    address: string;

    @Column({ name: 'public_key' })
    @IsSolanaAddress()
    publicKey: string;

    @Column({ name: 'wallet_addresses', type: 'jsonb', nullable: true })
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };

    @Column({ name: 'wallet_metadata', type: 'jsonb', nullable: true })
    walletMetadata?: Record<string, any>;

    @Column({
        name: 'wallet_type',
        type: 'enum',
        enum: WalletType,
    })
    @IsEnumValue(WalletType)
    walletType: WalletType;

    @Column({ name: 'is_active', default: true })
    @IsBoolean()
    isActive: boolean;

    @Column({
        name: 'status',
        type: 'enum',
        enum: WalletStatus,
        default: WalletStatus.ACTIVE,
    })
    @IsEnumValue(WalletStatus)
    status: WalletStatus;

    @CreateDateColumnStandard({
        comment: 'Wallet creation timestamp',
    })
    createdAt: Date;

    @UpdateDateColumnStandard({
        comment: 'Wallet last update timestamp',
    })
    updatedAt: Date;

    // Relationships
    /**
     * Many-to-One relationship with User
     * Each user has exactly one Web3Auth wallet
     */
    @ManyToOne('User', 'wallets')
    @JoinColumn({ name: 'user_id' })
    user: any;

    @OneToMany('WalletBalance', 'wallet')
    balances: any[];

    @OneToMany('Transaction', 'senderWallet')
    sentTransactions: any[];

    @OneToMany('Transaction', 'recipientWallet')
    receivedTransactions: any[];

    @OneToMany('OnOffRamp', 'wallet')
    onOffRamps: any[];
}
