import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string | string[];
    error?: string;
    details?: any;
    requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId =
            (request.headers['x-request-id'] as string) ||
            this.generateRequestId();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        let details: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse as any;
                message = responseObj.message || responseObj.error || message;
                error = responseObj.error || error;
                details = responseObj.details || responseObj.errors;
            }
        } else if (exception instanceof QueryFailedError) {
            status = HttpStatus.BAD_REQUEST;
            message = this.handleDatabaseError(exception);
            error = 'Database Error';
            details = {
                code: exception.driverError?.code,
                constraint: exception.driverError?.constraint,
                table: (exception.driverError as any)?.table,
                column: (exception.driverError as any)?.column,
            };
        } else if (exception instanceof Error) {
            message = exception.message;
            error = exception.constructor.name;
        }

        const errorResponse: ErrorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            error,
            details,
            requestId,
        };

        // Log the error
        this.logError(exception, request, errorResponse);

        // Send response
        response.status(status).json(errorResponse);
    }

    private handleDatabaseError(exception: QueryFailedError): string {
        const { code, constraint, detail } =
            (exception.driverError as any) || {};

        switch (code) {
            case '23505': // Unique violation
                if (constraint?.includes('email')) {
                    return 'Email address is already registered';
                }
                if (constraint?.includes('phone')) {
                    return 'Phone number is already registered';
                }
                if (constraint?.includes('address')) {
                    return 'Wallet address is already in use';
                }
                return 'A record with this information already exists';

            case '23503': // Foreign key violation
                return 'Referenced record does not exist';

            case '23502': // Not null violation
                return 'Required field is missing';

            case '23514': // Check violation
                return 'Data validation failed';

            case '42P01': // Undefined table
                return 'Database table not found';

            case '42703': // Undefined column
                return 'Database column not found';

            default:
                return detail || 'Database operation failed';
        }
    }

    private logError(
        exception: unknown,
        request: Request,
        errorResponse: ErrorResponse,
    ): void {
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || 'Unknown';
        const userId = (request as any).user?.id || 'Anonymous';

        const logContext = {
            requestId: errorResponse.requestId,
            userId,
            method,
            url,
            ip,
            userAgent,
            statusCode: errorResponse.statusCode,
            error: errorResponse.error,
            message: errorResponse.message,
        };

        if (errorResponse.statusCode >= 500) {
            this.logger.error(
                `Server Error: ${errorResponse.error} - ${errorResponse.message}`,
                exception instanceof Error ? exception.stack : undefined,
                logContext,
            );
        } else if (errorResponse.statusCode >= 400) {
            this.logger.warn(
                `Client Error: ${errorResponse.error} - ${errorResponse.message}`,
                logContext,
            );
        } else {
            this.logger.log(
                `Request processed: ${method} ${url} - ${errorResponse.statusCode}`,
                logContext,
            );
        }
    }

    private generateRequestId(): string {
        return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }
}

// Specific filters for different types of errors
@Catch(HttpException)
export class HttpExceptionFilterOnly implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilterOnly.name);

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let message = 'An error occurred';
        let error = 'Bad Request';

        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (typeof exceptionResponse === 'object') {
            const responseObj = exceptionResponse as any;
            message = responseObj.message || responseObj.error || message;
            error = responseObj.error || error;
        }

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            error,
        };

        this.logger.warn(`HTTP Exception: ${error} - ${message}`, {
            method: request.method,
            url: request.url,
            statusCode: status,
        });

        response.status(status).json(errorResponse);
    }
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DatabaseExceptionFilter.name);

    catch(exception: QueryFailedError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { code, constraint, detail } =
            (exception.driverError as any) || {};

        let status = HttpStatus.BAD_REQUEST;
        let message = 'Database operation failed';

        switch (code) {
            case '23505': // Unique violation
                status = HttpStatus.CONFLICT;
                message = 'A record with this information already exists';
                break;
            case '23503': // Foreign key violation
                status = HttpStatus.BAD_REQUEST;
                message = 'Referenced record does not exist';
                break;
            case '23502': // Not null violation
                status = HttpStatus.BAD_REQUEST;
                message = 'Required field is missing';
                break;
            default:
                message = detail || 'Database operation failed';
        }

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            error: 'Database Error',
            details: {
                code,
                constraint,
                table: (exception.driverError as any)?.table,
                column: (exception.driverError as any)?.column,
            },
        };

        this.logger.error(`Database Error: ${code} - ${message}`, {
            method: request.method,
            url: request.url,
            code,
            constraint,
            table: (exception.driverError as any)?.table,
            column: (exception.driverError as any)?.column,
        });

        response.status(status).json(errorResponse);
    }
}
