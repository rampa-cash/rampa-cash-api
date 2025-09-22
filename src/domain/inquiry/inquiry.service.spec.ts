import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquiryService } from './inquiry.service';
import { Inquiry } from './entities/inquiry.entity';

describe('InquiryService', () => {
    let service: InquiryService;
    let repository: Repository<Inquiry>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InquiryService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: {
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<InquiryService>(InquiryService);
        repository = module.get<Repository<Inquiry>>(
            getRepositoryToken(Inquiry),
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
