import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactType } from './entities/contact.entity';

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
    ) { }

    async create(createContactDto: CreateContactDto) {
        this.logger.log(`Creating new contact: ${createContactDto.email}`);
        try {
            const now = new Date();
            const contact = await this.contactRepository.save({
                ...createContactDto,
                createdAt: now,
                updatedAt: now
            });
            this.logger.log(`Contact created successfully with ID: ${contact.id}`);
            return contact;
        } catch (error) {
            this.logger.error(`Failed to create contact: ${error.message}`, error.stack);
            throw error;
        }
    }

    findAll() {
        return this.contactRepository.find();
    }

    findOne(id: number) {
        return this.contactRepository.findOne({ where: { id } });
    }

    update(id: number, updateContactDto: UpdateContactDto) {
        return this.contactRepository.update(id, updateContactDto);
    }

    remove(id: number) {
        return this.contactRepository.delete(id);
    }

    fetchWaitlist() {
        return this.contactRepository.find({ where: { type: ContactType.WAITLIST } });
    }

    async createWaitlist(createContactDto: CreateContactDto) {
        this.logger.log(`Creating new waitlist contact: ${createContactDto.email}`);
        try {
            const now = new Date();
            const contact = await this.contactRepository.save({ 
                ...createContactDto, 
                type: ContactType.WAITLIST,
                createdAt: now,
                updatedAt: now
            });
            this.logger.log(`Waitlist contact created successfully with ID: ${contact.id}`);
            return contact;
        } catch (error) {
            this.logger.error(`Failed to create waitlist contact: ${error.message}`, error.stack);
            throw error;
        }
    }
}
