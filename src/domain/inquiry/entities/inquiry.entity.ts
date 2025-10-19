import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum InquiryType {
    WAITLIST = 'WAITLIST',
    GENERAL = 'GENERAL',
}

@Entity('inquiry')
export class Inquiry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    inquiry: string;

    @Column({
        type: 'enum',
        enum: InquiryType,
        default: InquiryType.WAITLIST,
    })
    type: InquiryType;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
