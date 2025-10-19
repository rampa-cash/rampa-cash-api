import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './services/cache.service';
import { DatabaseTransactionService } from './services/transaction.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { MonitoringController } from './controllers/monitoring.controller';
import { DatabaseMonitoringInterceptor } from './interceptors/database-monitoring.interceptor';

@Module({
    imports: [TypeOrmModule],
    controllers: [MonitoringController],
    providers: [
        CacheService,
        DatabaseTransactionService,
        PerformanceMonitoringService,
        DatabaseMonitoringInterceptor,
    ],
    exports: [
        CacheService,
        DatabaseTransactionService,
        PerformanceMonitoringService,
        DatabaseMonitoringInterceptor,
    ],
})
export class CommonModule {}
