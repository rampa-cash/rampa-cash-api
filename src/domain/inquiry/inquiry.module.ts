import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { Inquiry } from './entities/inquiry.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Inquiry])],
    controllers: [InquiryController],
    providers: [InquiryService],
})
export class InquiryModule {}
