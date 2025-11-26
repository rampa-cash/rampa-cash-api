import { ConfigService } from '@nestjs/config';

export interface TransakConfig {
    apiKey: string;
    apiSecret: string;
    webhookSecret: string;
    baseUrl: string; // Base URL for refresh token endpoint (api-stg.transak.com)
    gatewayBaseUrl: string; // Gateway URL for widget URL endpoint (api-gateway-stg.transak.com)
}

export const getTransakConfig = (
    configService: ConfigService,
): TransakConfig => {
    return {
        apiKey: configService.get<string>('TRANSAK_API_KEY') || '',
        apiSecret: configService.get<string>('TRANSAK_API_SECRET') || '',
        webhookSecret:
            configService.get<string>('TRANSAK_WEBHOOK_SECRET') || '',
        baseUrl:
            configService.get<string>('TRANSAK_BASE_URL') ||
            'https://api-stg.transak.com',
        gatewayBaseUrl:
            configService.get<string>('TRANSAK_GATEWAY_BASE_URL') ||
            'https://api-gateway-stg.transak.com',
    };
};
