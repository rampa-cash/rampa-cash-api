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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { OnRampService } from '../services/onramp.service';
import { CreateOnRampDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import { RampStatus, RampType } from '../entities/onoff-ramp.entity';

@ApiTags('OnRamp')
@ApiBearerAuth('BearerAuth')
@Controller('onramp')
@UseGuards(JwtAuthGuard)
export class OnRampController {
    constructor(private onRampService: OnRampService) {}

    @Post('initiate')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(UserVerificationGuard)
    async initiateOnRamp(
        @Request() req: any,
        @Body() createOnRampDto: CreateOnRampDto,
    ) {
        // Ensure the user is the authenticated user
        const onRampData = {
            ...createOnRampDto,
            userId: req.user.id,
        };

        const onRamp = await this.onRampService.createOnRamp(onRampData);

        return {
            id: onRamp.id,
            userId: onRamp.userId,
            walletId: onRamp.walletId,
            type: onRamp.type,
            amount: onRamp.amount,
            fiatAmount: onRamp.fiatAmount,
            fiatCurrency: onRamp.fiatCurrency,
            tokenType: onRamp.tokenType,
            status: onRamp.status,
            provider: onRamp.provider,
            exchangeRate: onRamp.exchangeRate,
            fee: onRamp.fee,
            createdAt: onRamp.createdAt,
        };
    }

    @Get()
    async getOnRamps(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const onRamps = await this.onRampService.findAll(
            req.user.id,
            'onramp' as any,
        );

        let filteredOnRamps = onRamps;

        if (status) {
            filteredOnRamps = onRamps.filter(
                (onRamp) => onRamp.status === (status as RampStatus),
            );
        }

        // Apply pagination
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = offset ? parseInt(offset) : 0;
            filteredOnRamps = filteredOnRamps.slice(
                offsetNum,
                offsetNum + limitNum,
            );
        }

        return filteredOnRamps.map((onRamp) => ({
            id: onRamp.id,
            userId: onRamp.userId,
            walletId: onRamp.walletId,
            type: onRamp.type,
            amount: onRamp.amount,
            fiatAmount: onRamp.fiatAmount,
            fiatCurrency: onRamp.fiatCurrency,
            tokenType: onRamp.tokenType,
            status: onRamp.status,
            provider: onRamp.provider,
            providerTransactionId: onRamp.providerTransactionId,
            exchangeRate: onRamp.exchangeRate,
            fee: onRamp.fee,
            createdAt: onRamp.createdAt,
            completedAt: onRamp.completedAt,
            failedAt: onRamp.failedAt,
            failureReason: onRamp.failureReason,
        }));
    }

    @Get('pending')
    async getPendingOnRamps(@Request() req: any) {
        const pendingOnRamps = await this.onRampService.findByStatus(
            'pending' as any,
        );

        // Filter to only include user's on-ramps
        const userPendingOnRamps = pendingOnRamps.filter(
            (onRamp) =>
                onRamp.userId === req.user.id &&
                onRamp.type === RampType.ONRAMP,
        );

        return userPendingOnRamps.map((onRamp) => ({
            id: onRamp.id,
            amount: onRamp.amount,
            fiatAmount: onRamp.fiatAmount,
            fiatCurrency: onRamp.fiatCurrency,
            tokenType: onRamp.tokenType,
            status: onRamp.status,
            provider: onRamp.provider,
            exchangeRate: onRamp.exchangeRate,
            fee: onRamp.fee,
            createdAt: onRamp.createdAt,
        }));
    }

    @Get(':id')
    async getOnRamp(@Request() req: any, @Param('id') id: string) {
        const onRamp = await this.onRampService.findOne(id);

        // Ensure the on-ramp belongs to the authenticated user
        if (onRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this on-ramp');
        }

        return {
            id: onRamp.id,
            userId: onRamp.userId,
            walletId: onRamp.walletId,
            type: onRamp.type,
            amount: onRamp.amount,
            fiatAmount: onRamp.fiatAmount,
            fiatCurrency: onRamp.fiatCurrency,
            tokenType: onRamp.tokenType,
            status: onRamp.status,
            provider: onRamp.provider,
            providerTransactionId: onRamp.providerTransactionId,
            exchangeRate: onRamp.exchangeRate,
            fee: onRamp.fee,
            createdAt: onRamp.createdAt,
            completedAt: onRamp.completedAt,
            failedAt: onRamp.failedAt,
            failureReason: onRamp.failureReason,
        };
    }

    @Post(':id/process')
    @HttpCode(HttpStatus.OK)
    async processOnRamp(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { providerTransactionId: string },
    ) {
        const onRamp = await this.onRampService.findOne(id);

        // Ensure the on-ramp belongs to the authenticated user
        if (onRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot process this on-ramp');
        }

        const processedOnRamp = await this.onRampService.processOnRamp(
            id,
            body.providerTransactionId,
        );

        return {
            id: processedOnRamp.id,
            status: processedOnRamp.status,
            providerTransactionId: processedOnRamp.providerTransactionId,
            completedAt: processedOnRamp.completedAt,
        };
    }

    @Post(':id/fail')
    @HttpCode(HttpStatus.OK)
    async failOnRamp(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { failureReason: string },
    ) {
        const onRamp = await this.onRampService.findOne(id);

        // Ensure the on-ramp belongs to the authenticated user
        if (onRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot fail this on-ramp');
        }

        const failedOnRamp = await this.onRampService.failRamp(
            id,
            body.failureReason,
        );

        return {
            id: failedOnRamp.id,
            status: failedOnRamp.status,
            failureReason: failedOnRamp.failureReason,
            failedAt: failedOnRamp.failedAt,
        };
    }

    @Get('stats/summary')
    async getOnRampStats(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const stats = await this.onRampService.getRampStats(
            req.user.id,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );

        return {
            totalOnRamp: stats.totalOnRamp,
            totalFees: stats.totalFees,
            completedOnRamp: stats.completedOnRamp,
            failedOnRamp: stats.failedOnRamp,
        };
    }

    @Get('providers/:provider/transaction/:providerTransactionId')
    async getOnRampByProvider(
        @Request() req: any,
        @Param('provider') provider: string,
        @Param('providerTransactionId') providerTransactionId: string,
    ) {
        const onRamp = await this.onRampService.findByProvider(
            provider,
            providerTransactionId,
        );

        if (!onRamp) {
            return { message: 'On-ramp not found' };
        }

        // Ensure the on-ramp belongs to the authenticated user
        if (onRamp.userId !== req.user.id) {
            throw new Error('Unauthorized: Cannot access this on-ramp');
        }

        return {
            id: onRamp.id,
            userId: onRamp.userId,
            walletId: onRamp.walletId,
            type: onRamp.type,
            amount: onRamp.amount,
            fiatAmount: onRamp.fiatAmount,
            fiatCurrency: onRamp.fiatCurrency,
            tokenType: onRamp.tokenType,
            status: onRamp.status,
            provider: onRamp.provider,
            providerTransactionId: onRamp.providerTransactionId,
            exchangeRate: onRamp.exchangeRate,
            fee: onRamp.fee,
            createdAt: onRamp.createdAt,
            completedAt: onRamp.completedAt,
            failedAt: onRamp.failedAt,
            failureReason: onRamp.failureReason,
        };
    }
}
