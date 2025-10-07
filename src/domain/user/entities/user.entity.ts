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

export enum UserStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
}

@Entity('user')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @IsEmail()
    email: string;

    @Column({ nullable: true, unique: true })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @Column({ name: 'first_name' })
    @IsString()
    @Length(1, 50)
    firstName: string;

    @Column({ name: 'last_name' })
    @IsString()
    @Length(1, 50)
    lastName: string;

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
        name: 'status',
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE,
    })
    @IsEnum(UserStatus)
    status: UserStatus;

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
