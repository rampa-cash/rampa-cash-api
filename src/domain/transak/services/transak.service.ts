import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { getTransakPaymentMethod, getThemeParams } from '../utils';
import { getTransakConfig } from '../../../config/transak.config';
import {
    OnRampTransaction,
    OnRampStatus,
    OnRampProvider,
} from '../../onramp/entities/onramp-transaction.entity';
import {
    OffRampTransaction,
    OffRampStatus,
    OffRampProvider,
} from '../../offramp/entities/offramp-transaction.entity';
import { OnRampService } from '../../onramp/services/onramp.service';
import { OffRampService } from '../../offramp/services/offramp.service';
import {
    TransakWebhookDto,
    TransakWebhookDataDto,
} from '../dto/transak-webhook.dto';

@Injectable()
export class TransakService {
    private readonly logger = new Logger(TransakService.name);
    private readonly transakConfig: ReturnType<typeof getTransakConfig>;

    constructor(
        @InjectRepository(OnRampTransaction)
        private readonly onRampRepository: Repository<OnRampTransaction>,
        @InjectRepository(OffRampTransaction)
        private readonly offRampRepository: Repository<OffRampTransaction>,
        private readonly onRampService: OnRampService,
        private readonly offRampService: OffRampService,
        private readonly configService: ConfigService,
    ) {
        this.transakConfig = getTransakConfig(this.configService);
    }

