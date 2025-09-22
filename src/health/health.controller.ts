import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

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

@Controller('health')
export class HealthController {
    constructor(
        private configService: ConfigService,
        private dataSource: DataSource,
    ) { }

    @Get()
    async getHealth(): Promise<HealthCheckResponse> {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
            // Check database connection
            const dbStartTime = Date.now();
            let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
            let dbResponseTime: number | undefined;

            try {
                await this.dataSource.query('SELECT 1');
                dbStatus = 'connected';
                dbResponseTime = Date.now() - dbStartTime;
            } catch (error) {
                dbStatus = 'error';
                dbResponseTime = Date.now() - dbStartTime;
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
                version: this.configService.get<string>('npm_package_version') || '1.0.0',
                environment: this.configService.get<string>('NODE_ENV') || 'development',
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
            const errorResponse: HealthCheckResponse = {
                status: 'error',
                timestamp,
                uptime: process.uptime(),
                version: this.configService.get<string>('npm_package_version') || '1.0.0',
                environment: this.configService.get<string>('NODE_ENV') || 'development',
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

            if (dbResponseTime > 5000) { // 5 seconds timeout
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
            return {
                status: 'not ready',
                reason: 'Database connection failed',
                error: error.message,
            };
        }
    }

    @Get('live')
    async getLiveness(): Promise<{
        status: 'alive';
        timestamp: string;
        uptime: number;
        pid: number;
    }> {
        // Simple liveness check - just return OK if the process is running
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            pid: process.pid,
        };
    }

    @Get('detailed')
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
            const [dbStatus, services, memoryInfo, systemInfo] = await Promise.all([
                this.checkDatabaseHealth(),
                this.checkExternalServices(),
                this.getDetailedMemoryInfo(),
                this.getSystemInfo(),
            ]);

            const healthResponse = {
                status: (dbStatus.status === 'connected' ? 'ok' : 'error') as 'ok' | 'error',
                timestamp,
                uptime: process.uptime(),
                version: this.configService.get<string>('npm_package_version') || '1.0.0',
                environment: this.configService.get<string>('NODE_ENV') || 'development',
                responseTime: Date.now() - startTime,
                database: dbStatus,
                memory: memoryInfo,
                system: systemInfo,
                services,
                configuration: {
                    port: this.configService.get<number>('PORT') || 3001,
                    host: this.configService.get<string>('HOST') || '0.0.0.0',
                    nodeEnv: this.configService.get<string>('NODE_ENV') || 'development',
                    logLevel: this.configService.get<string>('LOG_LEVEL') || 'info',
                },
            };

            return healthResponse;
        } catch (error) {
            return {
                status: 'error' as const,
                timestamp,
                uptime: process.uptime(),
                version: this.configService.get<string>('npm_package_version') || '1.0.0',
                environment: this.configService.get<string>('NODE_ENV') || 'development',
                error: error.message,
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
            const result = await this.dataSource.query('SELECT 1 as health_check');
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
                    error: error.message,
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
        const services: any = {};

        // Check Solana RPC (mock for now)
        const solanaStartTime = Date.now();
        try {
            // In a real implementation, you would ping the Solana RPC
            services.solana = {
                status: 'ok',
                responseTime: Date.now() - solanaStartTime,
                lastCheck: new Date().toISOString(),
            };
        } catch (error) {
            services.solana = {
                status: 'error',
                responseTime: Date.now() - solanaStartTime,
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

    private getDetailedMemoryInfo(): any {
        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
        const usedMemory = memoryUsage.heapUsed;
        const freeMemory = totalMemory - usedMemory;

        return {
            heap: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100,
            },
            external: Math.round(memoryUsage.external / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            total: {
                used: Math.round(usedMemory / 1024 / 1024),
                free: Math.round(freeMemory / 1024 / 1024),
                total: Math.round(totalMemory / 1024 / 1024),
                percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
            },
        };
    }

    private getSystemInfo(): any {
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            pid: process.pid,
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
            loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
            totalMemory: Math.round(require('os').totalmem() / 1024 / 1024),
            freeMemory: Math.round(require('os').freemem() / 1024 / 1024),
        };
    }
}
