import { ConfigService } from '@nestjs/config';

export interface TransakConfig {
    apiKey: string;
    webhookSecret: string;
    environment: 'staging' | 'production';
    baseUrl: string;
}

export const getTransakConfig = (
    configService: ConfigService,
): TransakConfig => {
    return {
        apiKey: configService.get<string>('TRANSAK_API_KEY') || '',
        webhookSecret:
            configService.get<string>('TRANSAK_WEBHOOK_SECRET') || '',
        environment: (configService.get<string>('TRANSAK_ENVIRONMENT') ||
            'staging') as 'staging' | 'production',
        baseUrl:
            configService.get<string>('TRANSAK_BASE_URL') ||
            'https://api.transak.com',
    };
};
