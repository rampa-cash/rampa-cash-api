import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Service configuration interface
 */
export interface ServiceConfiguration {
    /**
     * Service type/class
     */
    type: Type<any>;

    /**
     * Service name/identifier
     */
    name: string;

    /**
     * Whether the service is singleton
     */
    singleton?: boolean;

    /**
     * Dependencies required by the service
     */
    dependencies?: Type<any>[];

    /**
     * Factory function for custom service creation
     */
    factory?: (...args: any[]) => any;

    /**
     * Service initialization function
     */
    initialize?: (service: any) => Promise<void> | void;

    /**
     * Service cleanup function
     */
    cleanup?: (service: any) => Promise<void> | void;
}

/**
 * Service instance information
 */
export interface ServiceInstance {
    /**
     * Service instance
     */
    instance: any;

    /**
     * Service configuration
     */
    config: ServiceConfiguration;

    /**
     * Creation timestamp
     */
    createdAt: Date;

    /**
     * Last access timestamp
     */
    lastAccessedAt: Date;

    /**
     * Access count
     */
    accessCount: number;
}

/**
 * Domain Service Factory
 *
 * @description Factory for creating and managing complex domain services.
 * This factory provides advanced service creation capabilities including
 * dependency injection, service lifecycle management, and dynamic service resolution.
 *
 * @example
 * ```typescript
 * // Register a service
 * await domainServiceFactory.registerService({
 *   type: ComplexWalletService,
 *   name: 'complex-wallet-service',
 *   dependencies: [IWalletService, IWalletBalanceService],
 *   initialize: async (service) => {
 *     await service.initialize();
 *   }
 * });
 *
 * // Get a service instance
 * const walletService = await domainServiceFactory.getService('complex-wallet-service');
 * ```
 */
@Injectable()
export class DomainServiceFactory {
    private readonly logger = new Logger(DomainServiceFactory.name);
    private readonly serviceRegistry = new Map<string, ServiceConfiguration>();
    private readonly serviceInstances = new Map<string, ServiceInstance>();
    private readonly serviceDependencies = new Map<string, Set<string>>();

    constructor(private readonly moduleRef: ModuleRef) {}

    /**
     * Registers a service configuration
     * @param config - Service configuration
     */
    async registerService(config: ServiceConfiguration): Promise<void> {
        this.logger.debug(`Registering service: ${config.name}`);

        // Validate configuration
        this.validateServiceConfiguration(config);

        // Register service configuration
        this.serviceRegistry.set(config.name, config);

        // Build dependency graph
        if (config.dependencies) {
            this.serviceDependencies.set(
                config.name,
                new Set(config.dependencies.map((dep) => dep.name)),
            );
        }

        this.logger.log(`Service registered: ${config.name}`);
    }

    /**
     * Gets a service instance by name
     * @param name - Service name
     * @returns Service instance
     */
    async getService<T = any>(name: string): Promise<T> {
        const config = this.serviceRegistry.get(name);
        if (!config) {
            throw new Error(`Service not found: ${name}`);
        }

        // Check if singleton instance exists
        if (config.singleton !== false) {
            const existingInstance = this.serviceInstances.get(name);
            if (existingInstance) {
                existingInstance.lastAccessedAt = new Date();
                existingInstance.accessCount++;
                return existingInstance.instance as T;
            }
        }

        // Create new instance
        const instance = await this.createServiceInstance(config);

        // Store instance if singleton
        if (config.singleton !== false) {
            this.serviceInstances.set(name, {
                instance,
                config,
                createdAt: new Date(),
                lastAccessedAt: new Date(),
                accessCount: 1,
            });
        }

        return instance as T;
    }

    /**
     * Creates a service instance with dependencies
     * @param config - Service configuration
     * @returns Service instance
     */
    private async createServiceInstance(
        config: ServiceConfiguration,
    ): Promise<any> {
        this.logger.debug(`Creating service instance: ${config.name}`);

        try {
            let instance: any;

            if (config.factory) {
                // Use custom factory function
                const dependencies = await this.resolveDependencies(
                    config.dependencies || [],
                );
                instance = config.factory(...dependencies);
            } else {
                // Use NestJS module reference
                instance = this.moduleRef.get(config.type, { strict: false });
            }

            // Initialize service if initialization function provided
            if (config.initialize) {
                await config.initialize(instance);
            }

            this.logger.debug(`Service instance created: ${config.name}`);
            return instance;
        } catch (error) {
            this.logger.error(
                `Failed to create service instance: ${config.name}`,
                error.stack,
            );
            throw new Error(
                `Failed to create service instance: ${config.name}. ${error.message}`,
            );
        }
    }

    /**
     * Resolves service dependencies
     * @param dependencies - Dependency types
     * @returns Resolved dependencies
     */
    private async resolveDependencies(
        dependencies: Type<any>[],
    ): Promise<any[]> {
        const resolvedDependencies: any[] = [];

        for (const dependency of dependencies) {
            try {
                const instance = this.moduleRef.get(dependency, {
                    strict: false,
                });
                resolvedDependencies.push(instance);
            } catch (error) {
                this.logger.warn(
                    `Failed to resolve dependency: ${dependency.name}`,
                );
                resolvedDependencies.push(null);
            }
        }

        return resolvedDependencies;
    }