    /**
     * Verify Transak webhook signature using HMAC-SHA256
     */
    verifyWebhookSignature(
        payload: string,
        signature: string,
        secret: string,
    ): boolean {
        try {
            const expectedSignature = createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature),
            );
        } catch (error) {
            this.logger.error('Error verifying webhook signature', error);
            return false;
        }
    }

    /**
     * Get access token from Transak API
     * According to Transak docs, we need to call Refresh Access Token API first
     * Reference: https://docs.transak.com/reference/refresh-access-token
     */
    private async getAccessToken(): Promise<string> {
        const apiGatewayUrl = this.transakConfig.baseUrl;
        const refreshTokenEndpoint = `${apiGatewayUrl}/api/v2/auth/refresh-token`;

        this.logger.debug(
            `[Transak Auth] Getting access token from: ${refreshTokenEndpoint}`,
        );

        try {
            const response = await fetch(refreshTokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    authorization: this.transakConfig.apiSecret, // API secret in authorization header
                },
                body: JSON.stringify({
                    apiKey: this.transakConfig.apiKey, // API key in request body
                }),
            });

            const responseText = await response.text();

            this.logger.log(
                `[Transak Auth] Response Status: ${response.status} ${response.statusText}`,
            );
            this.logger.debug(`[Transak Auth] Response Body: ${responseText}`);

            if (!response.ok) {
                this.logger.error(
                    `[Transak Auth] Failed to get access token: ${response.status} - ${responseText}`,
                );
                throw new Error(
                    `Transak auth error: ${response.status} - ${responseText}`,
                );
            }

            const responseData = JSON.parse(responseText);

            if (!responseData.accessToken) {
                this.logger.error(
                    `[Transak Auth] No accessToken in response: ${JSON.stringify(responseData)}`,
                );
                throw new Error('Transak API did not return accessToken');
            }

            this.logger.log(
                `[Transak Auth] Access token obtained successfully`,
            );

            return responseData.accessToken;
        } catch (error) {
            this.logger.error(
                `[Transak Auth] Exception: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Create Transak widget URL using their API endpoint
     * According to Transak API docs: https://docs.transak.com/reference/create-widget-url
     * This calls POST /api/v2/auth/session to create a secure session
     */
    async createWidgetUrl(params: {
        apiKey: string;
        walletAddress: string;
        rampType: 'BUY' | 'SELL';
        userEmail?: string;
        kycShareToken?: string;
        fiatCurrency?: string;
        fiatAmount?: number; // Lock fiat amount for BUY (user cannot edit)
        cryptoAmount?: number; // Lock crypto amount for SELL (user cannot edit)
        paymentMethod?: string; // Generic method ID ('bank' or 'card')
        hideExchangeScreen?: boolean; // Skip exchange screen
        themeMode?: 'LIGHT' | 'DARK'; // Theme mode matching mobile app
        partnerCustomerId?: string;
        referrerDomain?: string; // Domain where widget will be embedded
    }): Promise<string> {
        const apiGatewayUrl = this.transakConfig.baseUrl;
        const sessionEndpoint = `${apiGatewayUrl}/api/v2/auth/session`;

        // Get theme parameters based on theme mode
        const themeParams = getThemeParams(params.themeMode);

        // Build widgetParams object according to Transak API spec
        const widgetParams: Record<string, any> = {
            apiKey: params.apiKey,
            referrerDomain: params.referrerDomain || 'rampa.app', // Required by Transak API
            walletAddress: params.walletAddress,
            disableWalletAddressForm: 'true',
            network: 'solana',
            productsAvailed: params.rampType,
            hideMenu: 'true',
            cryptoCurrencyCode: 'USDC',
            // Theme parameters
            themeColor: themeParams.themeColor,
            colorMode: themeParams.colorMode,
            backgroundColors: themeParams.backgroundColors,
            textColors: themeParams.textColors,
            borderColors: themeParams.borderColors,
        };

        if (params.userEmail) {
            widgetParams.email = params.userEmail;
        }

        if (params.kycShareToken) {
            widgetParams.kycShareTokenProvider = 'SUMSUB';
            widgetParams.kycShareToken = params.kycShareToken;
        }

        if (params.fiatCurrency) {
            widgetParams.fiatCurrency = params.fiatCurrency;
        }

        // Amount handling: Use fiatAmount for BUY, cryptoAmount for SELL
        if (params.rampType === 'BUY' && params.fiatAmount !== undefined) {
            widgetParams.fiatAmount = params.fiatAmount.toString();
        } else if (
            params.rampType === 'SELL' &&
            params.cryptoAmount !== undefined
        ) {
            widgetParams.cryptoAmount = params.cryptoAmount.toString();
        }

        // Payment method mapping and locking
        if (params.paymentMethod) {
            const transakPaymentMethod = getTransakPaymentMethod(
                params.paymentMethod,
            );
            if (transakPaymentMethod) {
                widgetParams.paymentMethod = transakPaymentMethod;
            }
        }

        // hideExchangeScreen: Only set if ALL 6 required parameters are present
        if (params.hideExchangeScreen) {
            const hasAmount =
                params.rampType === 'BUY'
                    ? params.fiatAmount !== undefined
                    : params.cryptoAmount !== undefined;
            const hasFiatCurrency = params.fiatCurrency !== undefined;
            const hasPaymentMethod =
                params.paymentMethod !== undefined &&
                getTransakPaymentMethod(params.paymentMethod) !== undefined;

            if (hasAmount && hasFiatCurrency && hasPaymentMethod) {
                widgetParams.hideExchangeScreen = 'true';
            }
        }

        if (params.partnerCustomerId) {
            widgetParams.partnerCustomerId = params.partnerCustomerId;
        }

        // For off-ramp: enable wallet redirection
        if (params.rampType === 'SELL') {
            widgetParams.walletRedirection = 'true';
        }

        // Build request body according to Transak API spec
        const requestBody = {
            widgetParams,
            landingPage: 'HomePage', // Default landing page
        };

        // Log request (sanitized)
        const sanitizedWidgetParams = { ...widgetParams };
        if (sanitizedWidgetParams.apiKey) {
            sanitizedWidgetParams.apiKey =
                sanitizedWidgetParams.apiKey.substring(0, 8) + '...';
        }
        if (sanitizedWidgetParams.kycShareToken) {
            sanitizedWidgetParams.kycShareToken =
                '***' + sanitizedWidgetParams.kycShareToken.slice(-4);
        }

        this.logger.log(`[Transak API Request] Endpoint: ${sessionEndpoint}`);
        this.logger.log(
            `[Transak API Request] Body: ${JSON.stringify({ widgetParams: sanitizedWidgetParams, landingPage: requestBody.landingPage }, null, 2)}`,
        );

        // Get access token first
        const accessToken = await this.getAccessToken();

        // Make API call to Transak
        try {
            const response = await fetch(sessionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'access-token': accessToken, // Use the access token from refresh-token endpoint
                    authorization: this.transakConfig.apiSecret, // API secret as authorization
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();

            this.logger.log(
                `[Transak API Response] Status: ${response.status} ${response.statusText}`,
            );
            this.logger.log(`[Transak API Response] Body: ${responseText}`);

            if (!response.ok) {
                this.logger.error(
                    `[Transak API Error] Failed to create widget URL: ${response.status} - ${responseText}`,
                );
                throw new Error(
                    `Transak API error: ${response.status} - ${responseText}`,
                );
            }

            const responseData = JSON.parse(responseText);

            // Transak API returns { widgetUrl: string }
            if (!responseData.widgetUrl) {
                this.logger.error(
                    `[Transak API Error] No widgetUrl in response: ${JSON.stringify(responseData)}`,
                );
                throw new Error('Transak API did not return widgetUrl');
            }

            this.logger.log(
                `[Transak API Success] Widget URL received (length: ${responseData.widgetUrl.length} chars)`,
            );

            return responseData.widgetUrl;
        } catch (error) {
            this.logger.error(
                `[Transak API Error] Exception: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Handle Transak webhook event
     */
    async handleWebhook(payload: TransakWebhookDto): Promise<void> {
        const { webhookData } = payload;
        const isOnRamp = webhookData.isBuyOrSell === 'BUY';

        this.logger.log(
            `Processing Transak webhook: ${payload.eventID} - ${webhookData.status} (${isOnRamp ? 'ON-RAMP' : 'OFF-RAMP'})`,
        );

        if (isOnRamp) {
            await this.handleOnRampWebhook(webhookData);
        } else {
            await this.handleOffRampWebhook(webhookData);
        }
    }

    private async handleOnRampWebhook(
        webhookData: TransakWebhookDataDto,
    ): Promise<void> {
        let transaction = await this.onRampRepository.findOne({
            where: { providerTransactionId: webhookData.id },
        });

        // If transaction doesn't exist, try to find by partnerCustomerId
        if (!transaction && webhookData.partnerCustomerId) {
            transaction = await this.onRampRepository.findOne({
                where: {
                    userId: webhookData.partnerCustomerId,
                    provider: OnRampProvider.TRANSAK,
                    status: OnRampStatus.PENDING,
                },
                order: { createdAt: 'DESC' },
            });
        }

        const status = this.mapTransakStatusToOnRamp(webhookData.status);

        if (transaction) {
            // Update existing transaction with ACTUAL data from webhook
            transaction.providerTransactionId = webhookData.id;
            transaction.status = status;

            // ✅ IMPORTANT: Update amounts from webhook (source of truth)
            transaction.amount = webhookData.fiatAmount; // Actual fiat amount
            transaction.tokenAmount = webhookData.cryptoAmount; // Actual crypto amount
            transaction.exchangeRate =
                webhookData.cryptoAmount / webhookData.fiatAmount; // Calculate rate

            if (webhookData.transactionHash) {
                transaction.metadata = {
                    ...transaction.metadata,
                    transactionHash: webhookData.transactionHash,
                };
            }

            if (status === OnRampStatus.COMPLETED) {
                transaction.completedAt = webhookData.completedAt
                    ? new Date(webhookData.completedAt)
                    : new Date();
            } else if (status === OnRampStatus.FAILED) {
                transaction.failedAt = new Date();
                transaction.failureReason = webhookData.status;
            }

            await this.onRampRepository.save(transaction);

            // If completed, call service method to trigger wallet credit
            // This ensures proper wallet crediting logic is executed
            if (status === OnRampStatus.COMPLETED) {
                await this.onRampService.updateTransactionStatus(
                    transaction.providerTransactionId!,
                    status,
                    {
                        transactionHash: webhookData.transactionHash,
                        completedAt: transaction.completedAt?.toISOString(),
                    },
                );
            }
        } else {
            this.logger.warn(
                `No transaction found for Transak order ${webhookData.id}`,
            );
        }
    }

    private async handleOffRampWebhook(
        webhookData: TransakWebhookDataDto,
    ): Promise<void> {
        let transaction = await this.offRampRepository.findOne({
            where: { providerTransactionId: webhookData.id },
        });

        if (!transaction && webhookData.partnerCustomerId) {
            transaction = await this.offRampRepository.findOne({
                where: {
                    userId: webhookData.partnerCustomerId,
                    provider: OffRampProvider.TRANSAK,
                    status: OffRampStatus.PENDING,
                },
                order: { createdAt: 'DESC' },
            });
        }

        const status = this.mapTransakStatusToOffRamp(webhookData.status);

        if (transaction) {
            // Update existing transaction with ACTUAL data from webhook
            transaction.providerTransactionId = webhookData.id;
            transaction.status = status;

            // ✅ IMPORTANT: Update amounts from webhook (source of truth)
            transaction.tokenAmount = webhookData.cryptoAmount; // Actual crypto amount
            transaction.fiatAmount = webhookData.fiatAmount; // Actual fiat amount
            transaction.exchangeRate =
                webhookData.fiatAmount / webhookData.cryptoAmount; // Calculate rate

            if (status === OffRampStatus.COMPLETED) {
                transaction.completedAt = webhookData.completedAt
                    ? new Date(webhookData.completedAt)
                    : new Date();
            } else if (status === OffRampStatus.FAILED) {
                transaction.failedAt = new Date();
                transaction.failureReason = webhookData.status;
            }

            await this.offRampRepository.save(transaction);
        } else {
            this.logger.warn(
                `No transaction found for Transak order ${webhookData.id}`,
            );
        }
    }

    private mapTransakStatusToOnRamp(transakStatus: string): OnRampStatus {
        const statusMap: Record<string, OnRampStatus> = {
            ORDER_CREATED: OnRampStatus.PENDING,
            ORDER_PROCESSING: OnRampStatus.PROCESSING,
            ORDER_PAYMENT_VERIFYING: OnRampStatus.PROCESSING,
            ORDER_COMPLETED: OnRampStatus.COMPLETED,
            ORDER_FAILED: OnRampStatus.FAILED,
            ORDER_CANCELLED: OnRampStatus.CANCELLED,
        };
        return statusMap[transakStatus] || OnRampStatus.PENDING;
    }

    private mapTransakStatusToOffRamp(transakStatus: string): OffRampStatus {
        const statusMap: Record<string, OffRampStatus> = {
            ORDER_CREATED: OffRampStatus.PENDING,
            ORDER_PROCESSING: OffRampStatus.PROCESSING,
            ORDER_PAYMENT_VERIFYING: OffRampStatus.PROCESSING,
            ORDER_COMPLETED: OffRampStatus.COMPLETED,
            ORDER_FAILED: OffRampStatus.FAILED,
            ORDER_CANCELLED: OffRampStatus.CANCELLED,
        };
        return statusMap[transakStatus] || OffRampStatus.PENDING;
    }
}
