import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OffRampService } from '../offramp.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RampStatus, RampType } from '../entities/onoff-ramp.entity';

export interface CreateOffRampDto {
    userId: string;
    walletId: string;
    amount: number;
    fiatAmount: number;
    fiatCurrency: string;
    tokenType: string;
    provider: string;
    exchangeRate: number;
    fee?: number;
}

@ApiTags('OffRamp')
@ApiBearerAuth('BearerAuth')
@Controller('offramp')
@UseGuards(JwtAuthGuard)
export class OffRampController {
    constructor(private offRampService: OffRampService) {}

    @Post('initiate')
    @HttpCode(HttpStatus.CREATED)
    async initiateOffRamp(
        @Request() req: any,
        @Body() createOffRampDto: CreateOffRampDto,
    ) {
        // Ensure the user is the authenticated user
        const offRampData = {
            ...createOffRampDto,
            userId: req.user.id,
        };

        const offRamp = await this.offRampService.createOffRamp(offRampData);

        return {
            id: offRamp.id,
            userId: offRamp.userId,
            walletId: offRamp.walletId,
            type: offRamp.type,
            amount: offRamp.amount,
            fiatAmount: offRamp.fiatAmount,
            fiatCurrency: offRamp.fiatCurrency,
            tokenType: offRamp.tokenType,
            status: offRamp.status,
            provider: offRamp.provider,
            exchangeRate: offRamp.exchangeRate,
            fee: offRamp.fee,
            createdAt: offRamp.createdAt,
        };
    }

    @Get()
    async getOffRamps(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const offRamps = await this.offRampService.findAll(req.user.id);

        let filteredOffRamps = offRamps;

        if (status) {
            filteredOffRamps = offRamps.filter(
                (offRamp) => offRamp.status === (status as RampStatus),
            );
        }

        // Apply pagination
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = offset ? parseInt(offset) : 0;
            filteredOffRamps = filteredOffRamps.slice(
                offsetNum,
                offsetNum + limitNum,
            );
        }

        return filteredOffRamps.map((offRamp) => ({
            id: offRamp.id,
            userId: offRamp.userId,
            walletId: offRamp.walletId,
            type: offRamp.type,
            amount: offRamp.amount,
            fiatAmount: offRamp.fiatAmount,
            fiatCurrency: offRamp.fiatCurrency,
            tokenType: offRamp.tokenType,
            status: offRamp.status,
            provider: offRamp.provider,
            providerTransactionId: offRamp.providerTransactionId,
            exchangeRate: offRamp.exchangeRate,
            fee: offRamp.fee,
            createdAt: offRamp.createdAt,
            completedAt: offRamp.completedAt,
            failedAt: offRamp.failedAt,
            failureReason: offRamp.failureReason,
        }));
    }

    @Get('pending')
    async getPendingOffRamps(@Request() req: any) {
        const pendingOffRamps = await this.offRampService.findByStatus(
            'pending' as any,
        );

        // Filter to only include user's off-ramps
        const userPendingOffRamps = pendingOffRamps.filter(
            (offRamp) =>
                offRamp.userId === req.user.id &&
                offRamp.type === RampType.OFFRAMP,
        );

        return userPendingOffRamps.map((offRamp) => ({
            id: offRamp.id,
            amount: offRamp.amount,
            fiatAmount: offRamp.fiatAmount,
            fiatCurrency: offRamp.fiatCurrency,
            tokenType: offRamp.tokenType,
            status: offRamp.status,
            provider: offRamp.provider,
            exchangeRate: offRamp.exchangeRate,
            fee: offRamp.fee,
            createdAt: offRamp.createdAt,
        }));
    }

    @Get(':id')
    async getOffRamp(@Request() req: any, @Param('id') id: string) {
        const offRamp = await this.offRampService.findOne(id);

        // Ensure the off-ramp belongs to the authenticated user
        if (offRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this off-ramp');
        }

        return {
            id: offRamp.id,
            userId: offRamp.userId,
            walletId: offRamp.walletId,
            type: offRamp.type,
            amount: offRamp.amount,
            fiatAmount: offRamp.fiatAmount,
            fiatCurrency: offRamp.fiatCurrency,
            tokenType: offRamp.tokenType,
            status: offRamp.status,
            provider: offRamp.provider,
            providerTransactionId: offRamp.providerTransactionId,
            exchangeRate: offRamp.exchangeRate,
            fee: offRamp.fee,
            createdAt: offRamp.createdAt,
            completedAt: offRamp.completedAt,
            failedAt: offRamp.failedAt,
            failureReason: offRamp.failureReason,
        };
    }

    @Post(':id/process')
    @HttpCode(HttpStatus.OK)
    async processOffRamp(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { providerTransactionId: string },
    ) {
        const offRamp = await this.offRampService.findOne(id);

        // Ensure the off-ramp belongs to the authenticated user
        if (offRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot process this off-ramp');
        }

        const processedOffRamp = await this.offRampService.processOffRamp(
            id,
            body.providerTransactionId,
        );

        return {
            id: processedOffRamp.id,
            status: processedOffRamp.status,
            providerTransactionId: processedOffRamp.providerTransactionId,
            completedAt: processedOffRamp.completedAt,
        };
    }

    @Post(':id/fail')
    @HttpCode(HttpStatus.OK)
    async failOffRamp(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { failureReason: string },
    ) {
        const offRamp = await this.offRampService.findOne(id);

        // Ensure the off-ramp belongs to the authenticated user
        if (offRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot fail this off-ramp');
        }

        const failedOffRamp = await this.offRampService.failRamp(
            id,
            body.failureReason,
        );

        return {
            id: failedOffRamp.id,
            status: failedOffRamp.status,
            failureReason: failedOffRamp.failureReason,
            failedAt: failedOffRamp.failedAt,
        };
    }

    @Get('stats/summary')
    async getOffRampStats(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const stats = await this.offRampService.getOffRampStats(
            req.user.id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );

        return {
            totalOffRamp: stats.totalOffRamp,
            totalFees: stats.totalFees,
            completedOffRamp: stats.completedOffRamp,
            failedOffRamp: stats.failedOffRamp,
        };
    }

    @Get('providers/:provider/transaction/:providerTransactionId')
    async getOffRampByProvider(
        @Request() req: any,
        @Param('provider') provider: string,
        @Param('providerTransactionId') providerTransactionId: string,
    ) {
        const offRamp = await this.offRampService.findByProvider(
            provider,
            providerTransactionId,
        );

        if (!offRamp) {
            return { message: 'Off-ramp not found' };
        }

        // Ensure the off-ramp belongs to the authenticated user
        if (offRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this off-ramp');
        }

        return {
            id: offRamp.id,
            userId: offRamp.userId,
            walletId: offRamp.walletId,
            type: offRamp.type,
            amount: offRamp.amount,
            fiatAmount: offRamp.fiatAmount,
            fiatCurrency: offRamp.fiatCurrency,
            tokenType: offRamp.tokenType,
            status: offRamp.status,
            provider: offRamp.provider,
            providerTransactionId: offRamp.providerTransactionId,
            exchangeRate: offRamp.exchangeRate,
            fee: offRamp.fee,
            createdAt: offRamp.createdAt,
            completedAt: offRamp.completedAt,
            failedAt: offRamp.failedAt,
            failureReason: offRamp.failureReason,
        };
    }
}
