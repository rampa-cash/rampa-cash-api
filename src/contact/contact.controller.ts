import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) { }

    private validateId(id: string): number {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new BadRequestException('Invalid contact ID. Must be a valid number.');
        }
        return numericId;
    }

    @Post()
    create(@Body() createContactDto: CreateContactDto) {
        return this.contactService.create(createContactDto);
    }

    @Get()
    findAll() {
        return this.contactService.findAll();
    }

    @Get('waitlist')
    fetchWaitlist() {
        return this.contactService.fetchWaitlist();
    }

    @Post('waitlist')
    createWaitlist(@Body() createContactDto: CreateContactDto) {
        return this.contactService.createWaitlist(createContactDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.contactService.findOne(this.validateId(id));
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
        return this.contactService.update(this.validateId(id), updateContactDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.contactService.remove(this.validateId(id));
    }
}
