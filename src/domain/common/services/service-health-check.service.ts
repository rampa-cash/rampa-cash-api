import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

/**
 * Health check result
 */
export interface HealthCheckResult {
    /**
     * Service name
     */
    serviceName: string;

    /**
     * Whether the service is healthy
     */
    isHealthy: boolean;

    /**
     * Health check status
     */
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

    /**
     * Response time in milliseconds
     */
    responseTime: number;

    /**
     * Error message if unhealthy
     */
    error?: string;

    /**
     * Additional health information
     */
    details?: Record<string, any>;

    /**
     * Timestamp of the health check
     */
    timestamp: Date;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
    /**
     * Service name
     */
    name: string;

    /**
     * Service type
     */
    type: Type<any>;

    /**
     * Health check function
     */
    healthCheck: (service: any) => Promise<boolean> | boolean;

    /**
     * Health check timeout in milliseconds
     */
    timeout?: number;

    /**
     * Health check interval in milliseconds
     */
    interval?: number;

    /**
     * Whether to run health checks automatically
     */
    autoCheck?: boolean;

    /**
     * Custom health check details function
     */
    getDetails?: (
        service: any,
    ) => Promise<Record<string, any>> | Record<string, any>;
}

/**
 * Service Health Check Service
 *
 * @description Service that performs health checks on domain services.
 * This service helps monitor the health and availability of services
 * and provides detailed health information for monitoring and alerting.
 *
 * @example
 * ```typescript
 * // Register a health check
 * serviceHealthCheck.registerHealthCheck({
 *   name: 'wallet-service',
 *   type: WalletService,
 *   healthCheck: async (service) => {
 *     return await service.isHealthy();
 *   },
 *   timeout: 5000,
 *   autoCheck: true
 * });
 *
 * // Get health status
 * const health = await serviceHealthCheck.getHealthStatus('wallet-service');
 * ```
 */
@Injectable()
export class ServiceHealthCheckService {
    private readonly logger = new Logger(ServiceHealthCheckService.name);
    private readonly healthCheckConfigs = new Map<string, HealthCheckConfig>();
    private readonly healthCheckResults = new Map<string, HealthCheckResult>();
    private readonly healthCheckIntervals = new Map<string, NodeJS.Timeout>();

    constructor(private readonly moduleRef: ModuleRef) {}

    /**
     * Registers a health check for a service
     * @param config - Health check configuration
     */
    registerHealthCheck(config: HealthCheckConfig): void {
        this.logger.debug(`Registering health check: ${config.name}`);

        this.healthCheckConfigs.set(config.name, config);

        // Start automatic health checking if enabled
        if (config.autoCheck && config.interval) {
            this.startAutomaticHealthCheck(config.name);
        }

        this.logger.log(`Health check registered: ${config.name}`);
    }

    /**
     * Performs a health check for a specific service
     * @param serviceName - Service name
     * @returns Health check result
     */
    async checkHealth(serviceName: string): Promise<HealthCheckResult> {
        this.logger.debug(`Performing health check: ${serviceName}`);

        const config = this.healthCheckConfigs.get(serviceName);
        if (!config) {
            return {
                serviceName,
                isHealthy: false,
                status: 'unknown',
                responseTime: 0,
                error: `Health check not configured for service: ${serviceName}`,
                timestamp: new Date(),
            };
        }

        const startTime = Date.now();
        let isHealthy = false;
        let error: string | undefined;
        let details: Record<string, any> | undefined;

        try {
            // Resolve the service
            const service = this.moduleRef.get(config.type, { strict: false });

            // Perform health check with timeout
            const healthCheckPromise = this.performHealthCheck(service, config);
            const timeoutPromise = this.createTimeoutPromise(
                config.timeout || 5000,
            );

            const result = await Promise.race([
                healthCheckPromise,
                timeoutPromise,
            ]);
            isHealthy = result;

            // Get additional details if configured
            if (config.getDetails) {
                details = await config.getDetails(service);
            }
        } catch (err) {
            error = err.message;
            this.logger.warn(
                `Health check failed for ${serviceName}: ${error}`,
            );
        }

        const responseTime = Date.now() - startTime;
        const status = this.determineHealthStatus(
            isHealthy,
            responseTime,
            config.timeout || 5000,
        );

        const result: HealthCheckResult = {
            serviceName,
            isHealthy,
            status,
            responseTime,
            error,
            details,
            timestamp: new Date(),
        };

        // Store the result
        this.healthCheckResults.set(serviceName, result);

        this.logger.debug(
            `Health check completed: ${serviceName} - ${status} (${responseTime}ms)`,
        );
        return result;
    }

