import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
    Req,
    Request,
    UnauthorizedException,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';
import { TransakService } from '../services/transak.service';
import { SumsubService } from '../../sumsub/services/sumsub.service';
import { GetTransakWidgetUrlDto } from '../dto/get-widget-url.dto';
import { TransakWebhookDto } from '../dto/transak-webhook.dto';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { WalletService } from '../../wallet/services/wallet.service';

@ApiTags('Transak')
@Controller('transak')
export class TransakController {
    private readonly logger = new Logger(TransakController.name);

    constructor(
        private readonly transakService: TransakService,
        private readonly sumsubService: SumsubService,
        private readonly configService: ConfigService,
        private readonly walletService: WalletService,
    ) {}

    @Post('widget-url')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Generate Transak widget URL for on-ramp or off-ramp',
        description:
            'Generates a secure Transak widget URL with enhanced UX features. Supports theme customization, amount/payment method locking, and exchange screen skipping. The API key never leaves the backend.',
    })
    @ApiResponse({
        status: 200,
        description: 'Widget URL generated successfully',
        schema: {
            type: 'object',
            properties: {
                widgetUrl: { type: 'string' },
                provider: {
                    type: 'string',
                    description:
                        'Provider name (e.g., "transak") - CRITICAL for mobile SDK selection',
                },
                expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description:
            'Invalid request or user does not have a wallet address configured',
    })
    async getWidgetUrl(
        @Request() req: any,
        @Body() dto: GetTransakWidgetUrlDto,
    ): Promise<{
        widgetUrl: string;
        provider: string;
        expiresAt?: string;
    }> {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Get user's wallet address from database
        const wallet = await this.walletService.findByUserId(userId);

        if (!wallet) {
            throw new BadRequestException({
                error: 'NO_WALLET',
                message: 'User does not have a wallet address configured',
            });
        }

        const walletAddress = wallet.address;

        // Get KYC share token if user is verified
        // Note: Token is valid for 20 minutes according to Transak docs
        // The service will look up applicantId from sumsub_applicant table using userId
        let kycShareToken: string | undefined;
        let expiresAt: Date | undefined;

        try {
            const tokenResult = await this.sumsubService.generateShareToken(
                userId, // Authenticated user's ID from session - service will lookup applicantId from database
                'transak', // forClientId must be "transak" for Transak integration
                1200, // 20 minutes (1200 seconds) - Transak requirement
            );
            kycShareToken = tokenResult.token;
            expiresAt = tokenResult.expiresAt;
        } catch (error) {
            // User not verified - that's okay, Transak will handle KYC
            // Continue without share token
        }

        // Build Transak widget URL
        const apiKey = this.configService.get<string>('TRANSAK_API_KEY');

        if (!apiKey) {
            throw new Error('TRANSAK_API_KEY not configured');
        }

        // Prepare request parameters for logging
        const requestParams = {
            apiKey: apiKey.substring(0, 8) + '...', // Log partial key for security
            walletAddress,
            rampType: dto.rampType,
            userEmail,
            kycShareToken: kycShareToken
                ? '***' + kycShareToken.slice(-4)
                : undefined, // Log partial token
            fiatCurrency: dto.fiatCurrency,
            fiatAmount: dto.fiatAmount,
            cryptoAmount: dto.cryptoAmount,
            paymentMethod: dto.paymentMethod,
            hideExchangeScreen: dto.hideExchangeScreen,
            themeMode: dto.themeMode,
            partnerCustomerId: userId,
        };

        // Log request parameters
        this.logger.log(
            `[Transak Widget URL Request] Parameters: ${JSON.stringify(requestParams, null, 2)}`,
        );

        // Call Transak API to create widget URL
        const widgetUrl = await this.transakService.createWidgetUrl({
            apiKey,
            walletAddress,
            rampType: dto.rampType,
            userEmail,
            kycShareToken,
            fiatCurrency: dto.fiatCurrency,
            fiatAmount: dto.fiatAmount, // For BUY operations
            cryptoAmount: dto.cryptoAmount, // For SELL operations
            paymentMethod: dto.paymentMethod,
            hideExchangeScreen: dto.hideExchangeScreen,
            themeMode: dto.themeMode,
            partnerCustomerId: userId, // Critical for webhook matching
            referrerDomain: 'rampa.app', // TODO: Get from config or request
        });

        // Log generated widget URL (truncated for security)
        const urlForLogging =
            widgetUrl.length > 200
                ? widgetUrl.substring(0, 200) + '...'
                : widgetUrl;
        this.logger.log(`[Transak Widget URL Generated] URL: ${urlForLogging}`);
        this.logger.debug(
            `[Transak Widget URL Generated] Full URL: ${widgetUrl}`,
        );

        return {
            widgetUrl,
            provider: 'transak',
            expiresAt:
                expiresAt && !isNaN(expiresAt.getTime())
                    ? expiresAt.toISOString()
                    : undefined,
        };
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Transak webhook endpoint (legacy)',
        description:
            'Receives transaction status updates from Transak. Signature verification uses raw HTTP body.',
    })
    @ApiResponse({ status: 200, description: 'Webhook received and processed' })
    @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
    async handleWebhook(
        @Req() req: ExpressRequest & { body: Buffer },
        @Headers('x-webhook-signature') signature: string,
    ): Promise<{ received: boolean }> {
        // CRITICAL: When using express.raw(), req.body is a Buffer
        // Convert to string for signature verification
        const rawBody = req.body.toString('utf8');

        if (!rawBody) {
            throw new UnauthorizedException(
                'Raw body not available for signature verification',
            );
        }

        // Parse JSON for processing (but use raw body for verification)
        const payload: TransakWebhookDto = JSON.parse(rawBody);

        // Verify signature using the EXACT raw body as received
        const webhookSecret = this.configService.get<string>(
            'TRANSAK_WEBHOOK_SECRET',
        );

        if (!webhookSecret) {
            throw new Error('TRANSAK_WEBHOOK_SECRET not configured');
        }

        if (
            !this.transakService.verifyWebhookSignature(
                rawBody,
                signature,
                webhookSecret,
            )
        ) {
            throw new UnauthorizedException('Invalid webhook signature');
        }

        // Process webhook
        await this.transakService.handleWebhook(payload);

        return { received: true };
    }
}
