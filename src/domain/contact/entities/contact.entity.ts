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
import {
    IsUUID,
    IsOptional,
    IsString,
    IsBoolean,
    IsEmail,
    Length,
} from 'class-validator';

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
    @IsEmail()
    email?: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    phone?: string;

    @Column({ name: 'display_name' })
    @IsString()
    @Length(1, 100)
    displayName: string;

    @Column({ name: 'wallet_address', nullable: true })
    @IsOptional()
    @IsString()
    walletAddress?: string;

    @Column({ name: 'is_app_user', default: false })
    @IsBoolean()
    isAppUser: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relationships
    @ManyToOne('User', 'ownedContacts')
    @JoinColumn({ name: 'owner_id' })
    owner: any;

    @ManyToOne('User', 'contactReferences')
    @JoinColumn({ name: 'contact_user_id' })
    contactUser?: any;
}
