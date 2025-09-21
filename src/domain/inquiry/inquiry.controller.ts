import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

@Controller('inquiry')
export class InquiryController {
    constructor(private readonly inquiryService: InquiryService) { }

    private validateId(id: string): number {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new BadRequestException('Invalid inquiry ID. Must be a valid number.');
        }
        return numericId;
    }

    @Post()
    create(@Body() createInquiryDto: CreateInquiryDto) {
        return this.inquiryService.create(createInquiryDto);
    }

    @Get()
    findAll() {
        return this.inquiryService.findAll();
    }

    @Get('waitlist')
    fetchWaitlist() {
        return this.inquiryService.fetchWaitlist();
    }

    @Post('waitlist')
    createWaitlist(@Body() createInquiryDto: CreateInquiryDto) {
        return this.inquiryService.createWaitlist(createInquiryDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.inquiryService.findOne(this.validateId(id));
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateInquiryDto: UpdateInquiryDto) {
        return this.inquiryService.update(this.validateId(id), updateInquiryDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.inquiryService.remove(this.validateId(id));
    }
}
