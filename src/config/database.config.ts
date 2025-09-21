import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';

    return {
        type: 'postgres' as const,
        host: configService.get('POSTGRES_HOST'),
        port: parseInt(configService.get('POSTGRES_PORT') || '5432'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB') || configService.get('POSTGRES_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: !isProduction,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        extra: {
            // Force IPv4 connections
            family: 4,
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
        database: process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE || 'rampa_cash_dev',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*.ts'],
        synchronize: false, // Always false for migrations
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        extra: {
            // Force IPv4 connections
            family: 4,
        },
    };
};
