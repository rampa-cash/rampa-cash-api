import { Module } from '@nestjs/common';
import { DomainAccessControlService } from '../services/domain-access-control.service';
import { DomainContextService } from '../services/domain-context.service';
import { DomainBoundaryInterceptor } from '../interceptors/domain-boundary.interceptor';

/**
 * Domain Boundary Module
 *
 * @description Module that provides domain boundary enforcement services
 * and interceptors. This module helps maintain proper separation of concerns
 * and prevents unauthorized cross-domain operations.
 *
 * @example
 * ```typescript
 * // Import in your module
 * @Module({
 *   imports: [DomainBoundaryModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
    providers: [
        DomainAccessControlService,
        DomainContextService,
        DomainBoundaryInterceptor,
    ],
    exports: [
        DomainAccessControlService,
        DomainContextService,
        DomainBoundaryInterceptor,
    ],
})
export class DomainBoundaryModule {}
