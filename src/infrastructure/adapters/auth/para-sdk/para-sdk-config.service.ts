import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Para SDK configuration service
 * Manages Para SDK configuration and environment variables
 *
 * This is an ADAPTER in the Port and Adapters architecture
 * Located in infrastructure layer as it deals with external service configuration
 */
@Injectable()
export class ParaSdkConfigService {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Get Para SDK configuration
     *
     * Note: According to Para SDK documentation, only PARA_API_KEY is required.
     * The ParaServer is initialized with just the API key: new ParaServer("YOUR_API_KEY")
     * Reference: https://docs.getpara.com/v2/server/setup
     */
    getConfig() {
        return {
            apiKey: this.configService.get('PARA_API_KEY'),
            // Optional configuration (not used by Para SDK but kept for potential future use)
            environment: this.configService.get(
                'PARA_ENVIRONMENT',
                'development',
            ),
            sessionTtl: this.configService.get('PARA_SESSION_TTL', '3600'),
            enableLogging:
                this.configService.get('PARA_ENABLE_LOGGING', 'true') ===
                'true',
        };
    }

    /**
     * Validate Para SDK configuration
     *
     * According to Para SDK documentation, only PARA_API_KEY is required.
     * Reference: https://docs.getpara.com/v2/server/setup
     */
    validateConfig(): { isValid: boolean; errors: string[] } {
        const config = this.getConfig();
        const errors: string[] = [];

        if (!config.apiKey) {
            errors.push('PARA_API_KEY is required');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get Para SDK client configuration
     *
     * Note: This method is kept for potential future use or custom HTTP client implementations.
     * The Para Server SDK handles its own configuration internally.
     */
    getClientConfig() {
        const config = this.getConfig();
        return {
            apiKey: config.apiKey,
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
