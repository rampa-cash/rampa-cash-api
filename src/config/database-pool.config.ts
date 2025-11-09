import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabasePoolConfig = (
    configService: ConfigService,
): Partial<TypeOrmModuleOptions> => {
    const poolConfig = {
        // Connection pool settings
        max: configService.get<number>('DB_POOL_MAX') || 20, // Maximum number of connections
        min: configService.get<number>('DB_POOL_MIN') || 5, // Minimum number of connections
        idle: configService.get<number>('DB_POOL_IDLE') || 10000, // Idle timeout in ms
        acquire: configService.get<number>('DB_POOL_ACQUIRE') || 30000, // Acquire timeout in ms
        evict: configService.get<number>('DB_POOL_EVICT') || 1000, // Eviction check interval in ms
        handleDisconnects:
            configService.get<boolean>('DB_POOL_HANDLE_DISCONNECTS') ?? true,
    };

    return {
        // Connection pool configuration
        extra: {
            // PostgreSQL specific pool settings
            max: poolConfig.max,
            min: poolConfig.min,
            idle: poolConfig.idle,
            acquire: poolConfig.acquire,
            evict: poolConfig.evict,
            handleDisconnects: poolConfig.handleDisconnects,

            // Connection validation
            validateOnBorrow: true,
            testOnBorrow: true,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: poolConfig.evict,

            // Connection lifecycle
            maxReconnects: 3,
            reconnectInterval: 2000,

            // Query timeout
            statement_timeout:
                configService.get<number>('DB_STATEMENT_TIMEOUT') || 30000,
            query_timeout:
                configService.get<number>('DB_QUERY_TIMEOUT') || 30000,

            // SSL configuration
            ssl: configService.get<boolean>('DB_SSL')
                ? {
                      rejectUnauthorized:
                          configService.get<boolean>(
                              'DB_SSL_REJECT_UNAUTHORIZED',
                          ) ?? true,
                      ca: configService.get<string>('DB_SSL_CA'),
                      cert: configService.get<string>('DB_SSL_CERT'),
                      key: configService.get<string>('DB_SSL_KEY'),
                  }
                : false,

            // Application name for monitoring
            application_name:
                configService.get<string>('DB_APPLICATION_NAME') ||
                'rampa-cash-api',

            // Connection string parameters
            ...(configService.get<string>('DB_EXTRA_PARAMS') && {
                ...JSON.parse(
                    configService.get<string>('DB_EXTRA_PARAMS') || '{}',
                ),
            }),
        },

        // Connection options
        connectTimeoutMS:
            configService.get<number>('DB_CONNECT_TIMEOUT') || 30000,
        socketTimeoutMS:
            configService.get<number>('DB_SOCKET_TIMEOUT') || 30000,

        // Logging
        logging: configService.get<boolean>('DB_LOGGING')
            ? ['query', 'error', 'schema', 'warn', 'info', 'log']
            : false,
        logger:
            (configService.get<string>('DB_LOGGER') as any) ||
            'advanced-console',

        // Synchronization (only for development)
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE') ?? false,
        migrationsRun: configService.get<boolean>('DB_MIGRATIONS_RUN') ?? true,

        // Cache configuration
        cache: configService.get<boolean>('DB_CACHE_ENABLED')
            ? {
                  type: 'redis',
                  options: {
                      host:
                          configService.get<string>('REDIS_HOST') ||
                          'localhost',
                      port: configService.get<number>('REDIS_PORT') || 6379,
                      password: configService.get<string>('REDIS_PASSWORD'),
                      db: configService.get<number>('REDIS_DB') || 0,
                  },
                  duration:
                      configService.get<number>('DB_CACHE_DURATION') || 30000,
              }
            : false,

        // Performance monitoring
        ...(configService.get<boolean>('DB_MONITORING_ENABLED') && {
            subscribers: [
                // Add custom subscribers for monitoring
            ],
        }),
    };
};

export const getDatabaseHealthCheckConfig = (configService: ConfigService) => {
    return {
        // Health check specific configuration
        max: 5, // Smaller pool for health checks
        min: 1,
        idle: 5000,
        acquire: 10000,
        evict: 1000,
        handleDisconnects: true,
        validateOnBorrow: true,
        testOnBorrow: true,
        testWhileIdle: true,
        timeBetweenEvictionRunsMillis: 1000,
    };
};

export const getDatabaseMigrationConfig = (configService: ConfigService) => {
    return {
        // Migration specific configuration
        max: 1, // Single connection for migrations
        min: 1,
        idle: 10000,
        acquire: 60000, // Longer timeout for migrations
        evict: 5000,
        handleDisconnects: true,
        validateOnBorrow: false, // Skip validation for migrations
        testOnBorrow: false,
        testWhileIdle: false,
    };
};
