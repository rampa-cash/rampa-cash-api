import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { UserService } from '../user/user.service';
import { CreateContactDto, UpdateContactDto } from './dto';

@Injectable()
export class ContactService {
    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        private userService: UserService,
    ) {}

    async create(createContactDto: CreateContactDto): Promise<Contact> {
        const {
            ownerId,
            contactUserId,
            email,
            phone,
            displayName,
            walletAddress,
            isAppUser = false,
        } = createContactDto;

        // Validate that either contactUserId or (email/phone) is provided
        if (!contactUserId && !email && !phone) {
            throw new BadRequestException(
                'Either contactUserId or email/phone must be provided',
            );
        }

        // If contactUserId is provided, verify the user exists
        if (contactUserId) {
            try {
                await this.userService.findOne(contactUserId);
            } catch (error) {
                throw new BadRequestException('Contact user not found');
            }

            // Check if contact already exists
            const existingContact = await this.contactRepository.findOne({
                where: { ownerId, contactUserId },
            });

            if (existingContact) {
                throw new ConflictException('Contact already exists');
            }
        } else {
            // Check if contact with email/phone already exists for this owner
            const whereCondition: any = { ownerId };
            if (email) whereCondition.email = email;
            if (phone) whereCondition.phone = phone;

            const existingContact = await this.contactRepository.findOne({
                where: whereCondition,
            });

            if (existingContact) {
                throw new ConflictException(
                    'Contact with this email/phone already exists',
                );
            }
        }

        const contact = this.contactRepository.create({
            ownerId,
            contactUserId,
            email,
            phone,
            displayName,
            walletAddress,
            isAppUser,
        });

        return await this.contactRepository.save(contact);
    }

    async findAll(ownerId: string): Promise<Contact[]> {
        return await this.contactRepository.find({
            where: { ownerId },
            relations: ['contactUser'],
            order: { displayName: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id },
            relations: ['owner', 'contactUser'],
        });

        if (!contact) {
            throw new NotFoundException(`Contact with ID ${id} not found`);
        }

        return contact;
    }

    async findByEmail(ownerId: string, email: string): Promise<Contact | null> {
        return await this.contactRepository.findOne({
            where: { ownerId, email },
            relations: ['contactUser'],
        });
    }

    async findByPhone(ownerId: string, phone: string): Promise<Contact | null> {
        return await this.contactRepository.findOne({
            where: { ownerId, phone },
            relations: ['contactUser'],
        });
    }

    async findByWalletAddress(
        ownerId: string,
        walletAddress: string,
    ): Promise<Contact | null> {
        return await this.contactRepository.findOne({
            where: { ownerId, walletAddress },
            relations: ['contactUser'],
        });
    }

    async update(
        id: string,
        updateContactDto: UpdateContactDto,
    ): Promise<Contact> {
        const contact = await this.findOne(id);

        // Check for wallet address conflicts if walletAddress is being updated
        if (
            updateContactDto.walletAddress &&
            updateContactDto.walletAddress !== contact.walletAddress
        ) {
            const existingContact = await this.contactRepository.findOne({
                where: {
                    ownerId: contact.ownerId,
                    walletAddress: updateContactDto.walletAddress,
                },
            });

            if (existingContact) {
                throw new ConflictException(
                    'Contact with this wallet address already exists',
                );
            }
        }

        Object.assign(contact, updateContactDto);
        return await this.contactRepository.save(contact);
    }

    async remove(id: string): Promise<void> {
        const contact = await this.findOne(id);
        await this.contactRepository.remove(contact);
    }

    async searchContacts(
        ownerId: string,
        searchTerm: string,
    ): Promise<Contact[]> {
        return await this.contactRepository
            .createQueryBuilder('contact')
            .where('contact.ownerId = :ownerId', { ownerId })
            .andWhere(
                '(contact.displayName ILIKE :searchTerm OR contact.email ILIKE :searchTerm OR contact.phone ILIKE :searchTerm)',
                { searchTerm: `%${searchTerm}%` },
            )
            .leftJoinAndSelect('contact.contactUser', 'contactUser')
            .orderBy('contact.displayName', 'ASC')
            .getMany();
    }

    async getAppUserContacts(ownerId: string): Promise<Contact[]> {
        return await this.contactRepository.find({
            where: { ownerId, isAppUser: true },
            relations: ['contactUser'],
            order: { displayName: 'ASC' },
        });
    }

    async getNonAppUserContacts(ownerId: string): Promise<Contact[]> {
        return await this.contactRepository.find({
            where: { ownerId, isAppUser: false },
            order: { displayName: 'ASC' },
        });
    }

    async syncWithAppUsers(ownerId: string): Promise<Contact[]> {
        // Find contacts that have email/phone matching app users
        const contacts = await this.contactRepository.find({
            where: { ownerId, isAppUser: false },
            relations: ['contactUser'],
        });

        const syncedContacts: Contact[] = [];

        for (const contact of contacts) {
            if (contact.email) {
                const appUser = await this.userService.findByEmail(
                    contact.email,
                );
                if (appUser) {
                    contact.contactUserId = appUser.id;
                    contact.isAppUser = true;
                    contact.walletAddress = appUser.wallet?.address;
                    syncedContacts.push(
                        await this.contactRepository.save(contact),
                    );
                }
            } else if (contact.phone) {
                const appUser = await this.userService.findByPhone(
                    contact.phone,
                );
                if (appUser) {
                    contact.contactUserId = appUser.id;
                    contact.isAppUser = true;
                    contact.walletAddress = appUser.wallet?.address;
                    syncedContacts.push(
                        await this.contactRepository.save(contact),
                    );
                }
            }
        }

        return syncedContacts;
    }

    async getContactStats(ownerId: string): Promise<{
        totalContacts: number;
        appUserContacts: number;
        nonAppUserContacts: number;
    }> {
        const [total, appUsers, nonAppUsers] = await Promise.all([
            this.contactRepository.count({ where: { ownerId } }),
            this.contactRepository.count({
                where: { ownerId, isAppUser: true },
            }),
            this.contactRepository.count({
                where: { ownerId, isAppUser: false },
            }),
        ]);

        return {
            totalContacts: total,
            appUserContacts: appUsers,
            nonAppUserContacts: nonAppUsers,
        };
    }
}
