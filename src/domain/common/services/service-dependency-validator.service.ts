import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
    /**
     * Whether all dependencies are valid
     */
    isValid: boolean;

    /**
     * Validation errors
     */
    errors: string[];

    /**
     * Validation warnings
     */
    warnings: string[];

    /**
     * Dependency graph
     */
    dependencyGraph: DependencyNode[];

    /**
     * Circular dependencies
     */
    circularDependencies: string[][];
}

/**
 * Dependency node in the dependency graph
 */
export interface DependencyNode {
    /**
     * Service name
     */
    name: string;

    /**
     * Service type
     */
    type: Type<any>;

    /**
     * Dependencies of this service
     */
    dependencies: string[];

    /**
     * Services that depend on this service
     */
    dependents: string[];

    /**
     * Whether this service is available
     */
    available: boolean;

    /**
     * Error message if service is not available
     */
    error?: string;
}

/**
 * Service dependency information
 */
export interface ServiceDependencyInfo {
    /**
     * Service name
     */
    name: string;

    /**
     * Service type
     */
    type: Type<any>;

    /**
     * Dependencies
     */
    dependencies: Type<any>[];

    /**
     * Whether the service is optional
     */
    optional?: boolean;

    /**
     * Module that provides this service
     */
    module?: Type<any>;
}

/**
 * Service Dependency Validator Service
 *
 * @description Service that validates service dependencies at startup and runtime.
 * This service helps ensure that all required dependencies are available and
 * prevents circular dependency issues.
 *
 * @example
 * ```typescript
 * // Validate all services
 * const result = await serviceDependencyValidator.validateAllServices();
 * if (!result.isValid) {
 *   console.error('Dependency validation failed:', result.errors);
 * }
 * ```
 */
@Injectable()
export class ServiceDependencyValidatorService {
    private readonly logger = new Logger(
        ServiceDependencyValidatorService.name,
    );
    private readonly serviceDependencies = new Map<
        string,
        ServiceDependencyInfo
    >();
    private readonly dependencyGraph = new Map<string, Set<string>>();
    private readonly reverseDependencyGraph = new Map<string, Set<string>>();

    constructor(private readonly moduleRef: ModuleRef) {}

    /**
     * Registers a service for dependency validation
     * @param info - Service dependency information
     */
    registerService(info: ServiceDependencyInfo): void {
        this.logger.debug(`Registering service for validation: ${info.name}`);

        this.serviceDependencies.set(info.name, info);

        // Build dependency graph
        const dependencies = info.dependencies.map((dep) => dep.name);
        this.dependencyGraph.set(info.name, new Set(dependencies));

        // Build reverse dependency graph
        for (const dep of dependencies) {
            if (!this.reverseDependencyGraph.has(dep)) {
                this.reverseDependencyGraph.set(dep, new Set());
            }
            this.reverseDependencyGraph.get(dep)!.add(info.name);
        }

        this.logger.log(`Service registered for validation: ${info.name}`);
    }

    /**
     * Validates all registered services
     * @returns Dependency validation result
     */
    async validateAllServices(): Promise<DependencyValidationResult> {
        this.logger.log('Starting dependency validation for all services');

        const errors: string[] = [];
        const warnings: string[] = [];
        const dependencyNodes: DependencyNode[] = [];
        const circularDependencies: string[][] = [];

        // Validate each service
        for (const [
            serviceName,
            serviceInfo,
        ] of this.serviceDependencies.entries()) {
            const node = await this.validateService(serviceName, serviceInfo);
            dependencyNodes.push(node);

            if (!node.available) {
                if (serviceInfo.optional) {
                    warnings.push(
                        `Optional service not available: ${serviceName} - ${node.error}`,
                    );
                } else {
                    errors.push(
                        `Required service not available: ${serviceName} - ${node.error}`,
                    );
                }
            }
        }

        // Detect circular dependencies
        const circularDeps = this.detectCircularDependencies();
        circularDependencies.push(...circularDeps);

        if (circularDeps.length > 0) {
            errors.push(
                `Circular dependencies detected: ${circularDeps.map((cycle) => cycle.join(' -> ')).join(', ')}`,
            );
        }

        // Validate dependency availability
        for (const node of dependencyNodes) {
            for (const dep of node.dependencies) {
                const depNode = dependencyNodes.find((n) => n.name === dep);
                if (!depNode || !depNode.available) {
                    if (this.serviceDependencies.get(dep)?.optional) {
                        warnings.push(
                            `Service ${node.name} depends on optional service ${dep} which is not available`,
                        );
                    } else {
                        errors.push(
                            `Service ${node.name} depends on unavailable service ${dep}`,
                        );
                    }
                }
            }
        }

        const result: DependencyValidationResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
            dependencyGraph: dependencyNodes,
            circularDependencies,
        };

        this.logger.log(
            `Dependency validation completed. Valid: ${result.isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}`,
        );

