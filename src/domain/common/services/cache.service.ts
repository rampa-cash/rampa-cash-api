import { Injectable, Logger } from '@nestjs/common';

/**
 * Simple in-memory cache service for frequently accessed data
 *
 * @description This service provides a simple in-memory caching mechanism
 * for frequently accessed data like wallet balances, user information,
 * and transaction history. In production, this should be replaced with
 * Redis or another distributed caching solution.
 *
 * @example
 * ```typescript
 * const cacheService = new CacheService();
 *
 * // Set cache with TTL
 * await cacheService.set('wallet:123:balance', { usdc: 100, eurc: 50 }, 300);
 *
 * // Get from cache
 * const balance = await cacheService.get('wallet:123:balance');
 *
 * // Delete from cache
 * await cacheService.delete('wallet:123:balance');
 * ```
 */
@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private cache = new Map<string, { value: any; expiresAt: number }>();
    private readonly defaultTTL = 300; // 5 minutes default TTL

    /**
     * Set a value in the cache with optional TTL
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in seconds (default: 5 minutes)
     */
    async set(
        key: string,
        value: any,
        ttl: number = this.defaultTTL,
    ): Promise<void> {
        const expiresAt = Date.now() + ttl * 1000;
        this.cache.set(key, { value, expiresAt });

        this.logger.debug(`Cached key: ${key} with TTL: ${ttl}s`);
    }

    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns Cached value or null if not found/expired
     */
    async get<T = any>(key: string): Promise<T | null> {
        const item = this.cache.get(key);

        if (!item) {
            this.logger.debug(`Cache miss for key: ${key}`);
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired for key: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit for key: ${key}`);
        return item.value as T;
    }

    /**
     * Delete a value from the cache
     * @param key - Cache key
     */
    async delete(key: string): Promise<void> {
        const deleted = this.cache.delete(key);
        this.logger.debug(
            `Cache ${deleted ? 'deleted' : 'not found'} for key: ${key}`,
        );
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<void> {
        this.cache.clear();
        this.logger.debug('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Clean up expired entries
     */
    async cleanup(): Promise<void> {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
        }
    }

    /**
     * Generate cache key for wallet balance
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     */
    getWalletBalanceKey(walletId: string, tokenType: string): string {
        return `wallet:${walletId}:balance:${tokenType}`;
    }

    /**
     * Generate cache key for all wallet balances
     * @param walletId - Wallet ID
     */
    getAllWalletBalancesKey(walletId: string): string {
        return `wallet:${walletId}:balances:all`;
    }

    /**
     * Generate cache key for user wallet
     * @param userId - User ID
     */
    getUserWalletKey(userId: string): string {
        return `user:${userId}:wallet`;
    }

    /**
     * Generate cache key for user wallets
     * @param userId - User ID
     */
    getUserWalletsKey(userId: string): string {
        return `user:${userId}:wallets`;
    }

    /**
     * Generate cache key for transaction history
     * @param userId - User ID
     * @param limit - Limit
     * @param offset - Offset
     */
    getTransactionHistoryKey(
        userId: string,
        limit: number,
        offset: number,
    ): string {
        return `user:${userId}:transactions:${limit}:${offset}`;
    }

    /**
     * Generate cache key for wallet by address
     * @param address - Wallet address
     */
    getWalletByAddressKey(address: string): string {
        return `wallet:address:${address}`;
    }

    /**
     * Invalidate all cache entries for a wallet
     * @param walletId - Wallet ID
     */
    async invalidateWalletCache(walletId: string): Promise<void> {
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.includes(`wallet:${walletId}`)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            await this.delete(key);
        }

        this.logger.debug(
            `Invalidated ${keysToDelete.length} cache entries for wallet: ${walletId}`,
        );
    }

    /**
     * Invalidate all cache entries for a user
     * @param userId - User ID
     */
    async invalidateUserCache(userId: string): Promise<void> {
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.includes(`user:${userId}`)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            await this.delete(key);
        }

        this.logger.debug(
            `Invalidated ${keysToDelete.length} cache entries for user: ${userId}`,
        );
    }
}
