import { Injectable, Logger } from '@nestjs/common';
import {
    DomainType,
    OperationType,
    DomainBoundaryContext,
} from '../decorators/domain-boundary.decorator';

/**
 * Domain context information
 */
export interface DomainContextInfo {
    /**
     * Current domain
     */
    domain: DomainType;

    /**
     * Current operation
     */
    operation: OperationType;

    /**
     * User context
     */
    user?: {
        id: string;
        isVerified: boolean;
        isAdmin: boolean;
    };

    /**
     * Request context
     */
    request?: {
        id: string;
        timestamp: Date;
        ip?: string;
        userAgent?: string;
    };

    /**
     * Additional metadata
     */
    metadata?: Record<string, any>;
}

/**
 * Domain Context Service
 *
 * @description Service that tracks and manages domain operations context.
 * This service provides a way to track what domain operations are being
 * performed and maintain context throughout the request lifecycle.
 *
 * @example
 * ```typescript
 * // Set domain context
 * await domainContext.setContext({
 *   domain: DomainType.WALLET,
 *   operation: OperationType.READ,
 *   user: { id: 'user-123', isVerified: true, isAdmin: false }
 * });
 *
 * // Get current context
 * const context = domainContext.getCurrentContext();
 * ```
 */
@Injectable()
export class DomainContextService {
    private readonly logger = new Logger(DomainContextService.name);
    private readonly contextStore = new Map<string, DomainContextInfo>();
    private readonly requestContext = new Map<string, DomainBoundaryContext>();

    /**
     * Sets domain context for a request
     * @param requestId - Unique request identifier
     * @param context - Domain context information
     */
    async setContext(
        requestId: string,
        context: DomainContextInfo,
    ): Promise<void> {
        this.logger.debug(
            `Setting domain context for request ${requestId}: ${context.domain}.${context.operation}`,
        );
        this.contextStore.set(requestId, context);
    }

    /**
     * Gets domain context for a request
     * @param requestId - Unique request identifier
     * @returns Domain context information or undefined
     */
    getContext(requestId: string): DomainContextInfo | undefined {
        return this.contextStore.get(requestId);
    }

    /**
     * Gets current domain context (from the most recent request)
     * @returns Current domain context or undefined
     */
    getCurrentContext(): DomainContextInfo | undefined {
        const contexts = Array.from(this.contextStore.values());
        return contexts[contexts.length - 1];
    }

    /**
     * Sets domain boundary context for a request
     * @param requestId - Unique request identifier
     * @param context - Domain boundary context
     */
    async setBoundaryContext(
        requestId: string,
        context: DomainBoundaryContext,
    ): Promise<void> {
        this.logger.debug(
            `Setting domain boundary context for request ${requestId}`,
        );
        this.requestContext.set(requestId, context);
    }

    /**
     * Gets domain boundary context for a request
     * @param requestId - Unique request identifier
     * @returns Domain boundary context or undefined
     */
    getBoundaryContext(requestId: string): DomainBoundaryContext | undefined {
        return this.requestContext.get(requestId);
    }

    /**
     * Updates domain context with additional metadata
     * @param requestId - Unique request identifier
     * @param metadata - Additional metadata to add
     */
    async updateContextMetadata(
        requestId: string,
        metadata: Record<string, any>,
    ): Promise<void> {
        const context = this.contextStore.get(requestId);
        if (context) {
            context.metadata = { ...context.metadata, ...metadata };
            this.contextStore.set(requestId, context);
            this.logger.debug(
                `Updated context metadata for request ${requestId}`,
            );
        }
    }

    /**
     * Clears domain context for a request
     * @param requestId - Unique request identifier
     */
    async clearContext(requestId: string): Promise<void> {
        this.logger.debug(`Clearing domain context for request ${requestId}`);
        this.contextStore.delete(requestId);
        this.requestContext.delete(requestId);
    }

