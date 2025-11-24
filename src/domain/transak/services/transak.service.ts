import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
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
import { TokenType } from '../../common/enums/token-type.enum';
import {
    TransakWebhookDto,
    TransakWebhookDataDto,
} from '../dto/transak-webhook.dto';

@Injectable()
export class TransakService {
    private readonly logger = new Logger(TransakService.name);

    constructor(
        @InjectRepository(OnRampTransaction)
        private readonly onRampRepository: Repository<OnRampTransaction>,
        @InjectRepository(OffRampTransaction)
        private readonly offRampRepository: Repository<OffRampTransaction>,
        private readonly onRampService: OnRampService,
        private readonly offRampService: OffRampService,
    ) {}

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
     * Build Transak widget URL with all required parameters
     */
    buildWidgetUrl(params: {
        apiKey: string;
        environment: 'staging' | 'production';
        walletAddress: string;
        rampType: 'BUY' | 'SELL';
        userEmail?: string;
        kycShareToken?: string;
        cryptoCurrency?: string;
        fiatCurrency?: string;
        defaultAmount?: number;
        partnerCustomerId?: string;
    }): string {
        const baseUrl =
            params.environment === 'production'
                ? 'https://global.transak.com'
                : 'https://global-stg.transak.com';

        const urlParams = new URLSearchParams({
            apiKey: params.apiKey,
            walletAddress: params.walletAddress,
            network: 'solana',
            productsAvailed: params.rampType,
            hideMenu: 'true',
            themeColor: '7C3AED', // Rampa purple
        });

        if (params.userEmail) {
            urlParams.append('email', params.userEmail);
        }

        if (params.kycShareToken) {
            urlParams.append('kycShareToken', params.kycShareToken);
        }

        if (params.cryptoCurrency) {
            urlParams.append('cryptoCurrencyCode', params.cryptoCurrency);
        }

        if (params.fiatCurrency) {
            urlParams.append('fiatCurrency', params.fiatCurrency);
        }

        if (params.defaultAmount) {
            if (params.rampType === 'BUY') {
                urlParams.append(
                    'defaultFiatAmount',
                    params.defaultAmount.toString(),
                );
            } else {
                urlParams.append(
                    'defaultCryptoAmount',
                    params.defaultAmount.toString(),
                );
            }
        }

        if (params.partnerCustomerId) {
            urlParams.append('partnerCustomerId', params.partnerCustomerId);
        }

        // For off-ramp: enable wallet redirection
        if (params.rampType === 'SELL') {
            urlParams.append('walletRedirection', 'true');
        }

        return `${baseUrl}?${urlParams.toString()}`;
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

    private mapCryptoToTokenType(crypto: string): TokenType {
        const map: Record<string, TokenType> = {
            SOL: TokenType.SOL,
            USDC: TokenType.USDC,
            EURC: TokenType.EURC,
        };
        return map[crypto] || TokenType.USDC;
    }
}
