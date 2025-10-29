import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export const getCorsConfig = (configService: ConfigService): CorsOptions => {
    const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS')?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
    ];

    const allowedMethods = configService.get<string>('CORS_ALLOWED_METHODS')?.split(',') || [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ];

    const allowedHeaders = configService.get<string>('CORS_ALLOWED_HEADERS')?.split(',') || [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Session-Token',
        'X-Request-ID',
    ];

    const exposedHeaders = configService.get<string>('CORS_EXPOSED_HEADERS')?.split(',') || [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID',
        'X-Response-Time',
    ];

    const credentials = configService.get<boolean>('CORS_CREDENTIALS') ?? true;
    const maxAge = configService.get<number>('CORS_MAX_AGE') || 86400; // 24 hours

    return {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) {
                return callback(null, true);
            }

            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Check if origin matches a pattern (for dynamic subdomains)
            const allowedPatterns = configService.get<string>('CORS_ALLOWED_PATTERNS')?.split(',') || [];
            const isPatternMatch = allowedPatterns.some(pattern => {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(origin);
            });

            if (isPatternMatch) {
                return callback(null, true);
            }

            // In development, allow localhost with any port
            if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
                return callback(null, true);
            }

            // Reject origin
            callback(new Error('Not allowed by CORS'), false);
        },
        methods: allowedMethods,
        allowedHeaders,
        exposedHeaders,
        credentials,
        maxAge,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
};

export const getCorsConfigForHealth = (): CorsOptions => {
    // More permissive CORS for health checks
    return {
        origin: true,
        methods: ['GET', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
        maxAge: 300, // 5 minutes
    };
};
