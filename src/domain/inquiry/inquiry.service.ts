import { Injectable, Logger } from '@nestjs/common';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
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
            this.logger.error(
                `Failed to create inquiry: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw error;
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

    async createWaitlist(createInquiryDto: CreateInquiryDto) {
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
            this.logger.error(
                `Failed to create waitlist inquiry: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw error;
        }
    }
}