    /**
     * Validates service configuration
     * @param config - Service configuration
     */
    private validateServiceConfiguration(config: ServiceConfiguration): void {
        if (!config.type) {
            throw new Error('Service type is required');
        }

        if (!config.name) {
            throw new Error('Service name is required');
        }

        if (this.serviceRegistry.has(config.name)) {
            throw new Error(`Service already registered: ${config.name}`);
        }
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
    getServiceConfiguration(name: string): ServiceConfiguration | undefined {
        return this.serviceRegistry.get(name);
    }

    /**
     * Gets service instance information
     * @param name - Service name
     * @returns Service instance information or undefined
     */
    getServiceInstanceInfo(name: string): ServiceInstance | undefined {
        return this.serviceInstances.get(name);
    }

    /**
     * Gets all service instances
     * @returns Array of service instance information
     */
    getAllServiceInstances(): ServiceInstance[] {
        return Array.from(this.serviceInstances.values());
    }

    /**
     * Checks if a service is registered
     * @param name - Service name
     * @returns True if service is registered
     */
    isServiceRegistered(name: string): boolean {
        return this.serviceRegistry.has(name);
    }

    /**
     * Checks if a service instance exists
     * @param name - Service name
     * @returns True if service instance exists
     */
    hasServiceInstance(name: string): boolean {
        return this.serviceInstances.has(name);
    }

    /**
     * Removes a service instance (for non-singleton services)
     * @param name - Service name
     */
    async removeServiceInstance(name: string): Promise<void> {
        const instanceInfo = this.serviceInstances.get(name);
        if (instanceInfo) {
            // Call cleanup function if provided
            if (instanceInfo.config.cleanup) {
                await instanceInfo.config.cleanup(instanceInfo.instance);
            }

            this.serviceInstances.delete(name);
            this.logger.debug(`Service instance removed: ${name}`);
        }
    }

    /**
     * Cleans up all service instances
     */
    async cleanupAllServices(): Promise<void> {
        this.logger.debug('Cleaning up all service instances');

        for (const [name, instanceInfo] of this.serviceInstances.entries()) {
            try {
                if (instanceInfo.config.cleanup) {
                    await instanceInfo.config.cleanup(instanceInfo.instance);
                }
            } catch (error) {
                this.logger.error(
                    `Failed to cleanup service: ${name}`,
                    error.stack,
                );
            }
        }

        this.serviceInstances.clear();
        this.logger.log('All service instances cleaned up');
    }

    /**
     * Gets service statistics
     * @returns Service statistics
     */
    getServiceStatistics(): {
        totalRegistered: number;
        totalInstances: number;
        instancesByType: Record<string, number>;
        totalAccessCount: number;
        averageAccessCount: number;
    } {
        const instances = Array.from(this.serviceInstances.values());
        const instancesByType: Record<string, number> = {};
        let totalAccessCount = 0;

        instances.forEach((instance) => {
            const typeName = instance.config.type.name;
            instancesByType[typeName] = (instancesByType[typeName] || 0) + 1;
            totalAccessCount += instance.accessCount;
        });

        return {
            totalRegistered: this.serviceRegistry.size,
            totalInstances: instances.length,
            instancesByType,
            totalAccessCount,
            averageAccessCount:
                instances.length > 0 ? totalAccessCount / instances.length : 0,
        };
    }

    /**
     * Validates service dependencies
     * @returns Validation result
     */
    validateServiceDependencies(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const [
            serviceName,
            dependencies,
        ] of this.serviceDependencies.entries()) {
            for (const dependencyName of dependencies) {
                if (!this.serviceRegistry.has(dependencyName)) {
                    errors.push(
                        `Service ${serviceName} depends on unregistered service: ${dependencyName}`,
                    );
                }
            }
        }

        // Check for circular dependencies
        const circularDeps = this.detectCircularDependencies();
        if (circularDeps.length > 0) {
            errors.push(
                `Circular dependencies detected: ${circularDeps.join(', ')}`,
            );
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Detects circular dependencies
     * @returns Array of circular dependency chains
     */
    private detectCircularDependencies(): string[] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const circularDeps: string[] = [];

        const dfs = (serviceName: string, path: string[]): void => {
            if (recursionStack.has(serviceName)) {
                const cycleStart = path.indexOf(serviceName);
                circularDeps.push(
                    path.slice(cycleStart).join(' -> ') + ' -> ' + serviceName,
                );
                return;
            }

            if (visited.has(serviceName)) {
                return;
            }

            visited.add(serviceName);
            recursionStack.add(serviceName);

            const dependencies =
                this.serviceDependencies.get(serviceName) || new Set();
            for (const dep of dependencies) {
                dfs(dep, [...path, serviceName]);
            }

            recursionStack.delete(serviceName);
        };

        for (const serviceName of this.serviceRegistry.keys()) {
            if (!visited.has(serviceName)) {
                dfs(serviceName, []);
            }
        }

        return circularDeps;
    }
}
