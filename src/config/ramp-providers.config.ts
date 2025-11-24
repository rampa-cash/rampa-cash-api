import { ConfigService } from '@nestjs/config';

export interface RampProviderConfig {
    name: 'transak' | 'moonpay' | 'ramp' | string;
    regions: string[]; // ISO country codes: ['ES', 'FR', 'DE', 'BR', 'MX', etc.]
    apiKey: string;
    webhookSecret: string;
    environment: 'staging' | 'production';
    baseUrl: string;
    supportedCurrencies: {
        fiat: string[];
        crypto: string[];
    };
    minAmounts: {
        onRamp: number;
        offRamp: number;
    };
}

export function getRampProvidersConfig(
    configService: ConfigService,
): RampProviderConfig[] {
    const environment =
        (configService.get<string>('NODE_ENV') || 'staging') === 'production'
            ? 'production'
            : 'staging';

    return [
        {
            name: 'transak',
            regions: [
                // European Union
                'AT',
                'BE',
                'BG',
                'HR',
                'CY',
                'CZ',
                'DK',
                'EE',
                'FI',
                'FR',
                'DE',
                'GR',
                'HU',
                'IE',
                'IT',
                'LV',
                'LT',
                'LU',
                'MT',
                'NL',
                'PL',
                'PT',
                'RO',
                'SK',
                'SI',
                'ES',
                'SE',
                // Other European countries
                'GB',
                'CH',
                'NO',
                'IS',
                'LI',
                'MC',
                'AD',
                'SM',
                'VA',
            ],
            apiKey: configService.get<string>('TRANSAK_API_KEY') || '',
            webhookSecret:
                configService.get<string>('TRANSAK_WEBHOOK_SECRET') || '',
            environment,
            baseUrl:
                environment === 'production'
                    ? 'https://global.transak.com'
                    : 'https://global-stg.transak.com',
            supportedCurrencies: {
                fiat: ['EUR', 'GBP', 'CHF', 'USD'],
                crypto: ['SOL', 'USDC', 'EURC'],
            },
            minAmounts: {
                onRamp: 30, // €30 minimum
                offRamp: 50, // €50 minimum
            },
        },
        // Future LATAM provider (example - replace with actual provider)
        // {
        //     name: 'bkcup',
        //     regions: ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY', 'VE'],
        //     apiKey: configService.get<string>('BKCUP_API_KEY') || '',
        //     webhookSecret: configService.get<string>('BKCUP_WEBHOOK_SECRET') || '',
        //     environment,
        //     baseUrl: environment === 'production'
        //         ? 'https://api.bkcup.com'
        //         : 'https://api-staging.bkcup.com',
        //     supportedCurrencies: {
        //         fiat: ['USD', 'ARS', 'BRL', 'CLP', 'COP', 'MXN', 'PEN'],
        //         crypto: ['SOL', 'USDC']
        //     },
        //     minAmounts: {
        //         onRamp: 20,
        //         offRamp: 30
        //     }
        // }
    ];
}

/**
 * Select provider based on user's country
 */
export function selectProvider(
    userCountry: string,
    providers: RampProviderConfig[],
): RampProviderConfig | null {
    if (!userCountry) {
        return null;
    }

    const countryCode = userCountry.toUpperCase();
    const provider = providers.find((p) => p.regions.includes(countryCode));

    if (!provider) {
        return null;
    }

    return provider;
}
