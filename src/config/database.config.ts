import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';

    return {
        type: 'postgres' as const,
        host: configService.get('POSTGRES_HOST'),
        port: parseInt(configService.get('POSTGRES_PORT') || '5432'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database:
            configService.get('POSTGRES_DB') ||
            configService.get('POSTGRES_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: !isProduction,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        // Connection pooling configuration
        extra: {
            // Force IPv4 connections
            family: 4,
            // Connection pool settings
            max: parseInt(configService.get('DB_POOL_MAX') || '20'), // Maximum number of connections
            min: parseInt(configService.get('DB_POOL_MIN') || '5'), // Minimum number of connections
            acquire: parseInt(configService.get('DB_POOL_ACQUIRE') || '30000'), // Maximum time to get connection (30s)
            idle: parseInt(configService.get('DB_POOL_IDLE') || '10000'), // Maximum idle time (10s)
            // Connection timeout settings
            connectionTimeoutMillis: parseInt(configService.get('DB_CONNECTION_TIMEOUT') || '5000'), // 5s
            query_timeout: parseInt(configService.get('DB_QUERY_TIMEOUT') || '30000'), // 30s
            // Performance settings
            statement_timeout: parseInt(configService.get('DB_STATEMENT_TIMEOUT') || '30000'), // 30s
            // Connection validation
            validate: true,
            // Retry settings
            retryAttempts: parseInt(configService.get('DB_RETRY_ATTEMPTS') || '3'),
            retryDelay: parseInt(configService.get('DB_RETRY_DELAY') || '1000'), // 1s
        },
    };
};

export const getMigrationConfig = () => {
    return {
        type: 'postgres' as const,
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        username: process.env.POSTGRES_USER || 'rampa_user',
        password: process.env.POSTGRES_PASSWORD || 'rampa_password',
        database:
            process.env.POSTGRES_DB ||
            process.env.POSTGRES_DATABASE ||
            'rampa_cash_dev',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*.ts'],
        synchronize: false, // Always false for migrations
        ssl:
            process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
        extra: {
            // Force IPv4 connections
            family: 4,
            // Migration-specific connection pool settings (smaller pool for migrations)
            max: parseInt(process.env.DB_POOL_MAX || '5'), // Smaller pool for migrations
            min: parseInt(process.env.DB_POOL_MIN || '1'), // Minimum connections
            acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000'), // Longer timeout for migrations
            idle: parseInt(process.env.DB_POOL_IDLE || '10000'), // 10s idle time
            // Connection timeout settings
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10s for migrations
            query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'), // 60s for migrations
            // Performance settings
            statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'), // 60s for migrations
        },
    };
};
