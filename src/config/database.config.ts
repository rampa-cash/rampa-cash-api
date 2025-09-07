import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    const host = configService.get('POSTGRES_HOST');

    // For Supabase, use the pooler URL which supports IPv4
    const supabaseHost = host?.includes('supabase.co')
        ? 'aws-0-us-east-1.pooler.supabase.com'
        : host;

    return {
        type: 'postgres' as const,
        host: supabaseHost,
        port: parseInt(configService.get('POSTGRES_PORT') || '6543'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB') || configService.get('POSTGRES_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: !isProduction,
        logging: !isProduction,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        extra: {
            // Force IPv4 connections
            family: 4,
        },
    };
};

export const getMigrationConfig = () => {
    const host = process.env.POSTGRES_HOST || 'localhost';

    // For Supabase, use the pooler URL which supports IPv4
    const supabaseHost = host?.includes('supabase.co')
        ? 'aws-0-us-east-1.pooler.supabase.com'
        : host;

    return {
        type: 'postgres' as const,
        host: supabaseHost,
        port: parseInt(process.env.POSTGRES_PORT || '6543'),
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
