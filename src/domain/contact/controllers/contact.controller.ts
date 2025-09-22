import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from '../contact.service';
import { CreateContactDto, UpdateContactDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Contacts')
@ApiBearerAuth('BearerAuth')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactController {
    constructor(private contactService: ContactService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new contact' })
    @ApiResponse({ status: 201, description: 'Contact created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createContact(
        @Request() req: any,
        @Body() createContactDto: CreateContactDto,
    ) {
        // Ensure the owner is the authenticated user
        const contactData = {
            ...createContactDto,
            ownerId: req.user.id,
        };

        const contact = await this.contactService.create(contactData);

        return {
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all contacts for the authenticated user' })
    @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getContacts(@Request() req: any) {
        const contacts = await this.contactService.findAll(req.user.id);

        return contacts.map((contact) => ({
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        }));
    }

    @Get('app-users')
    async getAppUserContacts(@Request() req: any) {
        const contacts = await this.contactService.getAppUserContacts(
            req.user.id,
        );

        return contacts.map((contact) => ({
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        }));
    }

    @Get('non-app-users')
    async getNonAppUserContacts(@Request() req: any) {
        const contacts = await this.contactService.getNonAppUserContacts(
            req.user.id,
        );

        return contacts.map((contact) => ({
            id: contact.id,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        }));
    }

    @Get('search')
    @ApiOperation({ summary: 'Search contacts by name, email, or phone' })
    @ApiQuery({ name: 'q', description: 'Search term', required: true })
    @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async searchContacts(@Request() req: any, @Query('q') searchTerm: string) {
        if (!searchTerm) {
            return [];
        }

        const contacts = await this.contactService.searchContacts(
            req.user.id,
            searchTerm,
        );

        return contacts.map((contact) => ({
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        }));
    }

    @Get('stats')
    async getContactStats(@Request() req: any) {
        const stats = await this.contactService.getContactStats(req.user.id);

        return {
            totalContacts: stats.totalContacts,
            appUserContacts: stats.appUserContacts,
            nonAppUserContacts: stats.nonAppUserContacts,
        };
    }

    @Get('sync')
    @HttpCode(HttpStatus.OK)
    async syncWithAppUsers(@Request() req: any) {
        const syncedContacts = await this.contactService.syncWithAppUsers(
            req.user.id,
        );

        return {
            message: 'Contacts synced with app users',
            syncedCount: syncedContacts.length,
            syncedContacts: syncedContacts.map((contact) => ({
                id: contact.id,
                displayName: contact.displayName,
                isAppUser: contact.isAppUser,
                walletAddress: contact.walletAddress,
            })),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific contact by ID' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async getContact(@Request() req: any, @Param('id') id: string) {
        const contact = await this.contactService.findOne(id);

        // Ensure the contact belongs to the authenticated user
        if (contact.ownerId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this contact');
        }

        return {
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: 200, description: 'Contact updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async updateContact(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateContactDto: UpdateContactDto,
    ) {
        const contact = await this.contactService.findOne(id);

        // Ensure the contact belongs to the authenticated user
        if (contact.ownerId !== req.user.id) {
            throw new Error('Unauthorized: Cannot update this contact');
        }

        const updatedContact = await this.contactService.update(
            id,
            updateContactDto,
        );

        return {
            id: updatedContact.id,
            contactUserId: updatedContact.contactUserId,
            email: updatedContact.email,
            phone: updatedContact.phone,
            displayName: updatedContact.displayName,
            walletAddress: updatedContact.walletAddress,
            isAppUser: updatedContact.isAppUser,
            updatedAt: updatedContact.updatedAt,
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a contact' })
    @ApiParam({ name: 'id', description: 'Contact ID' })
    @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Contact not found' })
    async deleteContact(@Request() req: any, @Param('id') id: string) {
        const contact = await this.contactService.findOne(id);

        // Ensure the contact belongs to the authenticated user
        if (contact.ownerId !== req.user.id) {
            throw new Error('Unauthorized: Cannot delete this contact');
        }

        await this.contactService.remove(id);

        return { message: 'Contact deleted successfully' };
    }

    @Get('by-email/:email')
    async getContactByEmail(
        @Request() req: any,
        @Param('email') email: string,
    ) {
        const contact = await this.contactService.findByEmail(
            req.user.id,
            email,
        );

        if (!contact) {
            return { message: 'Contact not found' };
        }

        return {
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        };
    }

    @Get('by-phone/:phone')
    async getContactByPhone(
        @Request() req: any,
        @Param('phone') phone: string,
    ) {
        const contact = await this.contactService.findByPhone(
            req.user.id,
            phone,
        );

        if (!contact) {
            return { message: 'Contact not found' };
        }

        return {
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        };
    }

    @Get('by-wallet/:walletAddress')
    async getContactByWalletAddress(
        @Request() req: any,
        @Param('walletAddress') walletAddress: string,
    ) {
        const contact = await this.contactService.findByWalletAddress(
            req.user.id,
            walletAddress,
        );

        if (!contact) {
            return { message: 'Contact not found' };
        }

        return {
            id: contact.id,
            contactUserId: contact.contactUserId,
            email: contact.email,
            phone: contact.phone,
            displayName: contact.displayName,
            walletAddress: contact.walletAddress,
            isAppUser: contact.isAppUser,
            createdAt: contact.createdAt,
        };
    }
}
