import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SolanaHealthService } from '../domain/solana/services/solana-health.service';

export interface HealthCheckResponse {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    database: {
        status: 'connected' | 'disconnected' | 'error';
        responseTime?: number;
    };
    memory: {
        used: number;
        free: number;
        total: number;
        percentage: number;
    };
    system: {
        platform: string;
        arch: string;
        nodeVersion: string;
        pid: number;
    };
    services: {
        [key: string]: {
            status: 'ok' | 'error';
            responseTime?: number;
            lastCheck?: string;
        };
    };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private configService: ConfigService,
        private dataSource: DataSource,
        private solanaHealthService: SolanaHealthService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get application health status' })
    @ApiResponse({
        status: 200,
        description: 'Health status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['ok', 'error'] },
                timestamp: { type: 'string', format: 'date-time' },
                uptime: { type: 'number' },
                version: { type: 'string' },
                environment: { type: 'string' },
                database: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['connected', 'disconnected', 'error'],
                        },
                        responseTime: { type: 'number' },
                    },
                },
                memory: {
                    type: 'object',
                    properties: {
                        used: { type: 'number' },
                        free: { type: 'number' },
                        total: { type: 'number' },
                        percentage: { type: 'number' },
                    },
                },
                system: {
                    type: 'object',
                    properties: {
                        platform: { type: 'string' },
                        arch: { type: 'string' },
                        nodeVersion: { type: 'string' },
                        pid: { type: 'number' },
                    },
                },
                services: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', enum: ['ok', 'error'] },
                            responseTime: { type: 'number' },
                            lastCheck: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
    })
    async getHealth(): Promise<HealthCheckResponse> {
        // const startTime = Date.now(); // Unused variable
        const timestamp = new Date().toISOString();

        try {
            // Check database connection
            const dbStartTime = Date.now();
            let dbStatus: 'connected' | 'disconnected' | 'error' =
                'disconnected';
            let dbResponseTime: number | undefined;

            try {
                await this.dataSource.query('SELECT 1');
                dbStatus = 'connected';
                dbResponseTime = Date.now() - dbStartTime;
            } catch (error) {
                dbStatus = 'error';
                dbResponseTime = Date.now() - dbStartTime;
                // Error logged for debugging
                console.debug('Database health check failed:', error);
            }

            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
            const usedMemory = memoryUsage.heapUsed;
            const freeMemory = totalMemory - usedMemory;
            const memoryPercentage = (usedMemory / totalMemory) * 100;

            // Check external services (mock for now)
            const services = await this.checkExternalServices();

            const healthResponse: HealthCheckResponse = {
                status: dbStatus === 'connected' ? 'ok' : 'error',
                timestamp,
                uptime: process.uptime(),
                version:
                    this.configService.get<string>('npm_package_version') ||
                    '1.0.0',
                environment:
                    this.configService.get<string>('NODE_ENV') || 'development',
                database: {
                    status: dbStatus,
                    responseTime: dbResponseTime,
                },
                memory: {
                    used: Math.round(usedMemory / 1024 / 1024), // MB
                    free: Math.round(freeMemory / 1024 / 1024), // MB
                    total: Math.round(totalMemory / 1024 / 1024), // MB
                    percentage: Math.round(memoryPercentage * 100) / 100,
                },
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    pid: process.pid,
                },
                services,
            };

            return healthResponse;
        } catch (error) {
            // Error logged for debugging
            console.debug('Health check failed:', error);
            const errorResponse: HealthCheckResponse = {
                status: 'error',
                timestamp,
                uptime: process.uptime(),
                version:
                    this.configService.get<string>('npm_package_version') ||
                    '1.0.0',
                environment:
                    this.configService.get<string>('NODE_ENV') || 'development',
                database: {
                    status: 'error',
                },
                memory: {
                    used: 0,
                    free: 0,
                    total: 0,
                    percentage: 0,
                },
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    pid: process.pid,
                },
                services: {},
            };

            return errorResponse;
        }
    }

    @Get('ready')
    @ApiOperation({ summary: 'Get application readiness status' })
    @ApiResponse({ status: 200, description: 'Readiness status retrieved' })
    async getReadiness(): Promise<{
        status: 'ready' | 'not ready';
        timestamp?: string;
        databaseResponseTime?: number;
        reason?: string;
        error?: string;
    }> {
        try {
            // Check if the application is ready to serve traffic
            const dbStartTime = Date.now();
            await this.dataSource.query('SELECT 1');
            const dbResponseTime = Date.now() - dbStartTime;

            if (dbResponseTime > 5000) {
                // 5 seconds timeout
                return {
                    status: 'not ready',
                    reason: 'Database response time too high',
                    databaseResponseTime: dbResponseTime,
                };
            }

            return {
                status: 'ready',
                timestamp: new Date().toISOString(),
                databaseResponseTime: dbResponseTime,
            };
        } catch (error) {
            // Error logged for debugging
            console.debug('Readiness check failed:', error);
            return {
                status: 'not ready',
                reason: 'Database connection failed',
                error: (error as Error).message,
            };
        }
    }

    @Get('live')
    @ApiOperation({ summary: 'Get application liveness status' })
    @ApiResponse({ status: 200, description: 'Liveness status retrieved' })
    getLiveness(): {
        status: 'alive';
        timestamp: string;
        uptime: number;
        pid: number;
    } {
        // Simple liveness check - just return OK if the process is running
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            pid: process.pid,
        };
    }

    @Get('detailed')
    @ApiOperation({ summary: 'Get detailed application health information' })
    @ApiResponse({
        status: 200,
        description: 'Detailed health information retrieved',
    })
    async getDetailedHealth(): Promise<{
        status: 'ok' | 'error';
        timestamp: string;
        uptime: number;
        version: string;
        environment: string;
        responseTime?: number;
        database?: any;
        memory?: any;
        system?: any;
        services?: any;
        configuration?: any;
        error?: string;
    }> {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
            // Comprehensive health check
            const [dbStatus, services, memoryInfo, systemInfo] =
                await Promise.all([
                    this.checkDatabaseHealth(),
                    await this.checkExternalServices(),
                    this.getDetailedMemoryInfo(),
                    this.getSystemInfo(),
                ]);

            const status: 'ok' | 'error' =
                dbStatus.status === 'connected' ? 'ok' : 'error';
            const healthResponse = {
                status,
                timestamp,
                uptime: process.uptime(),
                version:
                    this.configService.get<string>('npm_package_version') ||
                    '1.0.0',
                environment:
                    this.configService.get<string>('NODE_ENV') || 'development',
                responseTime: Date.now() - startTime,
                database: dbStatus as any,
                memory: memoryInfo as any,
                system: systemInfo as any,
                services,
                configuration: {
                    port: this.configService.get<number>('PORT') || 3001,
                    host: this.configService.get<string>('HOST') || '0.0.0.0',
                    nodeEnv:
                        this.configService.get<string>('NODE_ENV') ||
                        'development',
                    logLevel:
                        this.configService.get<string>('LOG_LEVEL') || 'info',
                },
            };

            return healthResponse;
        } catch (error) {
            // Error logged for debugging
            console.debug('Detailed health check failed:', error);
            return {
                status: 'error' as const,
                timestamp,
                uptime: process.uptime(),
                version:
                    this.configService.get<string>('npm_package_version') ||
                    '1.0.0',
                environment:
                    this.configService.get<string>('NODE_ENV') || 'development',
                error: (error as Error).message,
            };
        }
    }

    private async checkDatabaseHealth(): Promise<{
        status: 'connected' | 'disconnected' | 'error';
        responseTime?: number;
        details?: any;
    }> {
        const startTime = Date.now();

        try {
            const result = await this.dataSource.query(
                'SELECT 1 as health_check',
            );
            const responseTime = Date.now() - startTime;

            return {
                status: 'connected',
                responseTime,
                details: {
                    query: 'SELECT 1',
                    result: result[0],
                },
            };
        } catch (error) {
            return {
                status: 'error',
                responseTime: Date.now() - startTime,
                details: {
                    error: (error as Error).message,
                    code: error.code,
                },
            };
        }
    }

    private async checkExternalServices(): Promise<{
        [key: string]: {
            status: 'ok' | 'error';
            responseTime?: number;
            lastCheck?: string;
        };
    }> {
        const services: Record<
            string,
            {
                status: 'ok' | 'error';
                responseTime?: number;
                lastCheck?: string;
            }
        > = {};

        // Check Solana RPC
        try {
            const solanaHealth = await this.solanaHealthService.getHealthStatus();
            services.solana = {
                status: solanaHealth.isHealthy ? 'ok' : 'error',
                responseTime: solanaHealth.responseTime,
                lastCheck: solanaHealth.lastChecked.toISOString(),
            };
        } catch (error) {
            console.debug('Solana service check failed:', error);
            services.solana = {
                status: 'error',
                responseTime: 0,
                lastCheck: new Date().toISOString(),
            };
        }

        // Check Web3Auth (mock for now)
        services.web3auth = {
            status: 'ok',
            lastCheck: new Date().toISOString(),
        };

        return services;
    }

    private getDetailedMemoryInfo(): Record<string, any> {
        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
        const usedMemory = memoryUsage.heapUsed;
        const freeMemory = totalMemory - usedMemory;

        return {
            heap: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                percentage:
                    Math.round(
                        (memoryUsage.heapUsed / memoryUsage.heapTotal) *
                            100 *
                            100,
                    ) / 100,
            },
            external: Math.round(memoryUsage.external / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            total: {
                used: Math.round(usedMemory / 1024 / 1024),
                free: Math.round(freeMemory / 1024 / 1024),
                total: Math.round(totalMemory / 1024 / 1024),
                percentage:
                    Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
            },
        };
    }

    private getSystemInfo(): Record<string, any> {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid,
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
            loadAverage:
                process.platform !== 'win32' ? require('os').loadavg() : null,
            totalMemory: Math.round(require('os').totalmem() / 1024 / 1024),
            freeMemory: Math.round(require('os').freemem() / 1024 / 1024),
        };
    }
}
