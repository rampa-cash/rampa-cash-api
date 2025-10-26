import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as winston from 'winston';

export interface LogContext {
    requestId?: string;
    userId?: string;
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    duration?: number;
    statusCode?: number;
    responseSize?: number;
    [key: string]: any;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
    private readonly logger: winston.Logger;

    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            ),
            defaultMeta: {
                service: 'rampa-cash-api',
                environment: process.env.NODE_ENV || 'development',
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple(),
                    ),
                }),
            ],
        });

        // Add file transport in production
        if (process.env.NODE_ENV === 'production') {
            this.logger.add(
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                }),
            );
            this.logger.add(
                new winston.transports.File({
                    filename: 'logs/combined.log',
                }),
            );
        }
    }

    log(message: string, context?: LogContext): void {
        this.logger.info(message, context);
    }

    error(message: string, trace?: string, context?: LogContext): void {
        this.logger.error(message, { trace, ...context });
    }

    warn(message: string, context?: LogContext): void {
        this.logger.warn(message, context);
    }

    debug(message: string, context?: LogContext): void {
        this.logger.debug(message, context);
    }

    verbose(message: string, context?: LogContext): void {
        this.logger.verbose(message, context);
    }

    // Custom methods for structured logging
    info(message: string, context?: LogContext): void {
        this.logger.info(message, context);
    }

    // Request/Response logging
    logRequest(req: any, res: any, duration: number): void {
        const context: LogContext = {
            requestId: req.requestId,
            userId: req.user?.id,
            method: req.method,
            url: req.url,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress,
            duration,
            statusCode: res.statusCode,
            responseSize: res.get('content-length'),
        };

        if (res.statusCode >= 400) {
            this.warn('Request completed with error', context);
        } else {
            this.info('Request completed', context);
        }
    }

    // Error logging with context
    logError(error: Error, context?: LogContext): void {
        this.error(error.message, error.stack, {
            ...context,
            errorName: error.name,
        });
    }

    // Performance logging
    logPerformance(operation: string, duration: number, context?: LogContext): void {
        this.info(`Performance: ${operation}`, {
            ...context,
            operation,
            duration,
            performance: true,
        });
    }

    // Security logging
    logSecurity(event: string, context?: LogContext): void {
        this.warn(`Security: ${event}`, {
            ...context,
            security: true,
            event,
        });
    }

    // Business event logging
    logBusinessEvent(event: string, context?: LogContext): void {
        this.info(`Business: ${event}`, {
            ...context,
            business: true,
            event,
        });
    }
}