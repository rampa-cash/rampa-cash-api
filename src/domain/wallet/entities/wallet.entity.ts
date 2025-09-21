import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { IsString, IsEnum, IsBoolean, IsUUID } from 'class-validator';

export enum WalletType {
    WEB3AUTH_MPC = 'web3auth_mpc',
    PHANTOM = 'phantom',
    SOLFLARE = 'solflare'
}

export enum WalletStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended'
}

@Entity('wallets')
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

    @Column({
        name: 'wallet_type',
        type: 'enum',
        enum: WalletType
    })
    @IsEnum(WalletType)
    walletType: WalletType;

    @Column({ name: 'is_active', default: true })
    @IsBoolean()
    isActive: boolean;

    @Column({ name: 'status', type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE })
    @IsEnum(WalletStatus)
    status: WalletStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @OneToOne('User', 'wallet')
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
