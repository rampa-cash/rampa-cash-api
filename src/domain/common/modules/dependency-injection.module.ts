import { Module } from '@nestjs/common';
import { DomainServiceFactory } from '../factories/domain-service.factory';
import { ServiceLocatorService } from '../services/service-locator.service';
import { ServiceDependencyValidatorService } from '../services/service-dependency-validator.service';
import { ServiceHealthCheckService } from '../services/service-health-check.service';
import { ServiceMetricsService } from '../services/service-metrics.service';

/**
 * Dependency Injection Module
 *
 * @description Module that provides advanced dependency injection services
 * including service factories, service locators, dependency validation,
 * health checks, and metrics collection.
 *
 * @example
 * ```typescript
 * // Import in your module
 * @Module({
 *   imports: [DependencyInjectionModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
    providers: [
        DomainServiceFactory,
        ServiceLocatorService,
        ServiceDependencyValidatorService,
        ServiceHealthCheckService,
        ServiceMetricsService,
    ],
    exports: [
        DomainServiceFactory,
        ServiceLocatorService,
        ServiceDependencyValidatorService,
        ServiceHealthCheckService,
        ServiceMetricsService,
    ],
})
export class DependencyInjectionModule {}
