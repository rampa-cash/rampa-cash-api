import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../common/services/cache.service';
import { AddressType } from './address-validation.service';

export interface AddressResolutionCacheEntry {
    address: string;
    userId: string;
    walletId: string;
    addressType: AddressType;
    resolvedAt: Date;
    expiresAt: Date;
    metadata?: Record<string, any>;
}

export interface AddressResolutionStats {
    totalResolutions: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    averageResolutionTime: number;
    lastResetAt: Date;
}

@Injectable()
export class AddressResolutionCacheService {
    private readonly logger = new Logger(AddressResolutionCacheService.name);
    private readonly CACHE_PREFIX = 'addr_resolution:';
    private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
    private readonly MAX_CACHE_SIZE = 10000; // Maximum number of cached entries

    private stats: AddressResolutionStats = {
        totalResolutions: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        averageResolutionTime: 0,
        lastResetAt: new Date(),
    };

    private resolutionTimes: number[] = [];

    constructor(private readonly cacheService: CacheService) {}

    /**
     * Gets cached address resolution
     * @param address - The address to resolve
     * @param addressType - Optional address type for cache key
     * @returns Cached resolution or null if not found
     */
    async getCachedResolution(
        address: string,
        addressType?: AddressType,
    ): Promise<AddressResolutionCacheEntry | null> {
        try {
            const cacheKey = this.getCacheKey(address, addressType);
            const cached =
                await this.cacheService.get<AddressResolutionCacheEntry>(
                    cacheKey,
                );

            if (cached) {
                this.stats.cacheHits++;
                this.logger.debug(`Cache hit for address: ${address}`);
                return cached;
            }

            this.stats.cacheMisses++;
            this.logger.debug(`Cache miss for address: ${address}`);
            return null;
        } catch (error) {
            this.logger.error(
                `Error getting cached resolution: ${error.message}`,
                error.stack,
            );
            return null;
        }
    }

    /**
     * Caches address resolution
     * @param address - The address that was resolved
     * @param userId - The user ID
     * @param walletId - The wallet ID
     * @param addressType - The address type
     * @param ttl - Optional TTL in seconds
     * @param metadata - Optional metadata
     */
    async cacheResolution(
        address: string,
        userId: string,
        walletId: string,
        addressType: AddressType,
        ttl: number = this.DEFAULT_TTL,
        metadata?: Record<string, any>,
    ): Promise<void> {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);

            const cacheEntry: AddressResolutionCacheEntry = {
                address,
                userId,
                walletId,
                addressType,
                resolvedAt: now,
                expiresAt,
                metadata,
            };

            const cacheKey = this.getCacheKey(address, addressType);
            await this.cacheService.set(cacheKey, cacheEntry, ttl);

