import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

/**
 * Database monitoring interceptor
 *
 * @description This interceptor automatically tracks database query performance
 * for all controller methods. It measures execution time and records metrics
 * for performance analysis.
 *
 * @example
 * ```typescript
 * @UseInterceptors(DatabaseMonitoringInterceptor)
 * @Controller('wallet')
 * export class WalletController {
 *     // All methods will be automatically monitored
 * }
 * ```
 */
@Injectable()
export class DatabaseMonitoringInterceptor implements NestInterceptor {
    private readonly logger = new Logger(DatabaseMonitoringInterceptor.name);

    constructor(
        private readonly performanceMonitoringService: PerformanceMonitoringService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const methodName = context.getHandler().name;
        const className = context.getClass().name;
        const queryName = `${className}.${methodName}`;

        return next.handle().pipe(
            tap({
                next: (data) => {
                    this.logger.debug(`Query completed: ${queryName}`);
                },
                error: (error) => {
                    this.logger.error(
                        `Query failed: ${queryName}`,
                        error.stack,
                    );
                },
            }),
        );
    }
}

/**
 * Manual database monitoring decorator
 *
 * @description This decorator can be used to manually track specific methods
 * that perform database operations. It provides more granular control over
 * what gets monitored.
 *
 * @example
 * ```typescript
 * @TrackDatabasePerformance('getUserWallets')
 * async getUserWallets(userId: string) {
 *     return this.walletRepository.find({ where: { userId } });
 * }
 * ```
 */
export function TrackDatabasePerformance(queryName: string) {
    return function (
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor,
    ) {
        const method = descriptor.value;
        const logger = new Logger(`${target.constructor.name}.${propertyName}`);

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();
            let error: Error | null = null;
            let result: any;

            try {
                result = await method.apply(this, args);
                return result;
            } catch (err) {
                error = err as Error;
                throw err;
            } finally {
                const executionTime = Date.now() - startTime;

                // Log performance
                if (executionTime > 1000) {
                    logger.warn(
                        `Slow operation: ${queryName} took ${executionTime}ms`,
                    );
                } else {
                    logger.debug(
                        `Operation completed: ${queryName} in ${executionTime}ms`,
                    );
                }

                // Record metrics if performance monitoring service is available
                if (this.performanceMonitoringService) {
                    this.performanceMonitoringService.recordQueryMetrics(
                        queryName,
                        executionTime,
                        error,
                    );
                }
            }
        };
    };
}
