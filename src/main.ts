import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SolanaExceptionFilter } from './domain/solana/filters/solana-exception.filter';
import { AuditLoggingInterceptor } from './domain/interceptors/audit-logging.interceptor';
import { RateLimitMiddleware } from './domain/middleware/rate-limit.middleware';
import { setupSwagger } from './config/swagger.config';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        abortOnError: false,
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const logger = new Logger('Bootstrap');

    // Set up Winston logger
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    // Security middleware
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        }),
    );

    // Compression middleware
    app.use(compression());

    // CRITICAL: Configure raw body parser for webhook routes BEFORE global pipes
    // This ensures the exact raw HTTP body is available for signature verification
    // Webhook signature verification requires the exact bytes received, not a re-stringified JSON
    app.use('/transak/webhook', express.raw({ type: 'application/json' }));
    app.use('/ramp/webhook', express.raw({ type: 'application/json' })); // Provider-agnostic webhook route
    app.use('/sumsub/webhook', express.raw({ type: 'application/json' }));

    // CORS configuration
    const allowedOrigins = configService
        .get<string>('ALLOWED_ORIGINS')
        ?.split(',') || ['http://localhost:3000'];
    app.enableCors({
        origin: '*', // Allow all origins for testing deployment
        // origin: (
        //     origin: string | undefined,
        //     callback: (err: Error | null, allow?: boolean) => void,
        // ) => {
        //     // Allow requests with no origin (mobile apps, Postman, etc.)
        //     if (!origin) return callback(null, true);

        //     if (allowedOrigins.includes(origin)) {
        //         return callback(null, true);
        //     }

        //     logger.warn(`CORS blocked request from origin: ${origin}`);
        //     return callback(new Error('Not allowed by CORS'), false);
        // },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Auth-Token',
            'X-Request-ID',
            'X-API-Key',
            'Accept',
            'Origin',
            'X-Requested-With',
        ],
        exposedHeaders: [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
            'Retry-After',
        ],
        credentials: true,
        maxAge: 86400, // 24 hours
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            disableErrorMessages:
                configService.get('NODE_ENV') === 'production',
        }),
    );

    // Global exception filters
    // Note: Filters are called in reverse order (last registered is called first)
    // SolanaExceptionFilter should be registered first so HttpExceptionFilter can handle non-Solana errors
    app.useGlobalFilters(
        new SolanaExceptionFilter(),
        new HttpExceptionFilter(),
    );

    // Global interceptors
    app.useGlobalInterceptors(new AuditLoggingInterceptor());

    // Rate limiting middleware
    const rateLimitMiddleware = new RateLimitMiddleware(configService);
    app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

    // Security headers middleware
    app.use((req: any, res: any, next: any) => {
        // Remove X-Powered-By header
        res.removeHeader('X-Powered-By');

        // Add security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
            'Permissions-Policy',
            'geolocation=(), microphone=(), camera=()',
        );

        // Add request ID for tracking
        if (!req.headers['x-request-id']) {
            req.headers['x-request-id'] = Math.random()
                .toString(36)
                .substring(2, 15);
        }

        next();
    });

    // Health check endpoint
    app.use('/health', (req: any, res: any) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
        });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.log('SIGTERM received, shutting down gracefully');
        void app.close().then(() => {
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.log('SIGINT received, shutting down gracefully');
        void app.close().then(() => {
            process.exit(0);
        });
    });

    // Swagger/OpenAPI configuration
    setupSwagger(app);

    const port = configService.get<number>('PORT') || 3001;
    const host = configService.get<string>('HOST') || '0.0.0.0';

    await app.listen(port, host);

    logger.log(`🚀 Application is running on: http://${host}:${port}`);
    logger.log(`📊 Health check available at: http://${host}:${port}/health`);
    logger.log(
        `📚 API Documentation available at: http://${host}:${port}/api/docs`,
    );
    logger.log(
        `🌍 Environment: ${configService.get('NODE_ENV') || 'development'}`,
    );
    logger.log(`🔒 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
