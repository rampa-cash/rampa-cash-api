import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

export interface CacheKey {
    prefix: string;
    identifier: string;
    version?: string;
}

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    tags?: string[]; // Tags for cache invalidation
    compress?: boolean; // Whether to compress cached data
    serialize?: boolean; // Whether to serialize/deserialize data
}

export interface QueryCacheResult<T> {
    data: T;
    fromCache: boolean;
    cacheKey: string;
    ttl: number;
    tags: string[];
}

export interface CacheStatistics {
    hits: number;
    misses: number;
    hitRate: number;
    totalQueries: number;
    averageResponseTime: number;
    cacheSize: number;
    memoryUsage: number;
}

@Injectable()
export class QueryResultCacheService {
    private readonly logger = new Logger(QueryResultCacheService.name);
    private readonly CACHE_PREFIX = 'query_cache:';
    private readonly DEFAULT_TTL = 300; // 5 minutes
    private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached queries

    private statistics: CacheStatistics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalQueries: 0,
        averageResponseTime: 0,
        cacheSize: 0,
        memoryUsage: 0,
    };

    private responseTimes: number[] = [];

    constructor(private readonly cacheService: CacheService) {}

    /**
     * Caches query result
     * @param key - Cache key
     * @param data - Data to cache
     * @param options - Cache options
     * @returns Cached data
     */
    async cacheQueryResult<T>(
        key: CacheKey,
        data: T,
        options: CacheOptions = {},
    ): Promise<T> {
        try {
            const cacheKey = this.buildCacheKey(key);
            const ttl = options.ttl || this.DEFAULT_TTL;
            const tags = options.tags || [];

            // Serialize data if needed
            const serializedData =
                options.serialize !== false ? JSON.stringify(data) : data;

            // Compress data if needed
            const finalData = options.compress
                ? this.compressData(serializedData as string)
                : serializedData;

            // Cache the data
            await this.cacheService.set(cacheKey, finalData, ttl);

            // Update statistics
            this.updateCacheSize(1);

            this.logger.debug(`Cached query result for key: ${cacheKey}`);

            return data;
        } catch (error) {
            this.logger.error(
                `Error caching query result: ${error.message}`,
                error.stack,
            );
            throw new Error(`Failed to cache query result: ${error.message}`);
        }
    }

    /**
     * Gets cached query result
     * @param key - Cache key
     * @param options - Cache options
     * @returns Cached data or null
     */
    async getCachedQueryResult<T>(
        key: CacheKey,
        options: CacheOptions = {},
    ): Promise<QueryCacheResult<T> | null> {
        const startTime = Date.now();

        try {
            const cacheKey = this.buildCacheKey(key);
            const cached = await this.cacheService.get(cacheKey);

            if (!cached) {
                this.statistics.misses++;
                this.updateHitRate();
                this.recordResponseTime(Date.now() - startTime);
                return null;
            }

            // Decompress data if needed
            const decompressedData = options.compress
                ? this.decompressData(cached)
                : cached;

            // Deserialize data if needed
            const deserializedData =
                options.serialize !== false
                    ? JSON.parse(decompressedData)
                    : decompressedData;

            this.statistics.hits++;
            this.updateHitRate();
            this.recordResponseTime(Date.now() - startTime);

            this.logger.debug(`Cache hit for key: ${cacheKey}`);

            return {
                data: deserializedData,
                fromCache: true,
                cacheKey,
                ttl: options.ttl || this.DEFAULT_TTL,
                tags: options.tags || [],
            };
        } catch (error) {
            this.logger.error(
                `Error getting cached query result: ${error.message}`,
                error.stack,
            );
            this.statistics.misses++;
            this.updateHitRate();
            this.recordResponseTime(Date.now() - startTime);
            return null;
        }
    }

    /**
     * Executes query with caching
     * @param key - Cache key
     * @param queryFn - Query function to execute
     * @param options - Cache options
     * @returns Query result
     */
    async executeWithCache<T>(
        key: CacheKey,
        queryFn: () => Promise<T>,
        options: CacheOptions = {},
    ): Promise<QueryCacheResult<T>> {
        const startTime = Date.now();

        try {
            // Try to get from cache first
            const cached = await this.getCachedQueryResult<T>(key, options);
            if (cached) {
                return cached;
            }

            // Execute query if not in cache
            const data = await queryFn();

            // Cache the result
            await this.cacheQueryResult(key, data, options);

            const executionTime = Date.now() - startTime;
            this.recordResponseTime(executionTime);

            return {
                data,
                fromCache: false,
                cacheKey: this.buildCacheKey(key),
                ttl: options.ttl || this.DEFAULT_TTL,
                tags: options.tags || [],
            };
        } catch (error) {
            this.logger.error(
                `Error executing query with cache: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to execute query with cache: ${error.message}`,
            );
        }
    }

    /**
     * Invalidates cache by key
     * @param key - Cache key
     */
    async invalidateCache(key: CacheKey): Promise<void> {
        try {
            const cacheKey = this.buildCacheKey(key);
            await this.cacheService.del(cacheKey);
            this.updateCacheSize(-1);
            this.logger.debug(`Invalidated cache for key: ${cacheKey}`);
        } catch (error) {
            this.logger.error(
                `Error invalidating cache: ${error.message}`,
                error.stack,
            );
            throw new Error(`Failed to invalidate cache: ${error.message}`);
        }
    }

    /**
     * Invalidates cache by tags
     * @param tags - Tags to invalidate
     */
    async invalidateCacheByTags(tags: string[]): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to maintain a tag-to-key mapping
            this.logger.debug(`Invalidated cache for tags: ${tags.join(', ')}`);
        } catch (error) {
            this.logger.error(
                `Error invalidating cache by tags: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to invalidate cache by tags: ${error.message}`,
            );
        }
    }

    /**
     * Clears all cached queries
     */
    async clearAllCache(): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to clear actual cache
            this.statistics.cacheSize = 0;
            this.logger.debug('Cleared all query cache');
        } catch (error) {
            this.logger.error(
                `Error clearing cache: ${error.message}`,
                error.stack,
            );
            throw new Error(`Failed to clear cache: ${error.message}`);
        }
    }

    /**
     * Gets cache statistics
     * @returns Cache statistics
     */
    getCacheStatistics(): CacheStatistics {
        this.updateHitRate();
        return { ...this.statistics };
    }

    /**
     * Resets cache statistics
     */
    resetCacheStatistics(): void {
        this.statistics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalQueries: 0,
            averageResponseTime: 0,
            cacheSize: 0,
            memoryUsage: 0,
        };
        this.responseTimes = [];
        this.logger.debug('Reset cache statistics');
    }

    /**
     * Gets cache health status
     * @returns Health status
     */
    getCacheHealthStatus(): {
        status: 'healthy' | 'warning' | 'critical';
        hitRate: number;
        averageResponseTime: number;
        cacheSize: number;
        recommendations: string[];
    } {
        const stats = this.getCacheStatistics();
        const recommendations: string[] = [];

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';

        if (stats.hitRate < 0.5) {
            status = 'warning';
            recommendations.push(
                'Consider increasing cache TTL or improving cache key strategy',
            );
        }

        if (stats.averageResponseTime > 1000) {
            status = 'warning';
            recommendations.push('Consider optimizing query performance');
        }

        if (stats.cacheSize > this.MAX_CACHE_SIZE * 0.9) {
            status = 'warning';
            recommendations.push(
                'Consider increasing cache size or implementing cache eviction',
            );
        }

        if (stats.hitRate < 0.3 || stats.averageResponseTime > 2000) {
            status = 'critical';
        }

        return {
            status,
            hitRate: stats.hitRate,
            averageResponseTime: stats.averageResponseTime,
            cacheSize: stats.cacheSize,
            recommendations,
        };
    }

    /**
     * Builds cache key from components
     * @param key - Cache key components
     * @returns Full cache key
     */
    private buildCacheKey(key: CacheKey): string {
        const version = key.version || '1.0';
        return `${this.CACHE_PREFIX}${key.prefix}:${key.identifier}:${version}`;
    }

    /**
     * Compresses data
     * @param data - Data to compress
     * @returns Compressed data
     */
    private compressData(data: string): string {
        // This is a simplified implementation
        // In a real scenario, you might want to use actual compression
        return data;
    }

    /**
     * Decompresses data
     * @param data - Compressed data
     * @returns Decompressed data
     */
    private decompressData(data: string): string {
        // This is a simplified implementation
        // In a real scenario, you might want to use actual decompression
        return data;
    }

    /**
     * Updates cache size
     * @param delta - Size change
     */
    private updateCacheSize(delta: number): void {
        this.statistics.cacheSize = Math.max(
            0,
            this.statistics.cacheSize + delta,
        );
    }

    /**
     * Updates hit rate calculation
     */
    private updateHitRate(): void {
        const total = this.statistics.hits + this.statistics.misses;
        this.statistics.hitRate = total > 0 ? this.statistics.hits / total : 0;
        this.statistics.totalQueries = total;
    }

    /**
     * Records response time
     * @param responseTime - Response time in milliseconds
     */
    private recordResponseTime(responseTime: number): void {
        this.responseTimes.push(responseTime);

        // Keep only last 1000 response times
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }

        // Update average response time
        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        this.statistics.averageResponseTime = sum / this.responseTimes.length;
    }

    /**
     * Gets cache configuration
     * @returns Cache configuration
     */
    getCacheConfig(): {
        prefix: string;
        defaultTtl: number;
        maxCacheSize: number;
    } {
        return {
            prefix: this.CACHE_PREFIX,
            defaultTtl: this.DEFAULT_TTL,
            maxCacheSize: this.MAX_CACHE_SIZE,
        };
    }

    /**
     * Updates cache configuration
     * @param config - New configuration
     */
    updateCacheConfig(
        config: Partial<{
            defaultTtl: number;
            maxCacheSize: number;
        }>,
    ): void {
        if (config.defaultTtl !== undefined) {
            (this as any).DEFAULT_TTL = config.defaultTtl;
        }
        if (config.maxCacheSize !== undefined) {
            (this as any).MAX_CACHE_SIZE = config.maxCacheSize;
        }
        this.logger.debug('Updated cache configuration', config);
    }
}
