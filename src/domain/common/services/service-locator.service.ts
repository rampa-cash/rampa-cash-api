import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Service locator configuration
 */
export interface ServiceLocatorConfig {
    /**
     * Service type/class
     */
    type: Type<any>;

    /**
     * Service name/identifier
     */
    name: string;

    /**
     * Whether the service is optional
     */
    optional?: boolean;

    /**
     * Default value if service is not found and optional
     */
    defaultValue?: any;

    /**
     * Service factory function
     */
    factory?: () => any;
}

/**
 * Service locator result
 */
export interface ServiceLocatorResult<T = any> {
    /**
     * Service instance
     */
    service: T | null;

    /**
     * Whether the service was found
     */
    found: boolean;

    /**
     * Error message if service was not found
     */
    error?: string;
}

/**
 * Service Locator Service
 *
 * @description Service locator pattern implementation for dynamic service resolution.
 * This service provides a centralized way to locate and resolve services at runtime
 * without tight coupling to the dependency injection container.
 *
 * @example
 * ```typescript
 * // Register services
 * serviceLocator.register('wallet-service', WalletService);
 * serviceLocator.register('user-service', UserService, { optional: true });
 *
 * // Resolve services
 * const walletService = serviceLocator.resolve<WalletService>('wallet-service');
 * const userService = serviceLocator.resolveOptional<UserService>('user-service');
 * ```
 */
@Injectable()
export class ServiceLocatorService {
    private readonly logger = new Logger(ServiceLocatorService.name);
    private readonly serviceRegistry = new Map<string, ServiceLocatorConfig>();
    private readonly serviceCache = new Map<string, any>();

    constructor(private readonly moduleRef: ModuleRef) {}

    /**
     * Registers a service with the locator
     * @param name - Service name
     * @param type - Service type
     * @param config - Additional configuration
     */
    register(
        name: string,
        type: Type<any>,
        config?: Partial<ServiceLocatorConfig>,
    ): void {
        this.logger.debug(`Registering service: ${name}`);

        const serviceConfig: ServiceLocatorConfig = {
            type,
            name,
            optional: false,
            ...config,
        };

        this.serviceRegistry.set(name, serviceConfig);
        this.logger.log(`Service registered: ${name}`);
    }

    /**
     * Resolves a service by name
     * @param name - Service name
     * @returns Service instance or null if not found
     */
    resolve<T = any>(name: string): T | null {
        this.logger.debug(`Resolving service: ${name}`);

        // Check cache first
        if (this.serviceCache.has(name)) {
            this.logger.debug(`Service found in cache: ${name}`);
            return this.serviceCache.get(name) as T;
        }

        const config = this.serviceRegistry.get(name);
        if (!config) {
            this.logger.warn(`Service not registered: ${name}`);
            return null;
        }

        try {
            let service: any;

            if (config.factory) {
                // Use factory function
                service = config.factory();
            } else {
                // Use NestJS module reference
                service = this.moduleRef.get(config.type, { strict: false });
            }

            // Cache the service
            this.serviceCache.set(name, service);

            this.logger.debug(`Service resolved: ${name}`);
            return service as T;
        } catch (error) {
            this.logger.error(
                `Failed to resolve service: ${name}`,
                error.stack,
            );
            return null;
        }
    }

    /**
     * Resolves a service with detailed result information
     * @param name - Service name
     * @returns Service locator result
     */
    resolveWithResult<T = any>(name: string): ServiceLocatorResult<T> {
        this.logger.debug(`Resolving service with result: ${name}`);

        const config = this.serviceRegistry.get(name);
        if (!config) {
            return {
                service: null,
                found: false,
                error: `Service not registered: ${name}`,
            };
        }

        try {
            let service: any;

            if (config.factory) {
                service = config.factory();
            } else {
                service = this.moduleRef.get(config.type, { strict: false });
            }

            // Cache the service
            this.serviceCache.set(name, service);

            return {
                service: service as T,
                found: true,
            };
        } catch (error) {
            return {
                service: null,
                found: false,
                error: `Failed to resolve service: ${name}. ${error.message}`,
            };
        }
    }

