import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import {
    IsUUID,
    IsOptional,
    IsString,
    IsBoolean,
    Length,
} from 'class-validator';
import {
    IsEmailFlexible,
    IsPhoneNumberFlexible,
    IsSolanaAddress,
    IsStringLength,
} from '../../common/decorators/validation.decorator';
import {
    CreateDateColumnStandard,
    UpdateDateColumnStandard,
} from '../../common/decorators/date-columns.decorator';

@Entity('contact')
@Unique(['ownerId', 'contactUserId'])
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'owner_id' })
    @IsUUID()
    ownerId: string;

    @Column({ name: 'contact_user_id', nullable: true })
    @IsOptional()
    @IsUUID()
    contactUserId?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsEmailFlexible()
    email?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsPhoneNumberFlexible()
    phone?: string;

    @Column({ name: 'display_name' })
    @IsStringLength(1, 100)
    displayName: string;

    @Column({ name: 'wallet_address', nullable: true })
    @IsOptional()
    @IsSolanaAddress()
    walletAddress?: string;

    @Column({ name: 'is_app_user', default: false })
    @IsBoolean()
    isAppUser: boolean;

    @CreateDateColumnStandard({
        comment: 'Contact creation timestamp',
    })
    createdAt: Date;

    @UpdateDateColumnStandard({
        comment: 'Contact last update timestamp',
    })
    updatedAt: Date;

    // Relationships
    @ManyToOne('User', 'ownedContacts')
    @JoinColumn({ name: 'owner_id' })
    owner: any;

    @ManyToOne('User', 'contactReferences')
    @JoinColumn({ name: 'contact_user_id' })
    contactUser?: any;
}