    /**
     * Performs health check on a service
     * @param service - Service instance
     * @param config - Health check configuration
     * @returns Health check result
     */
    private async performHealthCheck(
        service: any,
        config: HealthCheckConfig,
    ): Promise<boolean> {
        try {
            const result = config.healthCheck(service);

            if (result instanceof Promise) {
                return await result;
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Health check function failed for ${config.name}:`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Creates a timeout promise
     * @param timeout - Timeout in milliseconds
     * @returns Promise that rejects after timeout
     */
    private createTimeoutPromise(timeout: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Health check timeout after ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Determines health status based on check result and response time
     * @param isHealthy - Whether the service is healthy
     * @param responseTime - Response time in milliseconds
     * @param timeout - Timeout threshold
     * @returns Health status
     */
    private determineHealthStatus(
        isHealthy: boolean,
        responseTime: number,
        timeout: number,
    ): 'healthy' | 'unhealthy' | 'degraded' | 'unknown' {
        if (!isHealthy) {
            return 'unhealthy';
        }

        if (responseTime > timeout * 0.8) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * Gets health status for a specific service
     * @param serviceName - Service name
     * @returns Health check result or undefined
     */
    getHealthStatus(serviceName: string): HealthCheckResult | undefined {
        return this.healthCheckResults.get(serviceName);
    }

    /**
     * Gets health status for all services
     * @returns Array of health check results
     */
    getAllHealthStatuses(): HealthCheckResult[] {
        return Array.from(this.healthCheckResults.values());
    }

    /**
     * Gets healthy services
     * @returns Array of healthy service names
     */
    getHealthyServices(): string[] {
        return Array.from(this.healthCheckResults.entries())
            .filter(([_, result]) => result.isHealthy)
            .map(([name, _]) => name);
    }

    /**
     * Gets unhealthy services
     * @returns Array of unhealthy service names
     */
    getUnhealthyServices(): string[] {
        return Array.from(this.healthCheckResults.entries())
            .filter(([_, result]) => !result.isHealthy)
            .map(([name, _]) => name);
    }

    /**
     * Gets degraded services
     * @returns Array of degraded service names
     */
    getDegradedServices(): string[] {
        return Array.from(this.healthCheckResults.entries())
            .filter(([_, result]) => result.status === 'degraded')
            .map(([name, _]) => name);
    }

    /**
     * Starts automatic health checking for a service
     * @param serviceName - Service name
     */
    private startAutomaticHealthCheck(serviceName: string): void {
        const config = this.healthCheckConfigs.get(serviceName);
        if (!config || !config.interval) {
            return;
        }

        const interval = setInterval(async () => {
            await this.checkHealth(serviceName);
        }, config.interval);

        this.healthCheckIntervals.set(serviceName, interval);
        this.logger.log(
            `Started automatic health checking for: ${serviceName}`,
        );
    }

    /**
     * Stops automatic health checking for a service
     * @param serviceName - Service name
     */
    stopAutomaticHealthCheck(serviceName: string): void {
        const interval = this.healthCheckIntervals.get(serviceName);
        if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(serviceName);
            this.logger.log(
                `Stopped automatic health checking for: ${serviceName}`,
            );
        }
    }

    /**
     * Stops all automatic health checks
     */
    stopAllAutomaticHealthChecks(): void {
        for (const [
            serviceName,
            interval,
        ] of this.healthCheckIntervals.entries()) {
            clearInterval(interval);
            this.logger.log(
                `Stopped automatic health checking for: ${serviceName}`,
            );
        }
        this.healthCheckIntervals.clear();
    }

    /**
     * Gets health check statistics
     * @returns Health check statistics
     */
    getHealthStatistics(): {
        totalServices: number;
        healthyServices: number;
        unhealthyServices: number;
        degradedServices: number;
        averageResponseTime: number;
        lastCheckTime: Date | null;
    } {
        const results = Array.from(this.healthCheckResults.values());
        const healthyCount = results.filter((r) => r.isHealthy).length;
        const unhealthyCount = results.filter((r) => !r.isHealthy).length;
        const degradedCount = results.filter(
            (r) => r.status === 'degraded',
        ).length;
        const averageResponseTime =
            results.length > 0
                ? results.reduce((sum, r) => sum + r.responseTime, 0) /
                  results.length
                : 0;
        const lastCheckTime =
            results.length > 0
                ? new Date(
                      Math.max(...results.map((r) => r.timestamp.getTime())),
                  )
                : null;

        return {
            totalServices: results.length,
            healthyServices: healthyCount,
            unhealthyServices: unhealthyCount,
            degradedServices: degradedCount,
            averageResponseTime,
            lastCheckTime,
        };
    }

    /**
     * Removes a health check configuration
     * @param serviceName - Service name
     */
    removeHealthCheck(serviceName: string): void {
        this.logger.debug(`Removing health check: ${serviceName}`);

        this.stopAutomaticHealthCheck(serviceName);
        this.healthCheckConfigs.delete(serviceName);
        this.healthCheckResults.delete(serviceName);

        this.logger.log(`Health check removed: ${serviceName}`);
    }

    /**
     * Clears all health check configurations and results
     */
    clearAll(): void {
        this.logger.debug('Clearing all health checks');

        this.stopAllAutomaticHealthChecks();
        this.healthCheckConfigs.clear();
        this.healthCheckResults.clear();

        this.logger.log('All health checks cleared');
    }
}