    /**
     * Gets all active domain contexts
     * @returns Array of active domain contexts
     */
    getAllActiveContexts(): DomainContextInfo[] {
        return Array.from(this.contextStore.values());
    }

    /**
     * Gets domain contexts by domain type
     * @param domain - Domain type to filter by
     * @returns Array of domain contexts for the specified domain
     */
    getContextsByDomain(domain: DomainType): DomainContextInfo[] {
        return Array.from(this.contextStore.values()).filter(
            (context) => context.domain === domain,
        );
    }

    /**
     * Gets domain contexts by operation type
     * @param operation - Operation type to filter by
     * @returns Array of domain contexts for the specified operation
     */
    getContextsByOperation(operation: OperationType): DomainContextInfo[] {
        return Array.from(this.contextStore.values()).filter(
            (context) => context.operation === operation,
        );
    }

    /**
     * Gets domain contexts by user
     * @param userId - User ID to filter by
     * @returns Array of domain contexts for the specified user
     */
    getContextsByUser(userId: string): DomainContextInfo[] {
        return Array.from(this.contextStore.values()).filter(
            (context) => context.user?.id === userId,
        );
    }

    /**
     * Checks if a user has active operations in a specific domain
     * @param userId - User ID
     * @param domain - Domain type
     * @returns True if user has active operations in the domain
     */
    hasActiveOperationsInDomain(userId: string, domain: DomainType): boolean {
        return this.getContextsByUser(userId).some(
            (context) => context.domain === domain,
        );
    }

    /**
     * Gets operation statistics
     * @returns Object with operation statistics
     */
    getOperationStatistics(): {
        totalOperations: number;
        operationsByDomain: Record<DomainType, number>;
        operationsByType: Record<OperationType, number>;
        activeUsers: number;
    } {
        const contexts = Array.from(this.contextStore.values());
        const operationsByDomain: Record<DomainType, number> = {} as Record<
            DomainType,
            number
        >;
        const operationsByType: Record<OperationType, number> = {} as Record<
            OperationType,
            number
        >;
        const activeUsers = new Set<string>();

        contexts.forEach((context) => {
            // Count by domain
            operationsByDomain[context.domain] =
                (operationsByDomain[context.domain] || 0) + 1;

            // Count by operation type
            operationsByType[context.operation] =
                (operationsByType[context.operation] || 0) + 1;

            // Track active users
            if (context.user?.id) {
                activeUsers.add(context.user.id);
            }
        });

        return {
            totalOperations: contexts.length,
            operationsByDomain,
            operationsByType,
            activeUsers: activeUsers.size,
        };
    }

    /**
     * Cleans up old contexts (older than specified minutes)
     * @param maxAgeMinutes - Maximum age in minutes
     */
    async cleanupOldContexts(maxAgeMinutes: number = 30): Promise<void> {
        const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        let cleanedCount = 0;

        for (const [requestId, context] of this.contextStore.entries()) {
            if (
                context.request?.timestamp &&
                context.request.timestamp < cutoffTime
            ) {
                this.contextStore.delete(requestId);
                this.requestContext.delete(requestId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.log(`Cleaned up ${cleanedCount} old domain contexts`);
        }
    }

    /**
     * Creates a domain boundary context from domain context
     * @param requestId - Request identifier
     * @param methodName - Method name
     * @param className - Class name
     * @param parameters - Method parameters
     * @param targetDomain - Target domain (if different from current)
     * @returns Domain boundary context
     */
    createBoundaryContext(
        requestId: string,
        methodName: string,
        className: string,
        parameters: any[],
        targetDomain?: DomainType,
    ): DomainBoundaryContext | undefined {
        const context = this.getContext(requestId);
        if (!context) {
            return undefined;
        }

        return {
            currentDomain: context.domain,
            targetDomain: targetDomain || context.domain,
            operation: context.operation,
            user: context.user,
            method: {
                name: methodName,
                className,
                parameters,
            },
            data: context.metadata,
        };
    }
}
