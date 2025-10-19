import { Injectable, Logger } from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { CacheService } from '../../common/services/cache.service';
import { TokenType } from '../../common/enums/token-type.enum';
import { WalletBalance } from '../entities/wallet-balance.entity';

/**
 * Cached wrapper for WalletBalanceService
 *
 * @description This service wraps the WalletBalanceService with caching
 * to improve performance for frequently accessed wallet balance data.
 * It caches balance queries and invalidates cache when balances are updated.
 *
 * @example
 * ```typescript
 * const cachedService = new CachedWalletBalanceService(
 *     walletBalanceService,
 *     cacheService
 * );
 *
 * // This will check cache first, then fallback to database
 * const balance = await cachedService.getBalance('wallet-123', TokenType.USDC);
 * ```
 */
@Injectable()
export class CachedWalletBalanceService {
    private readonly logger = new Logger(CachedWalletBalanceService.name);

    // Cache TTL settings (in seconds)
    private readonly BALANCE_TTL = 60; // 1 minute for individual balances
    private readonly ALL_BALANCES_TTL = 30; // 30 seconds for all balances

    constructor(
        private readonly walletBalanceService: WalletBalanceService,
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Get balance for a specific wallet and token type with caching
     */
    async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
        const cacheKey = this.cacheService.getWalletBalanceKey(
            walletId,
            tokenType,
        );

        // Try to get from cache first
        const cachedBalance = await this.cacheService.get<number>(cacheKey);
        if (cachedBalance !== null) {
            this.logger.debug(
                `Cache hit for wallet ${walletId} balance ${tokenType}`,
            );
            return cachedBalance;
        }

        // Cache miss - get from service
        this.logger.debug(
            `Cache miss for wallet ${walletId} balance ${tokenType}`,
        );
        const balance = await this.walletBalanceService.getBalance(
            walletId,
            tokenType,
        );

        // Cache the result
        await this.cacheService.set(cacheKey, balance, this.BALANCE_TTL);

        return balance;
    }

    /**
     * Get all balances for a wallet with caching
     */
    async getAllBalances(walletId: string): Promise<WalletBalance[]> {
        const cacheKey = this.cacheService.getAllWalletBalancesKey(walletId);

        // Try to get from cache first
        const cachedBalances =
            await this.cacheService.get<WalletBalance[]>(cacheKey);
        if (cachedBalances !== null) {
            this.logger.debug(`Cache hit for wallet ${walletId} all balances`);
            return cachedBalances;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for wallet ${walletId} all balances`);
        const balances =
            await this.walletBalanceService.getAllBalances(walletId);

        // Cache the result
        await this.cacheService.set(cacheKey, balances, this.ALL_BALANCES_TTL);

        return balances;
    }

    /**
     * Update balance and invalidate cache
     */
    async updateBalance(
        walletId: string,
        tokenType: TokenType,
        newBalance: number,
    ): Promise<WalletBalance> {
        // Update the balance
        const updatedBalance = await this.walletBalanceService.updateBalance(
            walletId,
            tokenType,
            newBalance,
        );

        // Invalidate related cache entries
        await this.invalidateWalletBalanceCache(walletId, tokenType);

        this.logger.debug(
            `Updated balance for wallet ${walletId} ${tokenType} and invalidated cache`,
        );

        return updatedBalance;
    }

    /**
     * Add balance and invalidate cache
     */
    async addBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        // Add the balance
        const updatedBalance = await this.walletBalanceService.addBalance(
            walletId,
            tokenType,
            amount,
        );

        // Invalidate related cache entries
        await this.invalidateWalletBalanceCache(walletId, tokenType);

        this.logger.debug(
            `Added balance for wallet ${walletId} ${tokenType} and invalidated cache`,
        );

        return updatedBalance;
    }

    /**
     * Subtract balance and invalidate cache
     */
    async subtractBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        // Subtract the balance
        const updatedBalance = await this.walletBalanceService.subtractBalance(
            walletId,
            tokenType,
            amount,
        );

        // Invalidate related cache entries
        await this.invalidateWalletBalanceCache(walletId, tokenType);

        this.logger.debug(
            `Subtracted balance for wallet ${walletId} ${tokenType} and invalidated cache`,
        );

        return updatedBalance;
    }

    /**
     * Initialize wallet balances and invalidate cache
     */
    async initializeWalletBalances(walletId: string): Promise<void> {
        // Initialize balances
        await this.walletBalanceService.initializeWalletBalances(walletId);

        // Invalidate all wallet cache entries
        await this.cacheService.invalidateWalletCache(walletId);

        this.logger.debug(
            `Initialized balances for wallet ${walletId} and invalidated cache`,
        );
    }

    /**
     * Check if wallet has sufficient balance with caching
     */
    async hasSufficientBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<boolean> {
        const balance = await this.getBalance(walletId, tokenType);
        return balance >= amount;
    }

    /**
     * Get balance from database only (bypasses cache)
     */
    async getBalanceFromDatabase(
        walletId: string,
        tokenType: TokenType,
    ): Promise<number> {
        return await this.walletBalanceService.getBalanceFromDatabase(
            walletId,
            tokenType,
        );
    }

    /**
     * Get all balances from database only (bypasses cache)
     */
    async getAllBalancesFromDatabase(
        walletId: string,
    ): Promise<WalletBalance[]> {
        return await this.walletBalanceService.getAllBalancesFromDatabase(
            walletId,
        );
    }

    /**
     * Invalidate cache entries for a specific wallet balance
     */
    private async invalidateWalletBalanceCache(
        walletId: string,
        tokenType: TokenType,
    ): Promise<void> {
        const balanceKey = this.cacheService.getWalletBalanceKey(
            walletId,
            tokenType,
        );
        const allBalancesKey =
            this.cacheService.getAllWalletBalancesKey(walletId);

        await Promise.all([
            this.cacheService.delete(balanceKey),
            this.cacheService.delete(allBalancesKey),
        ]);
    }

    /**
     * Invalidate all cache entries for a wallet
     */
    async invalidateWalletCache(walletId: string): Promise<void> {
        await this.cacheService.invalidateWalletCache(walletId);
        this.logger.debug(
            `Invalidated all cache entries for wallet ${walletId}`,
        );
    }
}
