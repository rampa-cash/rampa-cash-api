import { registerAs } from '@nestjs/config';

export interface PaymentProviderConfig {
    transak: {
        apiKey: string;
        secretKey: string;
        environment: 'sandbox' | 'production';
        baseUrl: string;
    };
    moonpay: {
        apiKey: string;
        secretKey: string;
        environment: 'sandbox' | 'production';
        baseUrl: string;
    };
    ramp: {
        apiKey: string;
        secretKey: string;
        environment: 'sandbox' | 'production';
        baseUrl: string;
    };
    wyre: {
        apiKey: string;
        secretKey: string;
        environment: 'sandbox' | 'production';
        baseUrl: string;
    };
}

export default registerAs(
    'payment',
    (): PaymentProviderConfig => ({
        transak: {
            apiKey: process.env.TRANSAK_API_KEY || '',
            secretKey: process.env.TRANSAK_SECRET_KEY || '',
            environment:
                (process.env.TRANSAK_ENVIRONMENT as 'sandbox' | 'production') ||
                'sandbox',
            baseUrl: process.env.TRANSAK_BASE_URL || 'https://api.transak.com',
        },
        moonpay: {
            apiKey: process.env.MOONPAY_API_KEY || '',
            secretKey: process.env.MOONPAY_SECRET_KEY || '',
            environment:
                (process.env.MOONPAY_ENVIRONMENT as 'sandbox' | 'production') ||
                'sandbox',
            baseUrl: process.env.MOONPAY_BASE_URL || 'https://api.moonpay.com',
        },
        ramp: {
            apiKey: process.env.RAMP_API_KEY || '',
            secretKey: process.env.RAMP_SECRET_KEY || '',
            environment:
                (process.env.RAMP_ENVIRONMENT as 'sandbox' | 'production') ||
                'sandbox',
            baseUrl: process.env.RAMP_BASE_URL || 'https://api.ramp.network',
        },
        wyre: {
            apiKey: process.env.WYRE_API_KEY || '',
            secretKey: process.env.WYRE_SECRET_KEY || '',
            environment:
                (process.env.WYRE_ENVIRONMENT as 'sandbox' | 'production') ||
                'sandbox',
            baseUrl: process.env.WYRE_BASE_URL || 'https://api.sendwyre.com',
        },
    }),
);
