import { Controller, Get, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Monitoring controller for performance metrics
 *
 * @description This controller provides endpoints to access database performance
 * metrics, health checks, and monitoring information. Useful for debugging
 * and performance optimization.
 */
@ApiTags('Monitoring')
@ApiBearerAuth('BearerAuth')
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
    constructor(
        private readonly performanceMonitoringService: PerformanceMonitoringService,
    ) {}

    /**
     * Get performance summary
     */
    @Get('performance')
    @ApiOperation({ summary: 'Get database performance summary' })
    @ApiResponse({
        status: 200,
        description: 'Performance summary retrieved successfully',
    })
    getPerformanceSummary() {
        return this.performanceMonitoringService.getPerformanceSummary();
    }

    /**
     * Get all query metrics
     */
    @Get('queries')
    @ApiOperation({ summary: 'Get all query performance metrics' })
    @ApiResponse({
        status: 200,
        description: 'Query metrics retrieved successfully',
    })
    getAllQueryMetrics() {
        const metrics = this.performanceMonitoringService.getAllMetrics();
        return {
            queries: Array.from(metrics.values()),
            totalQueries: metrics.size,
        };
    }

    /**
     * Get slow queries
     */
    @Get('queries/slow')
    @ApiOperation({ summary: 'Get slow queries' })
    @ApiResponse({
        status: 200,
        description: 'Slow queries retrieved successfully',
    })
    getSlowQueries() {
        return this.performanceMonitoringService.getSlowQueries();
    }

    /**
     * Get queries with errors
     */
    @Get('queries/errors')
    @ApiOperation({ summary: 'Get queries with errors' })
    @ApiResponse({
        status: 200,
        description: 'Queries with errors retrieved successfully',
    })
    getQueriesWithErrors() {
        return this.performanceMonitoringService.getQueriesWithErrors();
    }

    /**
     * Get database health check
     */
    @Get('health')
    @ApiOperation({ summary: 'Get database health check' })
    @ApiResponse({
        status: 200,
        description: 'Health check completed successfully',
    })
    getHealthCheck() {
        return this.performanceMonitoringService.getHealthCheck();
    }

    /**
     * Get database statistics
     */
    @Get('database')
    @ApiOperation({ summary: 'Get database statistics' })
    @ApiResponse({
        status: 200,
        description: 'Database statistics retrieved successfully',
    })
    getDatabaseStats() {
        return this.performanceMonitoringService.getDatabaseStats();
    }

    /**
     * Export metrics as JSON
     */
    @Get('export')
    @ApiOperation({ summary: 'Export performance metrics as JSON' })
    @ApiResponse({
        status: 200,
        description: 'Metrics exported successfully',
        type: 'application/json',
    })
    exportMetrics() {
        return this.performanceMonitoringService.exportMetrics();
    }

    /**
     * Reset performance metrics
     */
    @Get('reset')
    @ApiOperation({ summary: 'Reset performance metrics' })
    @ApiResponse({
        status: 200,
        description: 'Metrics reset successfully',
    })
    resetMetrics() {
        this.performanceMonitoringService.resetMetrics();
        return { message: 'Performance metrics reset successfully' };
    }
}
