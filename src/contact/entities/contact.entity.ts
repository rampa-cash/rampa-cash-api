import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContactType {
  WAITLIST = 'WAITLIST',
  CONTACT = 'CONTACT',
}

@Entity('contact')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  inquiry: string;

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.WAITLIST,
  })
  type: ContactType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
