import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized error handling service
 * Provides consistent error handling across the application
 */
@Injectable()
export class ErrorHandlerService {
    private readonly logger = new Logger(ErrorHandlerService.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * Handle application errors with proper logging and context
     */
    handleError(
        error: Error,
        context?: string,
        metadata?: Record<string, any>,
    ): void {
        const errorContext = {
            message: error.message,
            stack: error.stack,
            context: context || 'Unknown',
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
            environment: this.configService.get('NODE_ENV', 'development'),
        };

        // Log error based on severity
        if (this.isCriticalError(error)) {
            this.logger.error(
                'Critical error occurred',
                errorContext.message,
                errorContext,
            );
        } else if (this.isWarningError(error)) {
            this.logger.warn(
                'Warning error occurred',
                errorContext.message,
                errorContext,
            );
        } else {
            this.logger.error(
                'Error occurred',
                errorContext.message,
                errorContext,
            );
        }

        // In production, you might want to send errors to external monitoring
        if (this.configService.get('NODE_ENV') === 'production') {
            this.sendToMonitoring(errorContext);
        }
    }

    /**
     * Handle database errors specifically
     */
    handleDatabaseError(error: any, operation: string, entity?: string): void {
        const context = `Database operation failed: ${operation}`;
        const metadata = {
            operation,
            entity: entity || 'Unknown',
            errorCode: error.code,
            constraint: error.constraint,
            detail: error.detail,
        };

        this.handleError(error, context, metadata);
    }

    /**
     * Handle authentication errors
     */
    handleAuthenticationError(
        error: any,
        userId?: string,
        provider?: string,
    ): void {
        const context = 'Authentication failed';
        const metadata = {
            userId: userId || 'Unknown',
            provider: provider || 'Unknown',
            errorType: 'Authentication',
        };

        this.handleError(error, context, metadata);
    }

    /**
     * Handle external service errors
     */
    handleExternalServiceError(
        error: any,
        service: string,
        operation: string,
    ): void {
        const context = `External service error: ${service}`;
        const metadata = {
            service,
            operation,
            errorType: 'External Service',
        };

        this.handleError(error, context, metadata);
    }

    /**
     * Handle validation errors
     */
    handleValidationError(error: any, field?: string, value?: any): void {
        const context = 'Validation failed';
        const metadata = {
            field: field || 'Unknown',
            value: value || 'Unknown',
            errorType: 'Validation',
        };

        this.handleError(error, context, metadata);
    }

    /**
     * Check if error is critical
     */
    private isCriticalError(error: Error): boolean {
        const criticalPatterns = [
            'database connection',
            'authentication failure',
            'security violation',
            'data corruption',
            'system failure',
        ];

        return criticalPatterns.some((pattern) =>
            error.message.toLowerCase().includes(pattern),
        );
    }

    /**
     * Check if error is a warning
     */
    private isWarningError(error: Error): boolean {
        const warningPatterns = [
            'deprecated',
            'timeout',
            'rate limit',
            'temporary',
        ];

        return warningPatterns.some((pattern) =>
            error.message.toLowerCase().includes(pattern),
        );
    }

    /**
     * Send error to external monitoring (placeholder)
     */
    private sendToMonitoring(errorContext: any): void {
        // In a real implementation, you would send to services like:
        // - Sentry
        // - DataDog
        // - New Relic
        // - Custom monitoring endpoint

        this.logger.debug('Error sent to monitoring service', errorContext);
    }

    /**
     * Create user-friendly error message
     */
    createUserFriendlyMessage(error: Error): string {
        // Map technical errors to user-friendly messages
        const errorMappings: Record<string, string> = {
            ECONNREFUSED:
                'Service temporarily unavailable. Please try again later.',
            ETIMEDOUT: 'Request timed out. Please try again.',
            ENOTFOUND: 'Service not found. Please contact support.',
            EACCES: 'Access denied. Please check your permissions.',
            ENOSPC: 'Insufficient storage. Please contact support.',
            EMFILE: 'Too many open files. Please try again later.',
            ENOMEM: 'Insufficient memory. Please try again later.',
        };

        const errorCode = (error as any).code;
        if (errorCode && errorMappings[errorCode]) {
            return errorMappings[errorCode];
        }

        // Default user-friendly message
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }

    /**
     * Get error severity level
     */
    getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
        if (this.isCriticalError(error)) {
            return 'critical';
        }

        if (
            error.message.includes('timeout') ||
            error.message.includes('rate limit')
        ) {
            return 'medium';
        }

        if (
            error.message.includes('validation') ||
            error.message.includes('format')
        ) {
            return 'low';
        }

        return 'high';
    }
}
