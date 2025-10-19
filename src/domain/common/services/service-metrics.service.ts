import { Injectable, Logger } from '@nestjs/common';

/**
 * Service metric types
 */
export enum MetricType {
    COUNTER = 'counter',
    GAUGE = 'gauge',
    HISTOGRAM = 'histogram',
    TIMER = 'timer',
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
    /**
     * Metric name
     */
    name: string;

    /**
     * Metric value
     */
    value: number;

    /**
     * Metric type
     */
    type: MetricType;

    /**
     * Labels/tags
     */
    labels?: Record<string, string>;

    /**
     * Timestamp
     */
    timestamp: Date;
}

/**
 * Service metrics configuration
 */
export interface ServiceMetricsConfig {
    /**
     * Service name
     */
    serviceName: string;

    /**
     * Whether metrics collection is enabled
     */
    enabled: boolean;

    /**
     * Metrics retention period in milliseconds
     */
    retentionPeriod?: number;

    /**
     * Maximum number of data points to keep
     */
    maxDataPoints?: number;

    /**
     * Metrics aggregation interval in milliseconds
     */
    aggregationInterval?: number;
}

/**
 * Service performance metrics
 */
export interface ServicePerformanceMetrics {
    /**
     * Service name
     */
    serviceName: string;

    /**
     * Total requests
     */
    totalRequests: number;

    /**
     * Successful requests
     */
    successfulRequests: number;

    /**
     * Failed requests
     */
    failedRequests: number;

    /**
     * Average response time in milliseconds
     */
    averageResponseTime: number;

    /**
     * Minimum response time in milliseconds
     */
    minResponseTime: number;

    /**
     * Maximum response time in milliseconds
     */
    maxResponseTime: number;

    /**
     * Requests per second
     */
    requestsPerSecond: number;

    /**
     * Error rate (percentage)
     */
    errorRate: number;

    /**
     * Last updated timestamp
     */
    lastUpdated: Date;
}

/**
 * Service Metrics Service
 *
 * @description Service that collects and manages metrics for domain services.
 * This service provides comprehensive monitoring capabilities including
 * performance metrics, error tracking, and custom metrics collection.
 *
 * @example
 * ```typescript
 * // Record a metric
 * serviceMetrics.recordMetric('wallet-service', 'request_count', 1, MetricType.COUNTER);
 *
 * // Record response time
 * serviceMetrics.recordResponseTime('wallet-service', 'get_balance', 150);
 *
 * // Get performance metrics
 * const metrics = serviceMetrics.getPerformanceMetrics('wallet-service');
 * ```
 */
@Injectable()
export class ServiceMetricsService {
    private readonly logger = new Logger(ServiceMetricsService.name);
    private readonly metrics = new Map<string, MetricDataPoint[]>();
    private readonly serviceConfigs = new Map<string, ServiceMetricsConfig>();
    private readonly performanceMetrics = new Map<
        string,
        ServicePerformanceMetrics
    >();
    private readonly aggregationIntervals = new Map<string, NodeJS.Timeout>();

