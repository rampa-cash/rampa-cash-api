import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
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
import {
    CreateDateColumnStandard,
    UpdateDateColumnStandard,
    TimezoneDateColumn,
} from '../../common/decorators/date-columns.decorator';

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

/**
 * User entity representing a registered user in the Rampa Cash system
 *
 * @description This entity stores user information including authentication details,
 * verification status, and personal information. Users can have multiple wallets
 * and are associated with various financial operations.
 *
 * @example
 * ```typescript
 * const user = new User();
 * user.email = 'user@example.com';
 * user.firstName = 'John';
 * user.lastName = 'Doe';
 * user.authProvider = AuthProvider.WEB3AUTH;
 * ```
 */
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

    @TimezoneDateColumn({
        name: 'verification_completed_at',
        nullable: true,
        comment: 'Timestamp when user verification was completed',
    })
    @IsOptional()
    verificationCompletedAt?: Date;

    @CreateDateColumnStandard({
        comment: 'User account creation timestamp',
    })
    createdAt: Date;

    @UpdateDateColumnStandard({
        comment: 'User account last update timestamp',
    })
    updatedAt: Date;

    @TimezoneDateColumn({
        name: 'last_login_at',
        nullable: true,
        comment: 'Timestamp of user last login',
    })
    @IsOptional()
    lastLoginAt?: Date;

    // Relationships
    /**
     * One-to-Many relationship with Wallet
     * A user can have multiple wallets (primary, secondary, etc.)
     * This supports future multi-wallet functionality
     */
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
