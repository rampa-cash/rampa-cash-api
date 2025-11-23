import { ConfigService } from '@nestjs/config';

export interface SumsubConfig {
    appToken: string;
    secretKey: string;
    baseUrl: string;
    levelName: string;
    webhookSecret?: string;
    webhookPath: string;
}

export const getSumsubConfig = (configService: ConfigService): SumsubConfig => {
    return {
        appToken: configService.get<string>('SUMSUB_APP_TOKEN', ''),
        secretKey: configService.get<string>('SUMSUB_SECRET_KEY', ''),
        baseUrl: configService.get<string>(
            'SUMSUB_BASE_URL',
            'https://api.sumsub.com',
        ),
        levelName: configService.get<string>(
            'SUMSUB_LEVEL_NAME',
            'basic-kyc-level',
        ),
        webhookSecret: configService.get<string>('SUMSUB_WEBHOOK_SECRET'),
        webhookPath: configService.get<string>(
            'SUMSUB_WEBHOOK_PATH',
            '/sumsub/webhook',
        ),
    };
};
