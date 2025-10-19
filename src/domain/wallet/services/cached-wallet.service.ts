import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CacheService } from '../../common/services/cache.service';
import { Wallet } from '../entities/wallet.entity';
import { WalletType } from '../entities/wallet.entity';

/**
 * Cached wrapper for WalletService
 *
 * @description This service wraps the WalletService with caching
 * to improve performance for frequently accessed wallet data.
 * It caches wallet queries and invalidates cache when wallets are updated.
 *
 * @example
 * ```typescript
 * const cachedService = new CachedWalletService(
 *     walletService,
 *     cacheService
 * );
 *
 * // This will check cache first, then fallback to database
 * const wallet = await cachedService.findByUserId('user-123');
 * ```
 */
@Injectable()
export class CachedWalletService {
    private readonly logger = new Logger(CachedWalletService.name);

    // Cache TTL settings (in seconds)
    private readonly WALLET_TTL = 300; // 5 minutes for wallet data
    private readonly WALLETS_TTL = 180; // 3 minutes for wallet lists

    constructor(
        private readonly walletService: WalletService,
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Create a new wallet and invalidate user cache
     */
    async create(
        userId: string,
        address: string,
        publicKey: string,
        walletType: WalletType,
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet> {
        // Create the wallet
        const wallet = await this.walletService.create(
            userId,
            address,
            publicKey,
            walletAddresses,
        );

        // Invalidate user cache
        await this.cacheService.invalidateUserCache(userId);

        this.logger.debug(
            `Created wallet ${wallet.id} and invalidated user cache`,
        );

        return wallet;
    }

    /**
     * Find wallet by ID with caching
     */
    async findOne(id: string): Promise<Wallet> {
        const cacheKey = `wallet:${id}`;

        // Try to get from cache first
        const cachedWallet = await this.cacheService.get<Wallet>(cacheKey);
        if (cachedWallet !== null) {
            this.logger.debug(`Cache hit for wallet ${id}`);
            return cachedWallet;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for wallet ${id}`);
        const wallet = await this.walletService.findOne(id);

        // Cache the result
        await this.cacheService.set(cacheKey, wallet, this.WALLET_TTL);

        return wallet;
    }

    /**
     * Find wallet by user ID with caching
     */
    async findByUserId(userId: string): Promise<Wallet | null> {
        const cacheKey = this.cacheService.getUserWalletKey(userId);

        // Try to get from cache first
        const cachedWallet = await this.cacheService.get<Wallet | null>(
            cacheKey,
        );
        if (cachedWallet !== null) {
            this.logger.debug(`Cache hit for user ${userId} wallet`);
            return cachedWallet;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for user ${userId} wallet`);
        const wallet = await this.walletService.findByUserId(userId);

        // Cache the result (including null values)
        await this.cacheService.set(cacheKey, wallet, this.WALLET_TTL);

        return wallet;
    }

    /**
     * Find all wallets by user ID with caching
     */
    async findAllByUserId(userId: string): Promise<Wallet[]> {
        const cacheKey = this.cacheService.getUserWalletsKey(userId);

        // Try to get from cache first
        const cachedWallets = await this.cacheService.get<Wallet[]>(cacheKey);
        if (cachedWallets !== null) {
            this.logger.debug(`Cache hit for user ${userId} wallets`);
            return cachedWallets;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for user ${userId} wallets`);
        const wallets = await this.walletService.findAllByUserId(userId);

        // Cache the result
        await this.cacheService.set(cacheKey, wallets, this.WALLETS_TTL);

        return wallets;
    }

    /**
     * Find wallet by address with caching
     */
    async findByAddress(address: string): Promise<Wallet | null> {
        const cacheKey = this.cacheService.getWalletByAddressKey(address);

        // Try to get from cache first
        const cachedWallet = await this.cacheService.get<Wallet | null>(
            cacheKey,
        );
        if (cachedWallet !== null) {
            this.logger.debug(`Cache hit for wallet address ${address}`);
            return cachedWallet;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for wallet address ${address}`);
        const wallet = await this.walletService.findByAddress(address);

        // Cache the result (including null values)
        await this.cacheService.set(cacheKey, wallet, this.WALLET_TTL);

        return wallet;
    }

    /**
     * Update wallet and invalidate cache
     */
    async update(id: string, updateData: Partial<Wallet>): Promise<Wallet> {
        // Update the wallet
        const updatedWallet = await this.walletService.update(id, updateData);

        // Invalidate related cache entries
        await this.invalidateWalletCache(id, updatedWallet.userId);

        this.logger.debug(`Updated wallet ${id} and invalidated cache`);

        return updatedWallet;
    }

    /**
     * Get the primary wallet for a user (since each user has only one Web3Auth wallet)
     */
    async getPrimaryWallet(userId: string): Promise<Wallet | null> {
        return await this.findByUserId(userId);
    }

    /**
     * Find primary wallet by user ID with caching
     */
    async findPrimaryByUserId(userId: string): Promise<Wallet | null> {
        const cacheKey = `user:${userId}:wallet:primary`;

        // Try to get from cache first
        const cachedWallet = await this.cacheService.get<Wallet | null>(
            cacheKey,
        );
        if (cachedWallet !== null) {
            this.logger.debug(`Cache hit for user ${userId} primary wallet`);
            return cachedWallet;
        }

        // Cache miss - get from service
        this.logger.debug(`Cache miss for user ${userId} primary wallet`);
        const wallet = await this.walletService.findPrimaryByUserId(userId);

        // Cache the result (including null values)
        await this.cacheService.set(cacheKey, wallet, this.WALLET_TTL);

        return wallet;
    }

    /**
     * Invalidate cache entries for a specific wallet
     */
    private async invalidateWalletCache(
        walletId: string,
        userId: string,
    ): Promise<void> {
        const walletKey = `wallet:${walletId}`;
        const userWalletKey = this.cacheService.getUserWalletKey(userId);
        const userWalletsKey = this.cacheService.getUserWalletsKey(userId);
        const primaryWalletKey = `user:${userId}:wallet:primary`;

        await Promise.all([
            this.cacheService.delete(walletKey),
            this.cacheService.delete(userWalletKey),
            this.cacheService.delete(userWalletsKey),
            this.cacheService.delete(primaryWalletKey),
        ]);
    }

    /**
     * Invalidate all cache entries for a wallet
     */
    async invalidateWalletCacheById(walletId: string): Promise<void> {
        await this.cacheService.invalidateWalletCache(walletId);
        this.logger.debug(
            `Invalidated all cache entries for wallet ${walletId}`,
        );
    }

    /**
     * Invalidate all cache entries for a user
     */
    async invalidateUserCache(userId: string): Promise<void> {
        await this.cacheService.invalidateUserCache(userId);
        this.logger.debug(`Invalidated all cache entries for user ${userId}`);
    }
}
