import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
} from 'typeorm';
import {
    IsEmail,
    IsOptional,
    IsString,
    IsEnum,
    IsBoolean,
    Length,
    IsPhoneNumber,
} from 'class-validator';

export enum AuthProvider {
    GOOGLE = 'google',
    APPLE = 'apple',
    WEB3AUTH = 'web3auth',
    PHANTOM = 'phantom',
    SOLFLARE = 'solflare',
}

export enum Language {
    EN = 'en',
    ES = 'es',
}

export enum UserVerificationStatus {
    PENDING_VERIFICATION = 'pending_verification',
    VERIFIED = 'verified',
    REJECTED = 'rejected',
}

export enum UserStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    PENDING_VERIFICATION = 'pending_verification',
}

@Entity('user')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, nullable: true })
    @IsOptional()
    @IsEmail()
    email?: string;

    @Column({ nullable: true, unique: true })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @Column({ name: 'first_name', nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    firstName?: string;

    @Column({ name: 'last_name', nullable: true })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    lastName?: string;

    @Column({
        type: 'enum',
        enum: Language,
        default: Language.EN,
    })
    @IsEnum(Language)
    language: Language;

    @Column({
        name: 'auth_provider',
        type: 'enum',
        enum: AuthProvider,
    })
    @IsEnum(AuthProvider)
    authProvider: AuthProvider;

    @Column({ name: 'auth_provider_id' })
    @IsString()
    authProviderId: string;

    @Column({ name: 'is_active', default: true })
    @IsBoolean()
    isActive: boolean;

    @Column({
        name: 'verification_status',
        type: 'enum',
        enum: UserVerificationStatus,
        default: UserVerificationStatus.PENDING_VERIFICATION,
    })
    @IsEnum(UserVerificationStatus)
    verificationStatus: UserVerificationStatus;

    @Column({
        name: 'status',
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.PENDING_VERIFICATION,
    })
    @IsEnum(UserStatus)
    status: UserStatus;

    @Column({ name: 'verification_completed_at', nullable: true })
    @IsOptional()
    verificationCompletedAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'last_login_at', nullable: true })
    @IsOptional()
    lastLoginAt?: Date;

    // Relationships
    @OneToMany('Wallet', 'user')
    wallets: any[];

    @OneToMany('Transaction', 'sender')
    sentTransactions: any[];

    @OneToMany('Transaction', 'recipient')
    receivedTransactions: any[];

    @OneToMany('Contact', 'owner')
    ownedContacts: any[];

    @OneToMany('Contact', 'contactUser')
    contactReferences: any[];

    @OneToMany('OnOffRamp', 'user')
    onOffRamps: any[];

    @OneToOne('VISACard', 'user')
    visaCard?: any;
}
