import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import {
    DomainType,
    OperationType,
    DomainBoundaryConfig,
    DomainBoundaryContext,
    DomainBoundaryValidationResult,
    IDomainBoundaryValidator,
} from '../decorators/domain-boundary.decorator';

/**
 * Domain Access Control Service
 *
 * @description Service that enforces domain boundaries and access control
 * for cross-domain operations. This service helps maintain proper separation
 * of concerns and prevents unauthorized access between domains.
 *
 * @example
 * ```typescript
 * // Validate domain access
 * const result = await domainAccessControl.validateAccess(
 *   context,
 *   config
 * );
 *
 * if (!result.isValid) {
 *   throw new ForbiddenException(result.error);
 * }
 * ```
 */
@Injectable()
export class DomainAccessControlService implements IDomainBoundaryValidator {
    private readonly logger = new Logger(DomainAccessControlService.name);

    /**
     * Domain access matrix - defines which domains can access which other domains
     */
    private readonly domainAccessMatrix: Map<DomainType, DomainType[]> =
        new Map([
            [
                DomainType.USER,
                [DomainType.WALLET, DomainType.TRANSACTION, DomainType.CONTACT],
            ],
            [
                DomainType.WALLET,
                [
                    DomainType.USER,
                    DomainType.TRANSACTION,
                    DomainType.ONRAMP,
                    DomainType.OFFRAMP,
                ],
            ],
            [DomainType.TRANSACTION, [DomainType.USER, DomainType.WALLET]],
            [DomainType.ONRAMP, [DomainType.USER, DomainType.WALLET]],
            [DomainType.OFFRAMP, [DomainType.USER, DomainType.WALLET]],
            [DomainType.CONTACT, [DomainType.USER]],
            [DomainType.VISACARD, [DomainType.USER]],
            [DomainType.INQUIRY, [DomainType.USER]],
            [DomainType.SOLANA, [DomainType.WALLET, DomainType.TRANSACTION]],
            [
                DomainType.TRANSFER,
                [
                    DomainType.USER,
                    DomainType.WALLET,
                    DomainType.TRANSACTION,
                    DomainType.SOLANA,
                ],
            ],
            [DomainType.COMMON, []], // Common domain cannot access other domains
        ]);

    /**
     * Operation permissions matrix - defines which operations require what permissions
     */
    private readonly operationPermissions: Map<
        OperationType,
        {
            requiresVerification: boolean;
            requiresAdmin: boolean;
            allowedDomains: DomainType[];
        }
    > = new Map([
        [
            OperationType.READ,
            {
                requiresVerification: false,
                requiresAdmin: false,
                allowedDomains: [],
            },
        ],
        [
            OperationType.WRITE,
            {
                requiresVerification: true,
                requiresAdmin: false,
                allowedDomains: [],
            },
        ],
        [
            OperationType.DELETE,
            {
                requiresVerification: true,
                requiresAdmin: false,
                allowedDomains: [],
            },
        ],
        [
            OperationType.EXECUTE,
            {
                requiresVerification: true,
                requiresAdmin: false,
                allowedDomains: [],
            },
        ],
        [
            OperationType.MANAGE,
            {
                requiresVerification: true,
                requiresAdmin: true,
                allowedDomains: [],
            },
        ],
    ]);

    /**
     * Validates domain boundary access
     * @param context - Domain boundary context
     * @param config - Domain boundary configuration
     * @returns Validation result
     */
    async validate(
        context: DomainBoundaryContext,
        config: DomainBoundaryConfig,
    ): Promise<DomainBoundaryValidationResult> {
        this.logger.debug(
            `Validating domain boundary: ${context.currentDomain} -> ${config.domain} (${config.operation})`,
        );

        try {
            // Check if operation is allowed in the current domain
            if (context.currentDomain !== config.domain) {
                return {
                    isValid: false,
                    error: `Operation ${config.operation} is not allowed in domain ${context.currentDomain}`,
                };
            }

            // Check cross-domain access if applicable
            if (
                context.targetDomain &&
                context.targetDomain !== config.domain
            ) {
                const crossDomainAllowed = this.isCrossDomainAccessAllowed(
                    context.currentDomain,
                    context.targetDomain,
                    config.allowedDomains,
                );

                if (!crossDomainAllowed) {
                    return {
                        isValid: false,
                        error: `Cross-domain access from ${context.currentDomain} to ${context.targetDomain} is not allowed`,
                    };
                }
            }

            // Validate user permissions
            const userPermissionsValid = this.validateUserPermissions(
                context.user,
                config,
            );
            if (!userPermissionsValid) {
                return {
                    isValid: false,
                    error: 'User does not have required permissions for this operation',
                };
            }

            // Run custom validation if provided
            if (config.customValidation) {
                const customValidationResult =
                    await config.customValidation(context);
                if (!customValidationResult) {
                    return {
                        isValid: false,
                        error: 'Custom validation failed',
                    };
                }
            }

            this.logger.debug(
                `Domain boundary validation passed for ${config.domain}.${config.operation}`,
            );
            return {
                isValid: true,
                allowedDomains: config.allowedDomains,
                requiresVerification: config.requiresVerification,
                requiresAdmin: config.requiresAdmin,
            };
        } catch (error) {
            this.logger.error(
                `Domain boundary validation failed: ${error.message}`,
                error.stack,
            );
            return {
                isValid: false,
                error: `Domain boundary validation failed: ${error.message}`,
            };
        }
    }

