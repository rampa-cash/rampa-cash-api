import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLoggingInterceptor } from './domain/interceptors/audit-logging.interceptor';
import { RateLimitMiddleware } from './domain/middleware/rate-limit.middleware';
import helmet from 'helmet';
import compression from 'compression';

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
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));

    // Compression middleware
    app.use(compression());

    // CORS configuration
    const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3000'];
    app.enableCors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            logger.warn(`CORS blocked request from origin: ${origin}`);
            return callback(new Error('Not allowed by CORS'), false);
        },
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
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }));

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

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
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // Add request ID for tracking
        if (!req.headers['x-request-id']) {
            req.headers['x-request-id'] = Math.random().toString(36).substring(2, 15);
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
    process.on('SIGTERM', async () => {
        logger.log('SIGTERM received, shutting down gracefully');
        await app.close();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.log('SIGINT received, shutting down gracefully');
        await app.close();
        process.exit(0);
    });

    const port = configService.get<number>('PORT') || 3001;
    const host = configService.get<string>('HOST') || '0.0.0.0';

    await app.listen(port, host);

    logger.log(`🚀 Application is running on: http://${host}:${port}`);
    logger.log(`📊 Health check available at: http://${host}:${port}/health`);
    logger.log(`🌍 Environment: ${configService.get('NODE_ENV') || 'development'}`);
    logger.log(`🔒 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
