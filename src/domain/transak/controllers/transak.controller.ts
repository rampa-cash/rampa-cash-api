import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    Request,
    UnauthorizedException,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';
import { TransakService } from '../services/transak.service';
import { ProviderRouterService } from '../../ramp/services/provider-router.service';
import { SumsubService } from '../../sumsub/services/sumsub.service';
import { GetTransakWidgetUrlDto } from '../dto/get-widget-url.dto';
import { TransakWebhookDto } from '../dto/transak-webhook.dto';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { WalletService } from '../../wallet/services/wallet.service';

@ApiTags('Transak')
@Controller('transak')
export class TransakController {
    constructor(
        private readonly transakService: TransakService,
        private readonly providerRouterService: ProviderRouterService,
        private readonly sumsubService: SumsubService,
        private readonly configService: ConfigService,
        private readonly walletService: WalletService,
    ) {}

    @Post('widget-url')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Generate provider-agnostic widget URL for on-ramp or off-ramp',
        description:
            'Generates a secure widget URL with automatic provider selection based on user region. Returns provider name for mobile SDK selection. The API key never leaves the backend.',
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
                detectedCountry: {
                    type: 'string',
                    description: 'Detected country code (ISO 2-letter)',
                },
                detectionMethod: {
                    type: 'string',
                    enum: [
                        'kyc_residence',
                        'kyc_document',
                        'ip_geolocation',
                        'profile_fallback',
                        'manual_override',
                    ],
                    description: 'How the country was detected',
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
        description: 'Invalid request or no provider available',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async getWidgetUrl(
        @Request() req: any,
        @Body() dto: GetTransakWidgetUrlDto,
        @Req() expressReq: ExpressRequest,
    ): Promise<{
        widgetUrl: string;
        provider: string;
        detectedCountry: string;
        detectionMethod: string;
        expiresAt?: string;
    }> {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Validate wallet belongs to user
        const wallets = await this.walletService.getUserWallets(userId);
        const wallet = wallets.find((w) => w.address === dto.walletAddress);

        if (!wallet) {
            throw new UnauthorizedException(
                'Wallet does not belong to authenticated user',
            );
        }

        // Get request IP for geolocation fallback
        const requestIp =
            (expressReq.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            expressReq.socket.remoteAddress ||
            undefined;

        // Smart provider selection based on user region
        const providerResult =
            await this.providerRouterService.selectProviderForUser(
                userId,
                dto.rampType,
                requestIp,
                dto.manualCountryOverride,
            );

        if (!providerResult) {
            throw new BadRequestException(
                'No ramp provider available for your region. Please contact support.',
            );
        }

        const { provider, detection } = providerResult;

        // Get KYC share token if user is verified (only for Transak currently)
        let kycShareToken: string | undefined;
        let expiresAt: Date | undefined;

        if (provider.name === 'transak') {
            try {
                const tokenResult = await this.sumsubService.generateShareToken(
                    userId,
                    'transak',
                    3600,
                );
                kycShareToken = tokenResult.token;
                expiresAt = tokenResult.expiresAt;
            } catch (error) {
                // User not verified - that's okay, Transak will handle KYC
                // Continue without share token
            }
        }

        // Build widget URL for selected provider
        // Currently only Transak is implemented, but structure supports multiple providers
        let widgetUrl: string;

        if (provider.name === 'transak') {
            const apiKey = this.configService.get<string>('TRANSAK_API_KEY');
            const environment = (this.configService.get<string>(
                'TRANSAK_ENVIRONMENT',
            ) || 'staging') as 'staging' | 'production';

            if (!apiKey) {
                throw new Error('TRANSAK_API_KEY not configured');
            }

            widgetUrl = this.transakService.buildWidgetUrl({
                apiKey,
                environment,
                walletAddress: dto.walletAddress,
                rampType: dto.rampType,
                userEmail,
                kycShareToken,
                cryptoCurrency: dto.cryptoCurrency,
                fiatCurrency: dto.fiatCurrency,
                defaultAmount: dto.defaultAmount,
                partnerCustomerId: userId, // Critical for webhook matching
            });
        } else {
            // Future LATAM provider or other providers
            throw new BadRequestException(
                `Provider ${provider.name} is not yet implemented`,
            );
        }

        return {
            widgetUrl,
            provider: provider.name, // CRITICAL: Mobile app needs this for SDK selection!
            detectedCountry: detection.country,
            detectionMethod: detection.detectionMethod,
            expiresAt: expiresAt?.toISOString(),
        };
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Transak webhook endpoint (legacy)',
        description:
            'Receives transaction status updates from Transak. Signature verification uses raw HTTP body. This endpoint is kept for backward compatibility. Use POST /ramp/webhook/transak for provider-agnostic routing.',
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
