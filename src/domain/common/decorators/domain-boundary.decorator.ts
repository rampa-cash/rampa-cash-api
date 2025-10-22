import { SetMetadata } from '@nestjs/common';

/**
 * Domain boundary metadata key
 */
export const DOMAIN_BOUNDARY_KEY = 'domain_boundary';

/**
 * Domain types enum
 */
export enum DomainType {
    USER = 'user',
    WALLET = 'wallet',
    TRANSACTION = 'transaction',
    ONRAMP = 'onramp',
    OFFRAMP = 'offramp',
    CONTACT = 'contact',
    VISACARD = 'visacard',
    INQUIRY = 'inquiry',
    SOLANA = 'solana',
    TRANSFER = 'transfer',
    COMMON = 'common',
}

/**
 * Operation types enum
 */
export enum OperationType {
    READ = 'read',
    WRITE = 'write',
    DELETE = 'delete',
    EXECUTE = 'execute',
    MANAGE = 'manage',
}

/**
 * Domain boundary configuration interface
 */
export interface DomainBoundaryConfig {
    /**
     * The domain this method belongs to
     */
    domain: DomainType;

    /**
     * The operation type being performed
     */
    operation: OperationType;

    /**
     * Whether this operation can access other domains
     */
    allowCrossDomain?: boolean;

    /**
     * Specific domains that can be accessed (if allowCrossDomain is true)
     */
    allowedDomains?: DomainType[];

    /**
     * Whether this operation requires user verification
     */
    requiresVerification?: boolean;

    /**
     * Whether this operation requires admin privileges
     */
    requiresAdmin?: boolean;

    /**
     * Custom validation function for additional boundary checks
     */
    customValidation?: (context: any) => boolean | Promise<boolean>;

    /**
     * Description of the operation for documentation
     */
    description?: string;
}

/**
 * Domain Boundary Decorator
 *
 * @description Decorator that enforces domain boundaries and access control
 * for service methods. This helps maintain proper separation of concerns
 * and prevents unauthorized cross-domain operations.
 *
 * @param config - Domain boundary configuration
 *
 * @example
 * ```typescript
 * @DomainBoundary({
 *   domain: DomainType.WALLET,
 *   operation: OperationType.READ,
 *   allowCrossDomain: false,
 *   requiresVerification: true,
 *   description: 'Get wallet balance'
 * })
 * async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
 *   // Implementation
 * }
 * ```
 *
 * @example
 * ```typescript
 * @DomainBoundary({
 *   domain: DomainType.TRANSACTION,
 *   operation: OperationType.EXECUTE,
 *   allowCrossDomain: true,
 *   allowedDomains: [DomainType.WALLET, DomainType.USER],
 *   requiresVerification: true,
 *   description: 'Create transaction with wallet and user validation'
 * })
 * async createTransaction(createDto: CreateTransactionDto): Promise<Transaction> {
 *   // Implementation
 * }
 * ```
 */
export const DomainBoundary = (config: DomainBoundaryConfig) => {
    return SetMetadata(DOMAIN_BOUNDARY_KEY, config);
};

/**
 * Domain boundary validation result
 */
export interface DomainBoundaryValidationResult {
    isValid: boolean;
    error?: string;
    allowedDomains?: DomainType[];
    requiresVerification?: boolean;
    requiresAdmin?: boolean;
}

/**
 * Domain boundary context
 */
export interface DomainBoundaryContext {
    /**
     * Current domain
     */
    currentDomain: DomainType;

    /**
     * Target domain (if cross-domain operation)
     */
    targetDomain?: DomainType;

    /**
     * Operation being performed
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
     * Method context
     */
    method: {
        name: string;
        className: string;
        parameters: any[];
    };

    /**
     * Additional context data
     */
    data?: Record<string, any>;
}

/**
 * Domain boundary validation service interface
 */
export interface IDomainBoundaryValidator {
    /**
     * Validates domain boundary access
     * @param context - Domain boundary context
     * @param config - Domain boundary configuration
     * @returns Validation result
     */
    validate(
        context: DomainBoundaryContext,
        config: DomainBoundaryConfig,
    ): Promise<DomainBoundaryValidationResult>;

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
    ): boolean;

    /**
     * Validates user permissions
     * @param user - User context
     * @param config - Domain boundary configuration
     * @returns True if user has required permissions
     */
    validateUserPermissions(
        user: DomainBoundaryContext['user'],
        config: DomainBoundaryConfig,
    ): boolean;
}
