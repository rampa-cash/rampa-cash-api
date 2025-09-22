import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { InquiryService } from '../inquiry.service';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { CreateWaitlistInquiryDto } from '../dto/create-waitlist-inquiry.dto';
import { UpdateInquiryDto } from '../dto/update-inquiry.dto';

@ApiTags('Inquiry')
@Controller('inquiry')
export class InquiryController {
    constructor(private readonly inquiryService: InquiryService) {}

    private validateId(id: string): number {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new BadRequestException(
                'Invalid inquiry ID. Must be a valid number.',
            );
        }
        return numericId;
    }

    @Post()
    @ApiOperation({ summary: 'Create a new inquiry' })
    @ApiBody({ type: CreateInquiryDto, description: 'Inquiry data' })
    @ApiResponse({ status: 201, description: 'Inquiry created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    create(@Body() createInquiryDto: CreateInquiryDto) {
        return this.inquiryService.create(createInquiryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all inquiries' })
    @ApiResponse({ status: 200, description: 'Inquiries retrieved successfully' })
    findAll() {
        return this.inquiryService.findAll();
    }

    @Get('waitlist')
    @ApiOperation({ summary: 'Get all waitlist inquiries' })
    @ApiResponse({ status: 200, description: 'Waitlist inquiries retrieved successfully' })
    fetchWaitlist() {
        return this.inquiryService.fetchWaitlist();
    }

    @Post('waitlist')
    @ApiOperation({ summary: 'Add inquiry to waitlist' })
    @ApiBody({ type: CreateWaitlistInquiryDto, description: 'Waitlist inquiry data - type is automatically set to WAITLIST' })
    @ApiResponse({ status: 201, description: 'Inquiry added to waitlist successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    createWaitlist(@Body() createWaitlistInquiryDto: CreateWaitlistInquiryDto) {
        return this.inquiryService.createWaitlist(createWaitlistInquiryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get inquiry by ID' })
    @ApiParam({ name: 'id', description: 'Inquiry ID' })
    @ApiResponse({ status: 200, description: 'Inquiry retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Invalid inquiry ID' })
    @ApiResponse({ status: 404, description: 'Inquiry not found' })
    findOne(@Param('id') id: string) {
        return this.inquiryService.findOne(this.validateId(id));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete inquiry by ID' })
    @ApiParam({ name: 'id', description: 'Inquiry ID' })
    @ApiResponse({ status: 200, description: 'Inquiry deleted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid inquiry ID' })
    @ApiResponse({ status: 404, description: 'Inquiry not found' })
    remove(@Param('id') id: string) {
        return this.inquiryService.remove(this.validateId(id));
    }
}
