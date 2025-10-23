import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Para SDK configuration service
 * Manages Para SDK configuration and environment variables
 */
@Injectable()
export class ParaSdkConfigService {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Get Para SDK configuration
     */
    getConfig() {
        return {
            apiKey: this.configService.get('PARA_API_KEY'),
            apiSecret: this.configService.get('PARA_API_SECRET'),
            baseUrl: this.configService.get('PARA_BASE_URL', 'https://api.getpara.com'),
            environment: this.configService.get('PARA_ENVIRONMENT', 'development'),
            walletProvider: this.configService.get('PARA_WALLET_PROVIDER', 'para'),
            sessionTtl: this.configService.get('PARA_SESSION_TTL', '3600'),
            enableLogging: this.configService.get('PARA_ENABLE_LOGGING', 'true') === 'true',
        };
    }

    /**
     * Validate Para SDK configuration
     */
    validateConfig(): { isValid: boolean; errors: string[] } {
        const config = this.getConfig();
        const errors: string[] = [];

        if (!config.apiKey) {
            errors.push('PARA_API_KEY is required');
        }

        if (!config.apiSecret) {
            errors.push('PARA_API_SECRET is required');
        }

        if (!config.baseUrl) {
            errors.push('PARA_BASE_URL is required');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get Para SDK client configuration
     */
    getClientConfig() {
        const config = this.getConfig();
        return {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            environment: config.environment,
            timeout: 30000, // 30 seconds
            retries: 3,
            enableLogging: config.enableLogging,
        };
    }

    /**
     * Get session configuration
     */
    getSessionConfig() {
        const config = this.getConfig();
        return {
            ttl: parseInt(config.sessionTtl, 10),
            refreshThreshold: 300, // 5 minutes before expiry
            maxRefreshAttempts: 3,
        };
    }
}
