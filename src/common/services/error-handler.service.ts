import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorContext {
    requestId?: string;
    userId?: string;
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    body?: any;
    query?: any;
    params?: any;
    stack?: string;
    timestamp?: string;
}

@Injectable()
export class ErrorHandlerService {
    private readonly logger = new Logger(ErrorHandlerService.name);

    handleError(error: Error, req: Request, res: Response): void {
        const context = this.buildErrorContext(error, req);

        // Log the error
        this.logError(error, context);

        // Send appropriate response
        this.sendErrorResponse(error, res, context);
    }

    private buildErrorContext(error: Error, req: Request): ErrorContext {
        return {
            requestId: (req as any).requestId,
            userId: (req as any).user?.id,
            method: req.method,
            url: req.url,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress,
            body: req.body,
            query: req.query,
            params: req.params,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        };
    }

    private logError(error: Error, context: ErrorContext): void {
        const logData = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            context,
        };

        if (this.isClientError(error)) {
            this.logger.warn(`Client error: ${error.message}`, logData);
        } else {
            this.logger.error(`Server error: ${error.message}`, logData);
        }
    }

    private sendErrorResponse(
        error: Error,
        res: Response,
        context: ErrorContext,
    ): void {
        if (res.headersSent) {
            return;
        }

        const statusCode = this.getStatusCode(error);
        const message = this.getErrorMessage(error, statusCode);

        const errorResponse = {
            message,
            statusCode,
            timestamp: context.timestamp,
            path: context.url,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                context,
            }),
        };

        res.status(statusCode).json(errorResponse);
    }

    private isClientError(error: Error): boolean {
        const clientErrorNames = [
            'BadRequestException',
            'UnauthorizedException',
            'ForbiddenException',
            'NotFoundException',
            'ConflictException',
            'UnprocessableEntityException',
        ];

        return clientErrorNames.some((name) => error.name === name);
    }

    private getStatusCode(error: Error): number {
        const statusMap: Record<string, number> = {
            BadRequestException: 400,
            UnauthorizedException: 401,
            ForbiddenException: 403,
            NotFoundException: 404,
            ConflictException: 409,
            UnprocessableEntityException: 422,
            InternalServerErrorException: 500,
            NotImplementedException: 501,
            BadGatewayException: 502,
            ServiceUnavailableException: 503,
            GatewayTimeoutException: 504,
        };

        return statusMap[error.name] || 500;
    }

    private getErrorMessage(error: Error, statusCode: number): string {
        if (statusCode >= 500) {
            return 'Internal server error';
        }

        return error.message || 'An error occurred';
    }
}
