import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { IsString, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { WalletStatus } from '../../common/enums/wallet-status.enum';

export enum WalletType {
    WEB3AUTH_MPC = 'web3auth_mpc',
    PHANTOM = 'phantom',
    SOLFLARE = 'solflare',
}

/**
 * Wallet entity representing a cryptocurrency wallet in the Rampa Cash system
 *
 * @description This entity stores wallet information including Solana addresses,
 * wallet types, and status. Each wallet belongs to a user and can have multiple
 * token balances. Supports multiple wallet types including Web3Auth MPC wallets.
 *
 * @example
 * ```typescript
 * const wallet = new Wallet();
 * wallet.userId = 'user-uuid';
 * wallet.address = 'SolanaAddress123...';
 * wallet.walletType = WalletType.WEB3AUTH_MPC;
 * wallet.isPrimary = true;
 * ```
 */
@Entity('wallet')
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @IsUUID()
    userId: string;

    @Column({ unique: true })
    @IsString()
    address: string;

    @Column({ name: 'public_key' })
    @IsString()
    publicKey: string;

    @Column({ name: 'wallet_addresses', type: 'jsonb', nullable: true })
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };

    @Column({
        name: 'wallet_type',
        type: 'enum',
        enum: WalletType,
    })
    @IsEnum(WalletType)
    walletType: WalletType;

    @Column({ name: 'is_active', default: true })
    @IsBoolean()
    isActive: boolean;

    @Column({ name: 'is_primary', default: false })
    @IsBoolean()
    isPrimary: boolean;

    @Column({
        name: 'status',
        type: 'enum',
        enum: WalletStatus,
        default: WalletStatus.ACTIVE,
    })
    @IsEnum(WalletStatus)
    status: WalletStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    /**
     * Many-to-One relationship with User
     * Multiple wallets can belong to the same user
     * This supports future multi-wallet functionality
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
