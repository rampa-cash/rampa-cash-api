import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { WalletService } from './wallet.service';
import { CachedWalletBalanceService } from './cached-wallet-balance.service';
import { TokenType } from '../../common/enums/token-type.enum';

/**
 * Service for scheduled balance refresh operations
 *
 * @description This service handles automatic balance refresh operations
 * to ensure wallet balances stay synchronized with the blockchain.
 * It includes both scheduled refresh and manual refresh capabilities.
 */
@Injectable()
export class BalanceRefreshService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BalanceRefreshService.name);
    private refreshInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly walletBalanceService: WalletBalanceService,
        private readonly walletService: WalletService,
        private readonly cachedWalletBalanceService: CachedWalletBalanceService,
    ) {}

    async onModuleInit() {
        this.logger.log('Balance refresh service initialized');
        // Start background refresh for active wallets
        this.startBackgroundRefresh();
    }

    async onModuleDestroy() {
        this.logger.log('Balance refresh service shutting down');
        this.stopBackgroundRefresh();
    }

    /**
     * Scheduled refresh of all active wallet balances
     * Runs every 5 minutes to keep balances fresh
     * Note: This would be called by a cron job in production
     */
    async refreshAllActiveWallets(): Promise<void> {
        this.logger.log('Starting scheduled refresh of all active wallets');

        try {
            const activeWallets = await this.walletService.findActiveWallets();
            const refreshPromises = activeWallets.map((wallet) =>
                this.refreshWalletBalances(wallet.id),
            );

            await Promise.allSettled(refreshPromises);
            this.logger.log(
                `Scheduled refresh completed for ${activeWallets.length} wallets`,
            );
        } catch (error) {
            this.logger.error('Scheduled refresh failed:', error);
        }
    }

    /**
     * Refresh balances for a specific wallet
     * @param walletId - Wallet ID to refresh
     */
    async refreshWalletBalances(walletId: string): Promise<void> {
        try {
            this.logger.debug(`Refreshing balances for wallet ${walletId}`);

            // Sync all token balances with blockchain
            await this.walletBalanceService.syncAllBalancesWithBlockchain(
                walletId,
            );

            // Invalidate cache to force fresh data on next request
            await this.cachedWalletBalanceService.invalidateWalletCache(
                walletId,
            );

            this.logger.debug(
                `Successfully refreshed balances for wallet ${walletId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to refresh balances for wallet ${walletId}:`,
                error,
            );
        }
    }

    /**
     * Refresh balance for a specific wallet and token
     * @param walletId - Wallet ID
     * @param tokenType - Token type to refresh
     */
    async refreshWalletBalance(
        walletId: string,
        tokenType: TokenType,
    ): Promise<void> {
        try {
            this.logger.debug(
                `Refreshing balance for wallet ${walletId}, token ${tokenType}`,
            );

            // Sync specific token balance with blockchain
            await this.walletBalanceService.syncBalanceWithBlockchain(
                walletId,
                tokenType,
            );

            // Invalidate specific balance cache
            const cacheKey = `wallet:${walletId}:balance:${tokenType}`;
            // Note: This would need to be implemented in CacheService
            // await this.cacheService.delete(cacheKey);

            this.logger.debug(
                `Successfully refreshed balance for wallet ${walletId}, token ${tokenType}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to refresh balance for wallet ${walletId}, token ${tokenType}:`,
                error,
            );
        }
    }

    /**
     * Force refresh all balances (bypasses cache)
     * @param walletId - Wallet ID to refresh
     */
    async forceRefreshWalletBalances(walletId: string): Promise<void> {
        try {
            this.logger.log(
                `Force refreshing all balances for wallet ${walletId}`,
            );

            // Get all token types
            const tokenTypes = Object.values(TokenType);

            // Refresh each token balance
            const refreshPromises = tokenTypes.map((tokenType) =>
                this.walletBalanceService.syncBalanceWithBlockchain(
                    walletId,
                    tokenType,
                ),
            );

            await Promise.allSettled(refreshPromises);

            // Invalidate all cache entries for this wallet
            await this.cachedWalletBalanceService.invalidateWalletCache(
                walletId,
            );

            this.logger.log(
                `Successfully force refreshed all balances for wallet ${walletId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to force refresh balances for wallet ${walletId}:`,
                error,
            );
        }
    }

    /**
     * Start background refresh for active wallets
     * Refreshes balances every 2 minutes for frequently used wallets
     */
    private startBackgroundRefresh(): void {
        this.refreshInterval = setInterval(
            async () => {
                try {
                    // Get recently active wallets (last 1 hour)
                    const recentWallets = await this.getRecentlyActiveWallets();

                    if (recentWallets.length > 0) {
                        this.logger.debug(
                            `Background refresh for ${recentWallets.length} recently active wallets`,
                        );

                        const refreshPromises = recentWallets.map((wallet) =>
                            this.refreshWalletBalances(wallet.id),
                        );

                        await Promise.allSettled(refreshPromises);
                    }
                } catch (error) {
                    this.logger.error('Background refresh failed:', error);
                }
            },
            2 * 60 * 1000,
        ); // 2 minutes

        this.logger.log('Background balance refresh started');
    }

    /**
     * Stop background refresh
     */
    private stopBackgroundRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            this.logger.log('Background balance refresh stopped');
        }
    }

    /**
     * Get recently active wallets (last 1 hour)
     * This would need to be implemented based on your activity tracking
     */
    private async getRecentlyActiveWallets(): Promise<Array<{ id: string }>> {
        // For now, return all active wallets
        // In a real implementation, you might track last activity timestamp
        const activeWallets = await this.walletService.findActiveWallets();
        return activeWallets.map((wallet) => ({ id: wallet.id }));
    }

    /**
     * Get refresh statistics
     */
    async getRefreshStats(): Promise<{
        lastScheduledRefresh: Date;
        backgroundRefreshActive: boolean;
        totalActiveWallets: number;
    }> {
        const activeWallets = await this.walletService.findActiveWallets();

        return {
            lastScheduledRefresh: new Date(), // Would track this in real implementation
            backgroundRefreshActive: this.refreshInterval !== null,
            totalActiveWallets: activeWallets.length,
        };
    }
}
