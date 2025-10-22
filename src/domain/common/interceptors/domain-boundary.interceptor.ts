import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { DomainAccessControlService } from '../services/domain-access-control.service';
import { DomainContextService } from '../services/domain-context.service';
import {
    DomainBoundaryConfig,
    DomainBoundaryContext,
    DOMAIN_BOUNDARY_KEY,
} from '../decorators/domain-boundary.decorator';

/**
 * Domain Boundary Interceptor
 *
 * @description Interceptor that automatically validates domain boundaries
 * for methods decorated with @DomainBoundary. This interceptor ensures
 * that domain operations follow proper access control rules.
 *
 * @example
 * ```typescript
 * // Apply to controller or method
 * @UseInterceptors(DomainBoundaryInterceptor)
 * @Controller('wallet')
 * export class WalletController {
 *   @DomainBoundary({
 *     domain: DomainType.WALLET,
 *     operation: OperationType.READ,
 *     requiresVerification: true
 *   })
 *   @Get('balance')
 *   async getBalance() {
 *     // Implementation
 *   }
 * }
 * ```
 */
@Injectable()
export class DomainBoundaryInterceptor implements NestInterceptor {
    private readonly logger = new Logger(DomainBoundaryInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly domainAccessControl: DomainAccessControlService,
        private readonly domainContext: DomainContextService,
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const requestId = request.id || this.generateRequestId();

        // Get domain boundary configuration
        const domainBoundaryConfig = this.reflector.get<DomainBoundaryConfig>(
            DOMAIN_BOUNDARY_KEY,
            context.getHandler(),
        );

        if (!domainBoundaryConfig) {
            // No domain boundary configuration, proceed normally
            return next.handle();
        }

        this.logger.debug(
            `Validating domain boundary for ${context.getClass().name}.${context.getHandler().name}`,
        );

        try {
            // Create domain boundary context
            const boundaryContext = this.createBoundaryContext(
                context,
                requestId,
                domainBoundaryConfig,
            );

            // Set domain context
            await this.setDomainContext(
                requestId,
                boundaryContext,
                domainBoundaryConfig,
            );

            // Validate domain boundary
            await this.domainAccessControl.validateAndThrow(
                boundaryContext,
                domainBoundaryConfig,
            );

            this.logger.debug(
                `Domain boundary validation passed for ${context.getClass().name}.${context.getHandler().name}`,
            );

            // Proceed with the request
            return next.handle().pipe(
                tap(() => {
                    this.logger.debug(
                        `Domain operation completed successfully: ${context.getClass().name}.${context.getHandler().name}`,
                    );
                }),
                catchError((error) => {
                    this.logger.error(
                        `Domain operation failed: ${context.getClass().name}.${context.getHandler().name}`,
                        error.stack,
                    );
                    throw error;
                }),
            );
        } catch (error) {
            this.logger.error(
                `Domain boundary validation failed for ${context.getClass().name}.${context.getHandler().name}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Creates domain boundary context from execution context
     * @param context - Execution context
     * @param requestId - Request identifier
     * @param config - Domain boundary configuration
     * @returns Domain boundary context
     */
    private createBoundaryContext(
        context: ExecutionContext,
        requestId: string,
        config: DomainBoundaryConfig,
    ): DomainBoundaryContext {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const className = context.getClass().name;

        // Extract user information from request
        const user = request.user
            ? {
                  id: request.user.id || request.user.sub,
                  isVerified: request.user.verificationStatus === 'verified',
                  isAdmin: request.user.isAdmin || false,
              }
            : undefined;

        return {
            currentDomain: config.domain,
            targetDomain: config.domain,
            operation: config.operation,
            user,
            method: {
                name: handler.name,
                className,
                parameters: request.body || {},
            },
            data: {
                requestId,
                timestamp: new Date(),
                ip: request.ip,
                userAgent: request.headers['user-agent'],
            },
        };
    }

    /**
     * Sets domain context for tracking
     * @param requestId - Request identifier
     * @param boundaryContext - Domain boundary context
     * @param config - Domain boundary configuration
     */
    private async setDomainContext(
        requestId: string,
        boundaryContext: DomainBoundaryContext,
        config: DomainBoundaryConfig,
    ): Promise<void> {
        await this.domainContext.setContext(requestId, {
            domain: config.domain,
            operation: config.operation,
            user: boundaryContext.user,
            request: {
                id: requestId,
                timestamp: new Date(),
                ip: boundaryContext.data?.ip,
                userAgent: boundaryContext.data?.userAgent,
            },
            metadata: {
                className: boundaryContext.method.className,
                methodName: boundaryContext.method.name,
                requiresVerification: config.requiresVerification,
                requiresAdmin: config.requiresAdmin,
                allowCrossDomain: config.allowCrossDomain,
                allowedDomains: config.allowedDomains,
            },
        });

        await this.domainContext.setBoundaryContext(requestId, boundaryContext);
    }

    /**
     * Generates a unique request ID
     * @returns Unique request identifier
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