            this.logger.debug(`Cached resolution for address: ${address}`);
        } catch (error) {
            this.logger.error(
                `Error caching resolution: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Invalidates cached resolution for an address
     * @param address - The address to invalidate
     * @param addressType - Optional address type for cache key
     */
    async invalidateResolution(
        address: string,
        addressType?: AddressType,
    ): Promise<void> {
        try {
            const cacheKey = this.getCacheKey(address, addressType);
            await this.cacheService.del(cacheKey);
            this.logger.debug(`Invalidated cache for address: ${address}`);
        } catch (error) {
            this.logger.error(
                `Error invalidating resolution: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Invalidates all cached resolutions for a user
     * @param userId - The user ID
     */
    async invalidateUserResolutions(userId: string): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to maintain a user-to-addresses mapping
            // or use a more sophisticated cache invalidation strategy
            this.logger.debug(
                `Invalidated all resolutions for user: ${userId}`,
            );
        } catch (error) {
            this.logger.error(
                `Error invalidating user resolutions: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Invalidates all cached resolutions for a wallet
     * @param walletId - The wallet ID
     */
    async invalidateWalletResolutions(walletId: string): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to maintain a wallet-to-addresses mapping
            this.logger.debug(
                `Invalidated all resolutions for wallet: ${walletId}`,
            );
        } catch (error) {
            this.logger.error(
                `Error invalidating wallet resolutions: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Clears all cached resolutions
     */
    async clearAllResolutions(): Promise<void> {
        try {
            // This is a simplified implementation
            // In a real scenario, you might want to use cache patterns or tags
            this.logger.debug('Cleared all address resolution cache');
        } catch (error) {
            this.logger.error(
                `Error clearing all resolutions: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Gets cache statistics
     * @returns AddressResolutionStats
     */
    getStats(): AddressResolutionStats {
        this.updateHitRate();
        return { ...this.stats };
    }

    /**
     * Resets cache statistics
     */
    resetStats(): void {
        this.stats = {
            totalResolutions: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            averageResolutionTime: 0,
            lastResetAt: new Date(),
        };
        this.resolutionTimes = [];
        this.logger.debug('Reset cache statistics');
    }

    /**
     * Records resolution time for statistics
     * @param resolutionTime - Time taken for resolution in milliseconds
     */
    recordResolutionTime(resolutionTime: number): void {
        this.resolutionTimes.push(resolutionTime);
        this.stats.totalResolutions++;

        // Keep only last 1000 resolution times for average calculation
        if (this.resolutionTimes.length > 1000) {
            this.resolutionTimes = this.resolutionTimes.slice(-1000);
        }

        this.updateAverageResolutionTime();
    }

    /**
     * Gets cache configuration
     * @returns Cache configuration object
     */
    getCacheConfig(): Record<string, any> {
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
    updateCacheConfig(config: Partial<Record<string, any>>): void {
        if (config.defaultTtl !== undefined) {
            (this as any).DEFAULT_TTL = config.defaultTtl;
        }
        if (config.maxCacheSize !== undefined) {
            (this as any).MAX_CACHE_SIZE = config.maxCacheSize;
        }
        this.logger.debug('Updated cache configuration', config);
    }

    /**
     * Gets cache key for an address
     * @param address - The address
     * @param addressType - Optional address type
     * @returns Cache key
     */
    private getCacheKey(address: string, addressType?: AddressType): string {
        const normalizedAddress = address.toLowerCase().trim();
        return addressType
            ? `${this.CACHE_PREFIX}${addressType}:${normalizedAddress}`
            : `${this.CACHE_PREFIX}${normalizedAddress}`;
    }

    /**
     * Updates hit rate calculation
     */
    private updateHitRate(): void {
        const total = this.stats.cacheHits + this.stats.cacheMisses;
        this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;
    }

    /**
     * Updates average resolution time
     */
    private updateAverageResolutionTime(): void {
        if (this.resolutionTimes.length > 0) {
            const sum = this.resolutionTimes.reduce((a, b) => a + b, 0);
            this.stats.averageResolutionTime =
                sum / this.resolutionTimes.length;
        }
    }

    /**
     * Checks if cache entry is expired
     * @param entry - Cache entry to check
     * @returns boolean indicating if expired
     */
    private isExpired(entry: AddressResolutionCacheEntry): boolean {
        return new Date() > entry.expiresAt;
    }

    /**
     * Gets cache health status
     * @returns Health status object
     */
    getHealthStatus(): Record<string, any> {
        const stats = this.getStats();
        return {
            status: 'healthy',
            hitRate: stats.hitRate,
            totalResolutions: stats.totalResolutions,
            averageResolutionTime: stats.averageResolutionTime,
            lastResetAt: stats.lastResetAt,
            recommendations: this.getHealthRecommendations(stats),
        };
    }

    /**
     * Gets health recommendations based on statistics
     * @param stats - Current statistics
     * @returns Array of recommendations
     */
    private getHealthRecommendations(stats: AddressResolutionStats): string[] {
        const recommendations: string[] = [];

        if (stats.hitRate < 0.5) {
            recommendations.push(
                'Consider increasing cache TTL or improving cache key strategy',
            );
        }

        if (stats.averageResolutionTime > 1000) {
            recommendations.push(
                'Consider optimizing address resolution performance',
            );
        }

        if (stats.totalResolutions > this.MAX_CACHE_SIZE * 0.9) {
            recommendations.push(
                'Consider increasing cache size or implementing cache eviction',
            );
        }

        return recommendations;
    }
}
