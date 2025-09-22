import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface AuditLogEntry {
    timestamp: Date;
    userId?: string;
    userEmail?: string;
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    requestBody?: any;
    responseStatus: number;
    responseTime: number;
    error?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const startTime = Date.now();

        const auditEntry: Partial<AuditLogEntry> = {
            timestamp: new Date(),
            method: request.method,
            url: request.url,
            ip: this.getClientIp(request),
            userAgent: request.get('User-Agent') || 'Unknown',
            requestBody: this.sanitizeRequestBody(request.body),
        };

        // Extract user information if available
        const user = (request as any).user;
        if (user) {
            auditEntry.userId = user.id;
            auditEntry.userEmail = user.email;
        }

        // Determine action and resource from the request
        const { action, resource, resourceId } =
            this.extractActionAndResource(request);
        auditEntry.action = action;
        auditEntry.resource = resource;
        auditEntry.resourceId = resourceId;

        return next.handle().pipe(
            tap((_data) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                const completeAuditEntry: AuditLogEntry = {
                    ...auditEntry,
                    responseStatus: response.statusCode,
                    responseTime,
                } as AuditLogEntry;

                this.logAuditEntry(completeAuditEntry);
            }),
            catchError((error) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                const completeAuditEntry: AuditLogEntry = {
                    ...auditEntry,
                    responseStatus: error.status || 500,
                    responseTime,
                    error: error.message,
                } as AuditLogEntry;

                this.logAuditEntry(completeAuditEntry);
                throw error;
            }),
        );
    }

    private getClientIp(request: Request): string {
        return (
            request.ip ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            (request.connection as any)?.socket?.remoteAddress ||
            'unknown'
        );
    }

    private sanitizeRequestBody(body: any): any {
        if (!body) return body;

        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'key',
            'privateKey',
        ];
        const sanitized = { ...body };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    private extractActionAndResource(request: Request): {
        action: string;
        resource: string;
        resourceId?: string;
    } {
        const method = request.method.toLowerCase();
        const url = request.url;
        const segments = url.split('/').filter((segment) => segment);

        let action = method;
        let resource = 'unknown';
        let resourceId: string | undefined;

        // Map HTTP methods to actions
        const actionMap: { [key: string]: string } = {
            get: 'read',
            post: 'create',
            put: 'update',
            patch: 'update',
            delete: 'delete',
        };

        action = actionMap[method] || method;

        // Extract resource from URL
        if (segments.length > 0) {
            resource = segments[0];

            // Extract resource ID if present
            if (segments.length > 1 && this.isUUID(segments[1])) {
                resourceId = segments[1];
            }
        }

        // Special handling for specific endpoints
        if (url.includes('/auth/login')) {
            action = 'login';
            resource = 'auth';
        } else if (url.includes('/auth/logout')) {
            action = 'logout';
            resource = 'auth';
        } else if (url.includes('/auth/signup')) {
            action = 'register';
            resource = 'auth';
        } else if (url.includes('/wallet/connect')) {
            action = 'connect_wallet';
            resource = 'wallet';
        } else if (url.includes('/transactions') && method === 'post') {
            action = 'send_money';
            resource = 'transaction';
        } else if (url.includes('/onramp/initiate')) {
            action = 'initiate_onramp';
            resource = 'onramp';
        } else if (url.includes('/offramp/initiate')) {
            action = 'initiate_offramp';
            resource = 'offramp';
        }

        return { action, resource, resourceId };
    }

    private isUUID(str: string): boolean {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    protected logAuditEntry(entry: AuditLogEntry): void {
        const logMessage = this.formatAuditLog(entry);

        // Log based on response status
        if (entry.responseStatus >= 400) {
            this.logger.error(logMessage);
        } else {
            this.logger.log(logMessage);
        }

        // In a production environment, you would also store this in a database
        // or send it to a logging service like ELK stack, Splunk, etc.
        this.storeAuditLog(entry);
    }

    protected formatAuditLog(entry: AuditLogEntry): string {
        const userInfo = entry.userId
            ? `[User: ${entry.userId} (${entry.userEmail})]`
            : '[Anonymous]';
        const actionInfo = entry.action ? `[Action: ${entry.action}]` : '';
        const resourceInfo = entry.resource
            ? `[Resource: ${entry.resource}]`
            : '';
        const resourceIdInfo = entry.resourceId
            ? `[ID: ${entry.resourceId}]`
            : '';
        const statusInfo = `[Status: ${entry.responseStatus}]`;
        const timeInfo = `[Time: ${entry.responseTime}ms]`;
        const errorInfo = entry.error ? `[Error: ${entry.error}]` : '';

        return `${userInfo} ${actionInfo} ${resourceInfo} ${resourceIdInfo} ${statusInfo} ${timeInfo} ${errorInfo}`.trim();
    }

    private storeAuditLog(entry: AuditLogEntry): void {
        // In a production environment, you would implement actual storage
        // For now, we'll just log to console
        console.log('AUDIT LOG:', JSON.stringify(entry, null, 2));
    }
}

// Specific interceptor for financial operations
@Injectable()
export class FinancialAuditInterceptor extends AuditLoggingInterceptor {
    private readonly financialLogger = new Logger('FinancialAudit');

    protected logAuditEntry(entry: AuditLogEntry): void {
        // Enhanced logging for financial operations
        const financialOperations = [
            'send_money',
            'initiate_onramp',
            'initiate_offramp',
            'create',
            'update',
            'delete',
        ];

        if (financialOperations.includes(entry.action || '')) {
            this.financialLogger.warn(
                `FINANCIAL OPERATION: ${this.formatAuditLog(entry)}`,
            );
        }

        super.logAuditEntry(entry);
    }
}