    /**
     * Resolves an optional service (returns default value if not found)
     * @param name - Service name
     * @param defaultValue - Default value to return if service not found
     * @returns Service instance or default value
     */
    resolveOptional<T = any>(name: string, defaultValue?: T): T | null {
        this.logger.debug(`Resolving optional service: ${name}`);

        const config = this.serviceRegistry.get(name);
        if (!config) {
            this.logger.debug(
                `Optional service not found, using default: ${name}`,
            );
            return defaultValue || null;
        }

        const result = this.resolveWithResult<T>(name);
        if (!result.found) {
            this.logger.debug(
                `Optional service resolution failed, using default: ${name}`,
            );
            return defaultValue || null;
        }

        return result.service;
    }

    /**
     * Resolves multiple services by names
     * @param names - Array of service names
     * @returns Map of service names to instances
     */
    resolveMultiple<T = any>(names: string[]): Map<string, T | null> {
        const results = new Map<string, T | null>();

        for (const name of names) {
            results.set(name, this.resolve<T>(name));
        }

        return results;
    }

    /**
     * Resolves services by type
     * @param type - Service type
     * @returns Array of service instances of the specified type
     */
    resolveByType<T = any>(type: Type<T>): T[] {
        this.logger.debug(`Resolving services by type: ${type.name}`);

        const services: T[] = [];

        for (const [name, config] of this.serviceRegistry.entries()) {
            if (config.type === type) {
                const service = this.resolve<T>(name);
                if (service) {
                    services.push(service);
                }
            }
        }

        return services;
    }

    /**
     * Checks if a service is registered
     * @param name - Service name
     * @returns True if service is registered
     */
    isRegistered(name: string): boolean {
        return this.serviceRegistry.has(name);
    }

    /**
     * Gets all registered service names
     * @returns Array of service names
     */
    getRegisteredServices(): string[] {
        return Array.from(this.serviceRegistry.keys());
    }

    /**
     * Gets service configuration by name
     * @param name - Service name
     * @returns Service configuration or undefined
     */
    getServiceConfig(name: string): ServiceLocatorConfig | undefined {
        return this.serviceRegistry.get(name);
    }

    /**
     * Clears the service cache
     */
    clearCache(): void {
        this.logger.debug('Clearing service cache');
        this.serviceCache.clear();
    }

    /**
     * Removes a service from the registry
     * @param name - Service name
     */
    unregister(name: string): void {
        this.logger.debug(`Unregistering service: ${name}`);
        this.serviceRegistry.delete(name);
        this.serviceCache.delete(name);
        this.logger.log(`Service unregistered: ${name}`);
    }

    /**
     * Gets service locator statistics
     * @returns Service locator statistics
     */
    getStatistics(): {
        totalRegistered: number;
        totalCached: number;
        cacheHitRate: number;
        servicesByType: Record<string, number>;
    } {
        const servicesByType: Record<string, number> = {};
        let totalCached = 0;

        for (const [name, config] of this.serviceRegistry.entries()) {
            const typeName = config.type.name;
            servicesByType[typeName] = (servicesByType[typeName] || 0) + 1;

            if (this.serviceCache.has(name)) {
                totalCached++;
            }
        }

        return {
            totalRegistered: this.serviceRegistry.size,
            totalCached,
            cacheHitRate:
                this.serviceRegistry.size > 0
                    ? totalCached / this.serviceRegistry.size
                    : 0,
            servicesByType,
        };
    }

    /**
     * Validates all registered services
     * @returns Validation result
     */
    validateServices(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const [name, config] of this.serviceRegistry.entries()) {
            try {
                const result = this.resolveWithResult(name);
                if (!result.found) {
                    if (config.optional) {
                        warnings.push(
                            `Optional service not available: ${name}`,
                        );
                    } else {
                        errors.push(`Required service not available: ${name}`);
                    }
                }
            } catch (error) {
                errors.push(
                    `Service validation failed: ${name}. ${error.message}`,
                );
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Creates a service locator with pre-configured services
     * @param services - Map of service names to configurations
     * @returns Configured service locator
     */
    static createWithServices(
        services: Map<string, ServiceLocatorConfig>,
    ): ServiceLocatorService {
        const locator = new ServiceLocatorService(null as any); // Will be injected properly

        for (const [name, config] of services.entries()) {
            locator.serviceRegistry.set(name, config);
        }

        return locator;
    }
}
