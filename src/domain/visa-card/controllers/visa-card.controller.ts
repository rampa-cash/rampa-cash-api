import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { VISACardService } from '../visa-card.service';
import { CreateVisaCardDto, UpdateVisaCardDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('visa-card')
@UseGuards(JwtAuthGuard)
export class VISACardController {
    constructor(private visaCardService: VISACardService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createVISACard(@Request() req: any, @Body() createVISACardDto: CreateVisaCardDto) {
        // Ensure the user is the authenticated user
        const visaCardData = {
            ...createVISACardDto,
            userId: req.user.id,
        };

        const visaCard = await this.visaCardService.create(visaCardData);

        return {
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            expiresAt: visaCard.expiresAt,
        };
    }

    @Get()
    async getVISACard(@Request() req: any) {
        const visaCard = await this.visaCardService.findByUserId(req.user.id);

        if (!visaCard) {
            return { message: 'No VISA card found for user' };
        }

        return {
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            activatedAt: visaCard.activatedAt,
            expiresAt: visaCard.expiresAt,
        };
    }

    @Get('all')
    async getAllVISACards(@Request() req: any) {
        const visaCards = await this.visaCardService.findAll();

        return visaCards.map(visaCard => ({
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            activatedAt: visaCard.activatedAt,
            expiresAt: visaCard.expiresAt,
        }));
    }

    @Get('by-status/:status')
    async getVISACardsByStatus(@Request() req: any, @Param('status') status: string) {
        const visaCards = await this.visaCardService.findByStatus(status as any);

        return visaCards.map(visaCard => ({
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            activatedAt: visaCard.activatedAt,
            expiresAt: visaCard.expiresAt,
        }));
    }

    @Get('expired')
    async getExpiredVISACards(@Request() req: any) {
        const expiredCards = await this.visaCardService.getExpiredCards();

        return expiredCards.map(visaCard => ({
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            activatedAt: visaCard.activatedAt,
            expiresAt: visaCard.expiresAt,
        }));
    }

    @Get('stats')
    async getVISACardStats(@Request() req: any) {
        const stats = await this.visaCardService.getCardStats(req.user.id);

        return {
            totalCards: stats.totalCards,
            activeCards: stats.activeCards,
            suspendedCards: stats.suspendedCards,
            cancelledCards: stats.cancelledCards,
            expiredCards: stats.expiredCards,
        };
    }

    @Get(':id')
    async getVISACardById(@Request() req: any, @Param('id') id: string) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this VISA card');
        }

        return {
            id: visaCard.id,
            userId: visaCard.userId,
            cardNumber: visaCard.cardNumber,
            cardType: visaCard.cardType,
            status: visaCard.status,
            balance: visaCard.balance,
            dailyLimit: visaCard.dailyLimit,
            monthlyLimit: visaCard.monthlyLimit,
            createdAt: visaCard.createdAt,
            activatedAt: visaCard.activatedAt,
            expiresAt: visaCard.expiresAt,
        };
    }

    @Put(':id')
    async updateVISACard(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateVISACardDto: UpdateVisaCardDto
    ) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot update this VISA card');
        }

        const updatedVISACard = await this.visaCardService.update(id, updateVISACardDto);

        return {
            id: updatedVISACard.id,
            userId: updatedVISACard.userId,
            cardNumber: updatedVISACard.cardNumber,
            cardType: updatedVISACard.cardType,
            status: updatedVISACard.status,
            balance: updatedVISACard.balance,
            dailyLimit: updatedVISACard.dailyLimit,
            monthlyLimit: updatedVISACard.monthlyLimit,
            createdAt: updatedVISACard.createdAt,
            activatedAt: updatedVISACard.activatedAt,
            expiresAt: updatedVISACard.expiresAt,
        };
    }

    @Post(':id/activate')
    @HttpCode(HttpStatus.OK)
    async activateVISACard(@Request() req: any, @Param('id') id: string) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot activate this VISA card');
        }

        const activatedCard = await this.visaCardService.activate(id);

        return {
            id: activatedCard.id,
            status: activatedCard.status,
            activatedAt: activatedCard.activatedAt,
        };
    }

    @Post(':id/suspend')
    @HttpCode(HttpStatus.OK)
    async suspendVISACard(@Request() req: any, @Param('id') id: string) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot suspend this VISA card');
        }

        const suspendedCard = await this.visaCardService.suspend(id);

        return {
            id: suspendedCard.id,
            status: suspendedCard.status,
        };
    }

    @Post(':id/reactivate')
    @HttpCode(HttpStatus.OK)
    async reactivateVISACard(@Request() req: any, @Param('id') id: string) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot reactivate this VISA card');
        }

        const reactivatedCard = await this.visaCardService.reactivate(id);

        return {
            id: reactivatedCard.id,
            status: reactivatedCard.status,
        };
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    async cancelVISACard(@Request() req: any, @Param('id') id: string) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot cancel this VISA card');
        }

        const cancelledCard = await this.visaCardService.cancel(id);

        return {
            id: cancelledCard.id,
            status: cancelledCard.status,
        };
    }

    @Post(':id/update-balance')
    @HttpCode(HttpStatus.OK)
    async updateBalance(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { amount: number }
    ) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot update balance for this VISA card');
        }

        const updatedCard = await this.visaCardService.updateBalance(id, body.amount);

        return {
            id: updatedCard.id,
            balance: updatedCard.balance,
        };
    }

    @Post(':id/check-spending-limits')
    @HttpCode(HttpStatus.OK)
    async checkSpendingLimits(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { amount: number }
    ) {
        const visaCard = await this.visaCardService.findOne(id);

        // Ensure the VISA card belongs to the authenticated user
        if (visaCard.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot check spending limits for this VISA card');
        }

        const limits = await this.visaCardService.checkSpendingLimits(id, body.amount);

        return {
            canSpend: limits.canSpend,
            dailyRemaining: limits.dailyRemaining,
            monthlyRemaining: limits.monthlyRemaining,
            requestedAmount: body.amount,
        };
    }
}
