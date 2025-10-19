import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export interface DatabasePoolConfig {
    max: number;
    min: number;
    idle: number;
    acquire: number;
    evict: number;
    handleDisconnects: boolean;
    validate: boolean;
    testOnBorrow: boolean;
    testWhileIdle: boolean;
    timeBetweenEvictionRunsMillis: number;
    minEvictableIdleTimeMillis: number;
    maxReconnectTries: number;
    reconnectInterval: number;
}

export const getDatabasePoolConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    const isDevelopment = configService.get('NODE_ENV') === 'development';
    const isTest = configService.get('NODE_ENV') === 'test';

    // Base configuration
    const baseConfig: TypeOrmModuleOptions = {
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'rampa_cash'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        synchronize: false,
        logging: isDevelopment ? ['query', 'error'] : ['error'],
        ssl: isProduction ? { rejectUnauthorized: false } : false,
    };

    // Connection pool configuration based on environment
    if (isProduction) {
        // Production configuration - optimized for high load
        return {
            ...baseConfig,
            extra: {
                max: 20, // Maximum number of connections
                min: 5, // Minimum number of connections
                idle: 10000, // Idle timeout in milliseconds
                acquire: 30000, // Maximum time to acquire connection
                evict: 1000, // Time between eviction runs
                handleDisconnects: true, // Handle disconnections gracefully
                validate: true, // Validate connections before use
                testOnBorrow: true, // Test connections when borrowed
                testWhileIdle: true, // Test connections while idle
                timeBetweenEvictionRunsMillis: 1000,
                minEvictableIdleTimeMillis: 300000, // 5 minutes
                maxReconnectTries: 3, // Maximum reconnection attempts
                reconnectInterval: 2000, // Reconnection interval
                // PostgreSQL specific options
                statement_timeout: 30000, // 30 seconds
                query_timeout: 30000, // 30 seconds
                connectionTimeoutMillis: 30000,
                idleTimeoutMillis: 300000, // 5 minutes
                // Connection pool monitoring
                pool: {
                    max: 20,
                    min: 5,
                    acquireTimeoutMillis: 30000,
                    createTimeoutMillis: 30000,
                    destroyTimeoutMillis: 5000,
                    idleTimeoutMillis: 300000,
                    reapIntervalMillis: 1000,
                    createRetryIntervalMillis: 200,
                },
            },
        };
    } else if (isDevelopment) {
        // Development configuration - balanced for development
        return {
            ...baseConfig,
            extra: {
                max: 10, // Maximum number of connections
                min: 2, // Minimum number of connections
                idle: 10000, // Idle timeout in milliseconds
                acquire: 30000, // Maximum time to acquire connection
                evict: 1000, // Time between eviction runs
                handleDisconnects: true, // Handle disconnections gracefully
                validate: true, // Validate connections before use
                testOnBorrow: false, // Don't test on borrow in development
                testWhileIdle: true, // Test connections while idle
                timeBetweenEvictionRunsMillis: 1000,
                minEvictableIdleTimeMillis: 300000, // 5 minutes
                maxReconnectTries: 3, // Maximum reconnection attempts
                reconnectInterval: 2000, // Reconnection interval
                // PostgreSQL specific options
                statement_timeout: 60000, // 60 seconds
                query_timeout: 60000, // 60 seconds
                connectionTimeoutMillis: 30000,
                idleTimeoutMillis: 300000, // 5 minutes
                // Connection pool monitoring
                pool: {
                    max: 10,
                    min: 2,
                    acquireTimeoutMillis: 30000,
                    createTimeoutMillis: 30000,
                    destroyTimeoutMillis: 5000,
                    idleTimeoutMillis: 300000,
                    reapIntervalMillis: 1000,
                    createRetryIntervalMillis: 200,
                },
            },
        };
    } else if (isTest) {
        // Test configuration - minimal for testing
        return {
            ...baseConfig,
            extra: {
                max: 5, // Maximum number of connections
                min: 1, // Minimum number of connections
                idle: 10000, // Idle timeout in milliseconds
                acquire: 30000, // Maximum time to acquire connection
                evict: 1000, // Time between eviction runs
                handleDisconnects: true, // Handle disconnections gracefully
                validate: true, // Validate connections before use
                testOnBorrow: false, // Don't test on borrow in tests
                testWhileIdle: false, // Don't test while idle in tests
                timeBetweenEvictionRunsMillis: 1000,
                minEvictableIdleTimeMillis: 300000, // 5 minutes
                maxReconnectTries: 1, // Single reconnection attempt
                reconnectInterval: 1000, // Quick reconnection
                // PostgreSQL specific options
                statement_timeout: 10000, // 10 seconds
                query_timeout: 10000, // 10 seconds
                connectionTimeoutMillis: 10000,
                idleTimeoutMillis: 300000, // 5 minutes
                // Connection pool monitoring
                pool: {
                    max: 5,
                    min: 1,
                    acquireTimeoutMillis: 10000,
                    createTimeoutMillis: 10000,
                    destroyTimeoutMillis: 5000,
                    idleTimeoutMillis: 300000,
                    reapIntervalMillis: 1000,
                    createRetryIntervalMillis: 200,
                },
            },
        };
    }

    // Default configuration
    return {
        ...baseConfig,
        extra: {
            max: 10,
            min: 2,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: false,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
    };
};

export const getDatabasePoolConfigForService = (
    serviceName: string,
    configService: ConfigService,
): DatabasePoolConfig => {
    const isProduction = configService.get('NODE_ENV') === 'production';

    // Service-specific pool configurations
    const serviceConfigs: Record<string, DatabasePoolConfig> = {
        // High-traffic services
        'wallet-service': {
            max: isProduction ? 25 : 15,
            min: isProduction ? 8 : 5,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: isProduction,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
        'transaction-service': {
            max: isProduction ? 20 : 12,
            min: isProduction ? 6 : 4,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: isProduction,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
        'balance-service': {
            max: isProduction ? 15 : 10,
            min: isProduction ? 5 : 3,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: isProduction,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
        // Low-traffic services
        'user-service': {
            max: isProduction ? 10 : 8,
            min: isProduction ? 3 : 2,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: false,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
        'contact-service': {
            max: isProduction ? 8 : 6,
            min: isProduction ? 2 : 1,
            idle: 10000,
            acquire: 30000,
            evict: 1000,
            handleDisconnects: true,
            validate: true,
            testOnBorrow: false,
            testWhileIdle: true,
            timeBetweenEvictionRunsMillis: 1000,
            minEvictableIdleTimeMillis: 300000,
            maxReconnectTries: 3,
            reconnectInterval: 2000,
        },
    };

    return serviceConfigs[serviceName] || serviceConfigs['user-service'];
};

export const getDatabaseHealthCheckConfig = (): {
    timeout: number;
    interval: number;
    retries: number;
    retryDelay: number;
} => {
    return {
        timeout: 5000, // 5 seconds
        interval: 30000, // 30 seconds
        retries: 3, // 3 retries
        retryDelay: 1000, // 1 second delay between retries
    };
};

export const getDatabaseMonitoringConfig = (): {
    enabled: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
    connectionPoolMetrics: boolean;
    queryMetrics: boolean;
} => {
    return {
        enabled: true,
        metricsInterval: 60000, // 1 minute
        slowQueryThreshold: 1000, // 1 second
        connectionPoolMetrics: true,
        queryMetrics: true,
    };
};