        return result;
    }

    /**
     * Validates a specific service
     * @param serviceName - Service name
     * @param serviceInfo - Service dependency information
     * @returns Dependency node with validation result
     */
    private async validateService(
        serviceName: string,
        serviceInfo: ServiceDependencyInfo,
    ): Promise<DependencyNode> {
        this.logger.debug(`Validating service: ${serviceName}`);

        try {
            // Try to resolve the service
            const service = this.moduleRef.get(serviceInfo.type, {
                strict: false,
            });

            const dependencies =
                this.dependencyGraph.get(serviceName) || new Set();
            const dependents =
                this.reverseDependencyGraph.get(serviceName) || new Set();

            return {
                name: serviceName,
                type: serviceInfo.type,
                dependencies: Array.from(dependencies),
                dependents: Array.from(dependents),
                available: true,
            };
        } catch (error) {
            this.logger.warn(
                `Service validation failed: ${serviceName}`,
                error.stack,
            );

            const dependencies =
                this.dependencyGraph.get(serviceName) || new Set();
            const dependents =
                this.reverseDependencyGraph.get(serviceName) || new Set();

            return {
                name: serviceName,
                type: serviceInfo.type,
                dependencies: Array.from(dependencies),
                dependents: Array.from(dependents),
                available: false,
                error: error.message,
            };
        }
    }

    /**
     * Detects circular dependencies
     * @returns Array of circular dependency chains
     */
    private detectCircularDependencies(): string[][] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const circularDeps: string[][] = [];

        const dfs = (serviceName: string, path: string[]): void => {
            if (recursionStack.has(serviceName)) {
                const cycleStart = path.indexOf(serviceName);
                circularDeps.push([...path.slice(cycleStart), serviceName]);
                return;
            }

            if (visited.has(serviceName)) {
                return;
            }

            visited.add(serviceName);
            recursionStack.add(serviceName);

            const dependencies =
                this.dependencyGraph.get(serviceName) || new Set();
            for (const dep of dependencies) {
                dfs(dep, [...path, serviceName]);
            }

            recursionStack.delete(serviceName);
        };

        for (const serviceName of this.serviceDependencies.keys()) {
            if (!visited.has(serviceName)) {
                dfs(serviceName, []);
            }
        }

        return circularDeps;
    }

    /**
     * Gets dependency graph for a specific service
     * @param serviceName - Service name
     * @returns Dependency graph starting from the service
     */
    getDependencyGraph(serviceName: string): DependencyNode[] {
        const visited = new Set<string>();
        const result: DependencyNode[] = [];

        const dfs = (name: string): void => {
            if (visited.has(name)) {
                return;
            }

            visited.add(name);

            const serviceInfo = this.serviceDependencies.get(name);
            if (serviceInfo) {
                const dependencies =
                    this.dependencyGraph.get(name) || new Set();
                const dependents =
                    this.reverseDependencyGraph.get(name) || new Set();

                result.push({
                    name,
                    type: serviceInfo.type,
                    dependencies: Array.from(dependencies),
                    dependents: Array.from(dependents),
                    available: true, // We'll validate this separately if needed
                });

                // Recursively add dependencies
                for (const dep of dependencies) {
                    dfs(dep);
                }
            }
        };

        dfs(serviceName);
        return result;
    }

    /**
     * Gets all services that depend on a specific service
     * @param serviceName - Service name
     * @returns Array of service names that depend on the specified service
     */
    getDependents(serviceName: string): string[] {
        const dependents =
            this.reverseDependencyGraph.get(serviceName) || new Set();
        return Array.from(dependents);
    }

    /**
     * Gets all dependencies of a specific service
     * @param serviceName - Service name
     * @returns Array of service names that the specified service depends on
     */
    getDependencies(serviceName: string): string[] {
        const dependencies = this.dependencyGraph.get(serviceName) || new Set();
        return Array.from(dependencies);
    }

    /**
     * Gets service dependency statistics
     * @returns Service dependency statistics
     */
    getDependencyStatistics(): {
        totalServices: number;
        totalDependencies: number;
        averageDependenciesPerService: number;
        servicesWithMostDependencies: Array<{ name: string; count: number }>;
        servicesWithMostDependents: Array<{ name: string; count: number }>;
    } {
        const services = Array.from(this.serviceDependencies.keys());
        const dependencyCounts = new Map<string, number>();
        const dependentCounts = new Map<string, number>();
        let totalDependencies = 0;

        for (const serviceName of services) {
            const dependencies =
                this.dependencyGraph.get(serviceName) || new Set();
            const dependents =
                this.reverseDependencyGraph.get(serviceName) || new Set();

            dependencyCounts.set(serviceName, dependencies.size);
            dependentCounts.set(serviceName, dependents.size);
            totalDependencies += dependencies.size;
        }

        const servicesWithMostDependencies = Array.from(
            dependencyCounts.entries(),
        )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const servicesWithMostDependents = Array.from(dependentCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            totalServices: services.length,
            totalDependencies,
            averageDependenciesPerService:
                services.length > 0 ? totalDependencies / services.length : 0,
            servicesWithMostDependencies,
            servicesWithMostDependents,
        };
    }

    /**
     * Clears all registered services
     */
    clear(): void {
        this.logger.debug('Clearing all service dependencies');
        this.serviceDependencies.clear();
        this.dependencyGraph.clear();
        this.reverseDependencyGraph.clear();
    }
}
