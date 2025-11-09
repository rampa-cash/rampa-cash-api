import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ErrorHandlerService } from '../services/error-handler.service';
import { StructuredLoggerService } from '../services/structured-logger.service';

@Injectable()
export class ErrorHandlingMiddleware implements NestMiddleware {
    private readonly logger = new Logger(ErrorHandlingMiddleware.name);

    constructor(
        private readonly errorHandler: ErrorHandlerService,
        private readonly structuredLogger: StructuredLoggerService,
    ) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        // Add request ID to request object
        (req as any).requestId = requestId;

        // Override response methods to capture response data
        const originalSend = res.send.bind(res);
        const originalJson = res.json.bind(res);
        const originalEnd = res.end.bind(res);

        let responseBody: any;
        let responseSize = 0;

        res.send = function (body: any) {
            responseBody = body;
            responseSize = Buffer.byteLength(body || '', 'utf8');
            return originalSend.call(this, body);
        };

        res.json = function (body: any) {
            responseBody = body;
            responseSize = Buffer.byteLength(
                JSON.stringify(body || {}),
                'utf8',
            );
            return originalJson.call(this, body);
        };

        res.end = function (chunk?: any, encoding?: any) {
            if (chunk) {
                responseBody = chunk;
                responseSize = Buffer.byteLength(chunk, 'utf8');
            }
            return originalEnd.call(this, chunk, encoding);
        };

        // Handle response finish
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const statusCode = res.statusCode;

            // Log request/response
            this.logRequestResponse(
                req,
                res,
                duration,
                responseSize,
                requestId,
            );

            // Handle errors
            if (statusCode >= 400) {
                this.handleError(req, res, statusCode, responseBody, requestId);
            }
        });

        // Handle response close (client disconnected)
        res.on('close', () => {
            if (!res.headersSent) {
                this.logger.warn(
                    `Client disconnected before response: ${req.method} ${req.url}`,
                );
            }
        });

        // Handle uncaught errors
        res.on('error', (error: Error) => {
            this.logger.error(`Response error: ${error.message}`, error.stack);
            this.errorHandler.handleError(error, req, res);
        });

        next();
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private logRequestResponse(
        req: Request,
        res: Response,
        duration: number,
        responseSize: number,
        requestId: string,
    ): void {
        const logData = {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            responseSize,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress,
            referer: req.get('referer'),
            timestamp: new Date().toISOString(),
        };

        // Log based on status code
        if (res.statusCode >= 500) {
            this.structuredLogger.error('Server error', undefined, logData);
        } else if (res.statusCode >= 400) {
            this.structuredLogger.warn('Client error', logData);
        } else {
            this.structuredLogger.info('Request completed', logData);
        }
    }

    private handleError(
        req: Request,
        res: Response,
        statusCode: number,
        responseBody: any,
        requestId: string,
    ): void {
        const errorData = {
            requestId,
            method: req.method,
            url: req.url,
            statusCode,
            responseBody,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
        };

        // Categorize error
        if (statusCode >= 500) {
            this.structuredLogger.error(
                'Server error occurred',
                undefined,
                errorData,
            );
        } else if (statusCode >= 400) {
            this.structuredLogger.warn('Client error occurred', errorData);
        }

        // Additional error handling based on status code
        switch (statusCode) {
            case 400:
                this.handleBadRequest(req, responseBody, requestId);
                break;
            case 401:
                this.handleUnauthorized(req, responseBody, requestId);
                break;
            case 403:
                this.handleForbidden(req, responseBody, requestId);
                break;
            case 404:
                this.handleNotFound(req, responseBody, requestId);
                break;
            case 429:
                this.handleRateLimit(req, responseBody, requestId);
                break;
            case 500:
                this.handleInternalError(req, responseBody, requestId);
                break;
            default:
                this.handleGenericError(
                    req,
                    statusCode,
                    responseBody,
                    requestId,
                );
        }
    }

    private handleBadRequest(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.warn('Bad request', {
            requestId,
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query,
            responseBody,
        });
    }

    private handleUnauthorized(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.warn('Unauthorized access attempt', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            responseBody,
        });
    }

    private handleForbidden(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.warn('Forbidden access attempt', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            responseBody,
        });
    }

    private handleNotFound(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.info('Resource not found', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            responseBody,
        });
    }

    private handleRateLimit(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.warn('Rate limit exceeded', {
            requestId,
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            responseBody,
        });
    }

    private handleInternalError(
        req: Request,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.error('Internal server error', undefined, {
            requestId,
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query,
            responseBody,
        });
    }

    private handleGenericError(
        req: Request,
        statusCode: number,
        responseBody: any,
        requestId: string,
    ): void {
        this.structuredLogger.warn('Generic error', {
            requestId,
            method: req.method,
            url: req.url,
            statusCode,
            responseBody,
        });
    }
}
