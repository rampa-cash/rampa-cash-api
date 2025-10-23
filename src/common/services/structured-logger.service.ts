import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

/**
 * Structured logging service
 * Provides structured logging with consistent format across the application
 */
@Injectable()
export class StructuredLoggerService implements LoggerService {
    private readonly logger: winston.Logger;

    constructor(private readonly configService: ConfigService) {
        this.logger = this.createWinstonLogger();
    }

    /**
     * Log a message with structured data
     */
    log(message: string, context?: string, metadata?: Record<string, any>): void {
        this.logger.info(message, {
            context: context || 'Application',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log an error with structured data
     */
    error(message: string, trace?: string, context?: string, metadata?: Record<string, any>): void {
        this.logger.error(message, {
            context: context || 'Application',
            trace: trace || '',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log a warning with structured data
     */
    warn(message: string, context?: string, metadata?: Record<string, any>): void {
        this.logger.warn(message, {
            context: context || 'Application',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log debug information with structured data
     */
    debug(message: string, context?: string, metadata?: Record<string, any>): void {
        this.logger.debug(message, {
            context: context || 'Application',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log verbose information with structured data
     */
    verbose(message: string, context?: string, metadata?: Record<string, any>): void {
        this.logger.verbose(message, {
            context: context || 'Application',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log business events with structured data
     */
    logBusinessEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
        this.logger.info(`Business Event: ${event}`, {
            context: 'BusinessEvent',
            event,
            userId: userId || 'system',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log security events with structured data
     */
    logSecurityEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
        this.logger.warn(`Security Event: ${event}`, {
            context: 'SecurityEvent',
            event,
            userId: userId || 'system',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log performance metrics with structured data
     */
    logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
        this.logger.info(`Performance: ${operation}`, {
            context: 'Performance',
            operation,
            duration,
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log API requests with structured data
     */
    logApiRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
        this.logger.info(`API Request: ${method} ${url}`, {
            context: 'ApiRequest',
            method,
            url,
            statusCode,
            duration,
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Log database operations with structured data
     */
    logDatabaseOperation(operation: string, entity: string, duration: number, metadata?: Record<string, any>): void {
        this.logger.debug(`Database Operation: ${operation}`, {
            context: 'Database',
            operation,
            entity,
            duration,
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Create Winston logger instance
     */
    private createWinstonLogger(): winston.Logger {
        const logLevel = this.configService.get('LOG_LEVEL', 'info');
        const nodeEnv = this.configService.get('NODE_ENV', 'development');

        const transports: winston.transport[] = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, context, metadata, ...rest }) => {
                        const logData = {
                            timestamp,
                            level,
                            message,
                            context: context || 'Application',
                            metadata: metadata || {},
                            ...rest,
                        };
                        return JSON.stringify(logData);
                    }),
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

        return winston.createLogger({
            level: logLevel,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
            ),
            transports,
        });
    }
}
