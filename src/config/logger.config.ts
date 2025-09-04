import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

export const getLoggerConfig = (configService: ConfigService) => {
    const logLevel = configService.get('LOG_LEVEL') || 'info';
    const nodeEnv = configService.get('NODE_ENV') || 'development';

    const transports: winston.transport[] = [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ];

    // Add file transport in production
    if (nodeEnv === 'production') {
        transports.push(
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                ),
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                ),
            }),
        );
    }

    return {
        level: logLevel,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
        ),
        transports,
    };
};
