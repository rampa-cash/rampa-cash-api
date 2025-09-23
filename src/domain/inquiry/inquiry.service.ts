import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { CreateWaitlistInquiryDto } from './dto/create-waitlist-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryType } from './entities/inquiry.entity';

@Injectable()
export class InquiryService {
    private readonly logger = new Logger(InquiryService.name);

    constructor(
        @InjectRepository(Inquiry)
        private inquiryRepository: Repository<Inquiry>,
    ) {}

    async create(createInquiryDto: CreateInquiryDto) {
        this.logger.log(`Creating new inquiry: ${createInquiryDto.email}`);
        try {
            const now = new Date();
            const inquiry = await this.inquiryRepository.save({
                ...createInquiryDto,
                createdAt: now,
                updatedAt: now,
            });
            this.logger.log(
                `Inquiry created successfully with ID: ${inquiry.id}`,
            );
            return inquiry;
        } catch (error) {
            // Handle database constraint violations
            if (error instanceof Error && error.message.includes('23505')) {
                // Check if it's a unique constraint violation on email
                const existingInquiry = await this.inquiryRepository.findOne({
                    where: {
                        email: createInquiryDto.email,
                        type: createInquiryDto.type || InquiryType.WAITLIST,
                    },
                });

                if (existingInquiry) {
                    this.logger.warn(
                        `Inquiry already exists for email: ${createInquiryDto.email}. Existing inquiry ID: ${existingInquiry.id}, type: ${existingInquiry.type}, created at: ${existingInquiry.createdAt}`,
                    );
                    throw new ConflictException(
                        'Email address is already registered for an inquiry',
                    );
                } else {
                    // If it's a primary key constraint violation, it's likely a race condition
                    this.logger.error(
                        `Primary key constraint violation when creating inquiry for email: ${createInquiryDto.email}. This might be a race condition. Error: ${error.message}`,
                        error.stack,
                    );
                    throw new ConflictException(
                        'An inquiry with this information already exists',
                    );
                }
            } else {
                this.logger.error(
                    `Failed to create inquiry: ${(error as Error).message}`,
                    (error as Error).stack,
                );
                throw error;
            }
        }
    }

    findAll() {
        return this.inquiryRepository.find();
    }

    findOne(id: number) {
        return this.inquiryRepository.findOne({ where: { id } });
    }

    update(id: number, updateInquiryDto: UpdateInquiryDto) {
        return this.inquiryRepository.update(id, updateInquiryDto);
    }

    remove(id: number) {
        return this.inquiryRepository.delete(id);
    }

    fetchWaitlist() {
        return this.inquiryRepository.find({
            where: { type: InquiryType.WAITLIST },
        });
    }

    async createWaitlist(
        createInquiryDto: CreateInquiryDto | CreateWaitlistInquiryDto,
    ) {
        this.logger.log(
            `Creating new waitlist inquiry: ${createInquiryDto.email}`,
        );

        try {
            const now = new Date();
            const inquiry = await this.inquiryRepository.save({
                ...createInquiryDto,
                type: InquiryType.WAITLIST,
                createdAt: now,
                updatedAt: now,
            });

            this.logger.log(
                `Waitlist inquiry created successfully with ID: ${inquiry.id}`,
            );
            return inquiry;
        } catch (error) {
            // Handle database constraint violations
            if (error instanceof Error && error.message.includes('23505')) {
                // Check if it's a unique constraint violation on email
                const existingInquiry = await this.inquiryRepository.findOne({
                    where: {
                        email: createInquiryDto.email,
                        type: InquiryType.WAITLIST,
                    },
                });

                if (existingInquiry) {
                    this.logger.warn(
                        `Inquiry already exists for email: ${createInquiryDto.email}. Existing inquiry ID: ${existingInquiry.id}, type: ${existingInquiry.type}, created at: ${existingInquiry.createdAt}`,
                    );
                    throw new ConflictException(
                        'Email address is already registered for an inquiry',
                    );
                } else {
                    // If it's a primary key constraint violation, it's likely a race condition
                    this.logger.error(
                        `Primary key constraint violation when creating inquiry for email: ${createInquiryDto.email}. This might be a race condition. Error: ${error.message}`,
                        error.stack,
                    );
                    throw new ConflictException(
                        'An inquiry with this information already exists',
                    );
                }
            } else {
                this.logger.error(
                    `Failed to create waitlist inquiry: ${(error as Error).message}`,
                    (error as Error).stack,
                );
                throw error;
            }
        }
    }
}
