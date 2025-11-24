import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Headers,
    HttpCode,
    HttpStatus,
    Req,
    Request,
    UnauthorizedException,
    BadRequestException,
    HttpException,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { TransakService } from '../../transak/services/transak.service';
import { ProviderRouterService } from '../services/provider-router.service';
import { TransakWebhookDto } from '../../transak/dto/transak-webhook.dto';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

@ApiTags('Ramp')
@Controller('ramp')
export class RampController {
    constructor(
        private readonly transakService: TransakService,
        private readonly providerRouterService: ProviderRouterService,
    ) {}

    @Get('availability')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Check provider availability for user',
        description:
            'Returns which provider is available for the user based on their region. Returns provider name for mobile SDK selection.',
    })
    @ApiQuery({
        name: 'rampType',
        required: true,
        enum: ['BUY', 'SELL'],
        description: 'Type of ramp operation',
    })
    @ApiQuery({
        name: 'manualCountry',
        required: false,
        description: 'Manual country override (ISO 2-letter code)',
    })
    @ApiResponse({
        status: 200,
        description: 'Provider availability retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                available: { type: 'boolean' },
                provider: {
                    type: 'string',
                    nullable: true,
                    description:
                        'Provider name (e.g., "transak") - CRITICAL for mobile SDK selection',
                },
                detectedCountry: {
                    type: 'string',
                    nullable: true,
                    description: 'Detected country code (ISO 2-letter)',
                },
                detectionMethod: {
                    type: 'string',
                    nullable: true,
                    enum: [
                        'kyc_residence',
                        'kyc_document',
                        'ip_geolocation',
                        'profile_fallback',
                        'manual_override',
                    ],
                    description: 'How the country was detected',
                },
                supportedCurrencies: {
                    type: 'object',
                    nullable: true,
                    properties: {
                        fiat: { type: 'array', items: { type: 'string' } },
                        crypto: { type: 'array', items: { type: 'string' } },
                    },
                },
                minAmounts: {
                    type: 'object',
                    nullable: true,
                    properties: {
                        onRamp: { type: 'number' },
                        offRamp: { type: 'number' },
                    },
                },
            },
        },
    })
    async getAvailability(
        @Request() req: any,
        @Query('rampType') rampType: 'BUY' | 'SELL',
        @Query('manualCountry') manualCountry: string | undefined,
        @Req() expressReq: ExpressRequest,
    ): Promise<{
        available: boolean;
        provider?: string;
        detectedCountry?: string;
        detectionMethod?: string;
        supportedCurrencies?: {
            fiat: string[];
            crypto: string[];
        };
        minAmounts?: {
            onRamp: number;
            offRamp: number;
        };
    }> {
        const userId = req.user.id;

        // Get request IP for geolocation fallback
        const requestIp =
            (expressReq.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            expressReq.socket.remoteAddress ||
            undefined;

        // Smart provider selection
        const providerResult =
            await this.providerRouterService.selectProviderForUser(
                userId,
                rampType,
                requestIp,
                manualCountry,
            );

        if (!providerResult) {
            return {
                available: false,
            };
        }

        const { provider, detection } = providerResult;

        return {
            available: true,
            provider: provider.name, // CRITICAL: Mobile app needs this for SDK selection!
            detectedCountry: detection.country,
            detectionMethod: detection.detectionMethod,
            supportedCurrencies: provider.supportedCurrencies,
            minAmounts: provider.minAmounts,
        };
    }

    /**
     * Provider-agnostic webhook handler
     * POST /ramp/webhook/:provider
     */
    @Post('webhook/:provider')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Provider-agnostic webhook endpoint',
        description:
            'Receives transaction status updates from any ramp provider. Signature verification uses raw HTTP body.',
    })
    @ApiParam({
        name: 'provider',
        description: 'Provider name (e.g., "transak")',
        example: 'transak',
    })
    @ApiResponse({ status: 200, description: 'Webhook received and processed' })
    @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
    @ApiResponse({ status: 400, description: 'Unsupported provider' })
    async handleProviderWebhook(
        @Param('provider') providerName: string,
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

        // Get provider config
        const provider =
            this.providerRouterService.getProviderByName(providerName);

        if (!provider) {
            throw new BadRequestException(
                `Unsupported provider: ${providerName}`,
            );
        }

        // Verify signature using the EXACT raw body as received
        const webhookSecret = provider.webhookSecret;

        if (!webhookSecret) {
            throw new HttpException(
                `Webhook secret not configured for provider: ${providerName}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // Currently only Transak is implemented
        if (providerName === 'transak') {
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
        } else {
            // Future LATAM provider or other providers
            throw new BadRequestException(
                `Webhook handler for provider ${providerName} is not yet implemented`,
            );
        }

        return { received: true };
    }
}