    /**
     * Checks if cross-domain access is allowed
     * @param currentDomain - Current domain
     * @param targetDomain - Target domain
     * @param allowedDomains - Allowed domains list
     * @returns True if access is allowed
     */
    isCrossDomainAccessAllowed(
        currentDomain: DomainType,
        targetDomain: DomainType,
        allowedDomains?: DomainType[],
    ): boolean {
        // If no target domain, access is allowed
        if (!targetDomain) {
            return true;
        }

        // If same domain, access is allowed
        if (currentDomain === targetDomain) {
            return true;
        }

        // Check if target domain is in allowed domains list
        if (allowedDomains && allowedDomains.includes(targetDomain)) {
            return true;
        }

        // Check domain access matrix
        const allowedTargets = this.domainAccessMatrix.get(currentDomain) || [];
        return allowedTargets.includes(targetDomain);
    }

    /**
     * Validates user permissions
     * @param user - User context
     * @param config - Domain boundary configuration
     * @returns True if user has required permissions
     */
    validateUserPermissions(
        user: DomainBoundaryContext['user'],
        config: DomainBoundaryConfig,
    ): boolean {
        // If no user context, only allow read operations
        if (!user) {
            return config.operation === OperationType.READ;
        }

        // Check verification requirement
        if (config.requiresVerification && !user.isVerified) {
            this.logger.warn(
                `User ${user.id} is not verified but operation requires verification`,
            );
            return false;
        }

        // Check admin requirement
        if (config.requiresAdmin && !user.isAdmin) {
            this.logger.warn(
                `User ${user.id} is not admin but operation requires admin privileges`,
            );
            return false;
        }

        // Check operation-specific permissions
        const operationConfig = this.operationPermissions.get(config.operation);
        if (operationConfig) {
            if (operationConfig.requiresVerification && !user.isVerified) {
                return false;
            }
            if (operationConfig.requiresAdmin && !user.isAdmin) {
                return false;
            }
        }

        return true;
    }

    /**
     * Gets allowed domains for a given domain
     * @param domain - Domain type
     * @returns Array of allowed domains
     */
    getAllowedDomains(domain: DomainType): DomainType[] {
        return this.domainAccessMatrix.get(domain) || [];
    }

    /**
     * Checks if a domain can access another domain
     * @param fromDomain - Source domain
     * @param toDomain - Target domain
     * @returns True if access is allowed
     */
    canAccessDomain(fromDomain: DomainType, toDomain: DomainType): boolean {
        const allowedDomains = this.domainAccessMatrix.get(fromDomain) || [];
        return allowedDomains.includes(toDomain);
    }

    /**
     * Gets operation permissions for a given operation
     * @param operation - Operation type
     * @returns Operation permissions configuration
     */
    getOperationPermissions(operation: OperationType) {
        return this.operationPermissions.get(operation);
    }

    /**
     * Validates domain boundary and throws exception if invalid
     * @param context - Domain boundary context
     * @param config - Domain boundary configuration
     * @throws ForbiddenException if validation fails
     */
    async validateAndThrow(
        context: DomainBoundaryContext,
        config: DomainBoundaryConfig,
    ): Promise<void> {
        const result = await this.validate(context, config);
        if (!result.isValid) {
            throw new ForbiddenException(result.error);
        }
    }
}