    constructor() {
        // Start cleanup interval
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60000); // Clean up every minute
    }

    /**
     * Configures metrics collection for a service
     * @param config - Service metrics configuration
     */
    configureService(config: ServiceMetricsConfig): void {
        this.logger.debug(
            `Configuring metrics for service: ${config.serviceName}`,
        );

        this.serviceConfigs.set(config.serviceName, config);

        // Initialize performance metrics
        this.performanceMetrics.set(config.serviceName, {
            serviceName: config.serviceName,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Number.MAX_SAFE_INTEGER,
            maxResponseTime: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            lastUpdated: new Date(),
        });

        // Start aggregation if configured
        if (config.aggregationInterval) {
            this.startAggregation(config.serviceName);
        }

        this.logger.log(
            `Metrics configured for service: ${config.serviceName}`,
        );
    }

    /**
     * Records a metric for a service
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @param value - Metric value
     * @param type - Metric type
     * @param labels - Optional labels
     */
    recordMetric(
        serviceName: string,
        metricName: string,
        value: number,
        type: MetricType,
        labels?: Record<string, string>,
    ): void {
        const config = this.serviceConfigs.get(serviceName);
        if (!config || !config.enabled) {
            return;
        }

        const dataPoint: MetricDataPoint = {
            name: metricName,
            value,
            type,
            labels,
            timestamp: new Date(),
        };

        const key = `${serviceName}:${metricName}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }

        this.metrics.get(key)!.push(dataPoint);

        // Update performance metrics if it's a request metric
        if (metricName.includes('request') || metricName.includes('response')) {
            this.updatePerformanceMetrics(serviceName, metricName, value);
        }
    }

    /**
     * Records a counter metric
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @param value - Counter value (default: 1)
     * @param labels - Optional labels
     */
    recordCounter(
        serviceName: string,
        metricName: string,
        value: number = 1,
        labels?: Record<string, string>,
    ): void {
        this.recordMetric(
            serviceName,
            metricName,
            value,
            MetricType.COUNTER,
            labels,
        );
    }

    /**
     * Records a gauge metric
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @param value - Gauge value
     * @param labels - Optional labels
     */
    recordGauge(
        serviceName: string,
        metricName: string,
        value: number,
        labels?: Record<string, string>,
    ): void {
        this.recordMetric(
            serviceName,
            metricName,
            value,
            MetricType.GAUGE,
            labels,
        );
    }

    /**
     * Records a histogram metric
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @param value - Histogram value
     * @param labels - Optional labels
     */
    recordHistogram(
        serviceName: string,
        metricName: string,
        value: number,
        labels?: Record<string, string>,
    ): void {
        this.recordMetric(
            serviceName,
            metricName,
            value,
            MetricType.HISTOGRAM,
            labels,
        );
    }

    /**
     * Records response time for a service operation
     * @param serviceName - Service name
     * @param operation - Operation name
     * @param responseTime - Response time in milliseconds
     * @param success - Whether the operation was successful
     */
    recordResponseTime(
        serviceName: string,
        operation: string,
        responseTime: number,
        success: boolean = true,
    ): void {
        this.recordHistogram(
            serviceName,
            `${operation}_response_time`,
            responseTime,
            {
                operation,
                success: success.toString(),
            },
        );

        this.recordCounter(serviceName, `${operation}_requests`, 1, {
            operation,
            success: success.toString(),
        });
    }

    /**
     * Records an error for a service
     * @param serviceName - Service name
     * @param operation - Operation name
     * @param errorType - Error type
     * @param errorMessage - Error message
     */
    recordError(
        serviceName: string,
        operation: string,
        errorType: string,
        errorMessage: string,
    ): void {
        this.recordCounter(serviceName, 'errors', 1, {
            operation,
            errorType,
            errorMessage: errorMessage.substring(0, 100), // Truncate long messages
        });
    }

    /**
     * Updates performance metrics for a service
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @param value - Metric value
     */
    private updatePerformanceMetrics(
        serviceName: string,
        metricName: string,
        value: number,
    ): void {
        const metrics = this.performanceMetrics.get(serviceName);
        if (!metrics) {
            return;
        }

        if (metricName.includes('request')) {
            metrics.totalRequests++;
            if (metricName.includes('success')) {
                metrics.successfulRequests++;
            } else if (
                metricName.includes('error') ||
                metricName.includes('failed')
            ) {
                metrics.failedRequests++;
            }
        } else if (metricName.includes('response_time')) {
            metrics.averageResponseTime =
                this.calculateAverageResponseTime(serviceName);
            metrics.minResponseTime = Math.min(metrics.minResponseTime, value);
            metrics.maxResponseTime = Math.max(metrics.maxResponseTime, value);
        }

        metrics.errorRate =
            metrics.totalRequests > 0
                ? (metrics.failedRequests / metrics.totalRequests) * 100
                : 0;

        metrics.requestsPerSecond =
            this.calculateRequestsPerSecond(serviceName);
        metrics.lastUpdated = new Date();
    }

    /**
     * Calculates average response time for a service
     * @param serviceName - Service name
     * @returns Average response time
     */
    private calculateAverageResponseTime(serviceName: string): number {
        const responseTimeKey = `${serviceName}:response_time`;
        const dataPoints = this.metrics.get(responseTimeKey) || [];

        if (dataPoints.length === 0) {
            return 0;
        }

        const sum = dataPoints.reduce((acc, dp) => acc + dp.value, 0);
        return sum / dataPoints.length;
    }

    /**
     * Calculates requests per second for a service
     * @param serviceName - Service name
     * @returns Requests per second
     */
    private calculateRequestsPerSecond(serviceName: string): number {
        const requestKey = `${serviceName}:requests`;
        const dataPoints = this.metrics.get(requestKey) || [];

        if (dataPoints.length === 0) {
            return 0;
        }

        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);

        const recentRequests = dataPoints.filter(
            (dp) => dp.timestamp >= oneSecondAgo,
        );
        return recentRequests.length;
    }

    /**
     * Gets performance metrics for a service
     * @param serviceName - Service name
     * @returns Performance metrics
     */
    getPerformanceMetrics(
        serviceName: string,
    ): ServicePerformanceMetrics | undefined {
        return this.performanceMetrics.get(serviceName);
    }

    /**
     * Gets all performance metrics
     * @returns Array of performance metrics
     */
    getAllPerformanceMetrics(): ServicePerformanceMetrics[] {
        return Array.from(this.performanceMetrics.values());
    }

    /**
     * Gets metrics for a specific service and metric name
     * @param serviceName - Service name
     * @param metricName - Metric name
     * @returns Array of metric data points
     */
    getMetrics(serviceName: string, metricName: string): MetricDataPoint[] {
        const key = `${serviceName}:${metricName}`;
        return this.metrics.get(key) || [];
    }

    /**
     * Gets all metrics for a service
     * @param serviceName - Service name
     * @returns Map of metric names to data points
     */
    getServiceMetrics(serviceName: string): Map<string, MetricDataPoint[]> {
        const serviceMetrics = new Map<string, MetricDataPoint[]>();

        for (const [key, dataPoints] of this.metrics.entries()) {
            if (key.startsWith(`${serviceName}:`)) {
                const metricName = key.substring(serviceName.length + 1);
                serviceMetrics.set(metricName, dataPoints);
            }
        }

        return serviceMetrics;
    }

    /**
     * Gets metrics summary for all services
     * @returns Metrics summary
     */
    getMetricsSummary(): {
        totalServices: number;
        totalMetrics: number;
        totalDataPoints: number;
        servicesWithMetrics: string[];
    } {
        const services = new Set<string>();
        let totalMetrics = 0;
        let totalDataPoints = 0;

        for (const [key, dataPoints] of this.metrics.entries()) {
            const [serviceName] = key.split(':');
            services.add(serviceName);
            totalMetrics++;
            totalDataPoints += dataPoints.length;
        }

        return {
            totalServices: services.size,
            totalMetrics,
            totalDataPoints,
            servicesWithMetrics: Array.from(services),
        };
    }

    /**
     * Starts metrics aggregation for a service
     * @param serviceName - Service name
     */
    private startAggregation(serviceName: string): void {
        const config = this.serviceConfigs.get(serviceName);
        if (!config || !config.aggregationInterval) {
            return;
        }

        const interval = setInterval(() => {
            this.aggregateMetrics(serviceName);
        }, config.aggregationInterval);

        this.aggregationIntervals.set(serviceName, interval);
    }

    /**
     * Aggregates metrics for a service
     * @param serviceName - Service name
     */
    private aggregateMetrics(serviceName: string): void {
        // This is a placeholder for more complex aggregation logic
        // In a real implementation, you might want to aggregate metrics
        // into time buckets, calculate percentiles, etc.
        this.logger.debug(`Aggregating metrics for service: ${serviceName}`);
    }

    /**
     * Cleans up old metrics based on retention period
     */
    private cleanupOldMetrics(): void {
        const now = new Date();

        for (const [key, dataPoints] of this.metrics.entries()) {
            const [serviceName] = key.split(':');
            const config = this.serviceConfigs.get(serviceName);
            const retentionPeriod = config?.retentionPeriod || 3600000; // 1 hour default
            const cutoffTime = new Date(now.getTime() - retentionPeriod);

            const filteredDataPoints = dataPoints.filter(
                (dp) => dp.timestamp >= cutoffTime,
            );

            if (filteredDataPoints.length !== dataPoints.length) {
                this.metrics.set(key, filteredDataPoints);
                this.logger.debug(`Cleaned up old metrics for: ${key}`);
            }
        }
    }

    /**
     * Clears all metrics for a service
     * @param serviceName - Service name
     */
    clearServiceMetrics(serviceName: string): void {
        this.logger.debug(`Clearing metrics for service: ${serviceName}`);

        // Remove all metrics for the service
        for (const key of this.metrics.keys()) {
            if (key.startsWith(`${serviceName}:`)) {
                this.metrics.delete(key);
            }
        }

        // Reset performance metrics
        this.performanceMetrics.delete(serviceName);

        this.logger.log(`Metrics cleared for service: ${serviceName}`);
    }

    /**
     * Clears all metrics
     */
    clearAllMetrics(): void {
        this.logger.debug('Clearing all metrics');

        this.metrics.clear();
        this.performanceMetrics.clear();

        // Stop all aggregation intervals
        for (const interval of this.aggregationIntervals.values()) {
            clearInterval(interval);
        }
        this.aggregationIntervals.clear();

        this.logger.log('All metrics cleared');
    }
}
