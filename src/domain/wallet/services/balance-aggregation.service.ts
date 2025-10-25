import { Injectable } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { BalanceService, WalletBalanceSummary } from './balance.service';
import { UsdcBalanceService } from './usdc-balance.service';
import { EurcBalanceService } from './eurc-balance.service';
import { SolBalanceService } from './sol-balance.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface AggregatedBalance {
    userId: string;
    totalUsdValue: number;
    totalFormattedValue: string;
    tokenBreakdown: {
        usdc: {
            balance: number;
            usdValue: number;
            formatted: string;
        };
        eurc: {
            balance: number;
            eurValue: number;
            formatted: string;
        };
        sol: {
            balance: number;
            usdValue: number;
            formatted: string;
        };
    };
    walletCount: number;
    lastUpdated: Date;
}

export interface BalanceComparison {
    current: AggregatedBalance;
    previous?: AggregatedBalance;
    change: {
        absolute: number;
        percentage: number;
        direction: 'up' | 'down' | 'same';
    };
}

@Injectable()
export class BalanceAggregationService {
    constructor(
        private readonly walletService: WalletService,
        private readonly balanceService: BalanceService,
        private readonly usdcBalanceService: UsdcBalanceService,
        private readonly eurcBalanceService: EurcBalanceService,
        private readonly solBalanceService: SolBalanceService,
    ) {}

    /**
     * Get aggregated balance for a user across all wallets
     */
    async getAggregatedBalance(userId: string): Promise<AggregatedBalance> {
        const wallets = await this.walletService.getUserWallets(userId);
        const walletSummaries =
            await this.balanceService.getUserWalletBalances(userId);

        // Aggregate USDC balances
        const usdcBalances = await Promise.all(
            wallets.map((w) =>
                this.usdcBalanceService.getUsdcBalance(w.walletId),
            ),
        );
        const totalUsdcBalance = usdcBalances.reduce(
            (sum, balance) => sum + balance,
            0,
        );
        const usdcUsdValue = totalUsdcBalance / Math.pow(10, 6); // Convert to USD

        // Aggregate EURC balances
        const eurcBalances = await Promise.all(
            wallets.map((w) =>
                this.eurcBalanceService.getEurcBalance(w.walletId),
            ),
        );
        const totalEurcBalance = eurcBalances.reduce(
            (sum, balance) => sum + balance,
            0,
        );
        const eurcEurValue = totalEurcBalance / Math.pow(10, 6); // Convert to EUR

        // Aggregate SOL balances
        const solBalances = await Promise.all(
            wallets.map((w) =>
                this.solBalanceService.getSolBalance(w.walletId),
            ),
        );
        const totalSolBalance = solBalances.reduce(
            (sum, balance) => sum + balance,
            0,
        );
        const solUsdValue = (totalSolBalance / Math.pow(10, 9)) * 100; // Convert to SOL and multiply by price

        // Calculate total USD value (EURC converted to USD at 1:1 for simplicity)
        const totalUsdValue = usdcUsdValue + eurcEurValue + solUsdValue;

        return {
            userId,
            totalUsdValue,
            totalFormattedValue: `$${totalUsdValue.toFixed(2)}`,
            tokenBreakdown: {
                usdc: {
                    balance: totalUsdcBalance,
                    usdValue: usdcUsdValue,
                    formatted: `${usdcUsdValue.toFixed(6)} USDC`,
                },
                eurc: {
                    balance: totalEurcBalance,
                    eurValue: eurcEurValue,
                    formatted: `${eurcEurValue.toFixed(6)} EURC`,
                },
                sol: {
                    balance: totalSolBalance,
                    usdValue: solUsdValue,
                    formatted: `${(totalSolBalance / Math.pow(10, 9)).toFixed(9)} SOL`,
                },
            },
            walletCount: wallets.length,
            lastUpdated: new Date(),
        };
    }

    /**
     * Get balance comparison between current and previous period
     */
    async getBalanceComparison(
        userId: string,
        previousBalance?: AggregatedBalance,
    ): Promise<BalanceComparison> {
        const currentBalance = await this.getAggregatedBalance(userId);

        if (!previousBalance) {
            return {
                current: currentBalance,
                change: {
                    absolute: 0,
                    percentage: 0,
                    direction: 'same',
                },
            };
        }

        const absoluteChange =
            currentBalance.totalUsdValue - previousBalance.totalUsdValue;
        const percentageChange =
            previousBalance.totalUsdValue > 0
                ? (absoluteChange / previousBalance.totalUsdValue) * 100
                : 0;

        let direction: 'up' | 'down' | 'same' = 'same';
        if (absoluteChange > 0.01) direction = 'up';
        else if (absoluteChange < -0.01) direction = 'down';

        return {
            current: currentBalance,
            previous: previousBalance,
            change: {
                absolute: absoluteChange,
                percentage: percentageChange,
                direction,
            },
        };
    }

    /**
     * Get balance distribution across tokens
     */
    async getBalanceDistribution(userId: string): Promise<{
        usdc: number;
        eurc: number;
        sol: number;
        total: number;
    }> {
        const aggregatedBalance = await this.getAggregatedBalance(userId);
        const { usdc, eurc, sol } = aggregatedBalance.tokenBreakdown;

        return {
            usdc: (usdc.usdValue / aggregatedBalance.totalUsdValue) * 100,
            eurc: (eurc.eurValue / aggregatedBalance.totalUsdValue) * 100,
            sol: (sol.usdValue / aggregatedBalance.totalUsdValue) * 100,
            total: 100,
        };
    }

    /**
     * Get balance trends over time
     */
    async getBalanceTrends(
        userId: string,
        days: number = 7,
    ): Promise<
        Array<{
            date: string;
            totalValue: number;
            usdcValue: number;
            eurcValue: number;
            solValue: number;
        }>
    > {
        // Mock implementation - in real app, this would query historical balance data
        const trends = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            trends.push({
                date: date.toISOString().split('T')[0],
                totalValue: 1000 + Math.random() * 100, // Mock data
                usdcValue: 500 + Math.random() * 50,
                eurcValue: 300 + Math.random() * 30,
                solValue: 200 + Math.random() * 20,
            });
        }

        return trends;
    }

    /**
     * Get top performing wallets by balance
     */
    async getTopWalletsByBalance(
        userId: string,
        limit: number = 5,
    ): Promise<
        Array<{
            walletId: string;
            totalValue: number;
            formattedValue: string;
            tokenBreakdown: {
                usdc: number;
                eurc: number;
                sol: number;
            };
        }>
    > {
        const walletSummaries =
            await this.balanceService.getUserWalletBalances(userId);

        return walletSummaries
            .sort((a, b) => b.totalBalance - a.totalBalance)
            .slice(0, limit)
            .map((summary) => ({
                walletId: summary.walletId,
                totalValue: summary.totalBalance,
                formattedValue: summary.totalFormattedBalance,
                tokenBreakdown: {
                    usdc:
                        summary.tokenBalances.find(
                            (b) => b.tokenType === TokenType.USDC,
                        )?.balance || 0,
                    eurc:
                        summary.tokenBalances.find(
                            (b) => b.tokenType === TokenType.EURC,
                        )?.balance || 0,
                    sol:
                        summary.tokenBalances.find(
                            (b) => b.tokenType === TokenType.SOL,
                        )?.balance || 0,
                },
            }));
    }

    /**
     * Get balance alerts (low balance, high balance, etc.)
     */
    async getBalanceAlerts(userId: string): Promise<
        Array<{
            type:
                | 'low_balance'
                | 'high_balance'
                | 'zero_balance'
                | 'insufficient_sol';
            message: string;
            severity: 'low' | 'medium' | 'high';
            walletId?: string;
            tokenType?: TokenType;
        }>
    > {
        const wallets = await this.walletService.getUserWallets(userId);
        const alerts = [];

        for (const wallet of wallets) {
            // Check USDC balance
            const usdcBalance =
                await this.usdcBalanceService.getUsdcBalanceInUsd(
                    wallet.walletId,
                );
            if (usdcBalance < 10) {
                alerts.push({
                    type: 'low_balance' as const,
                    message: `Low USDC balance: $${usdcBalance.toFixed(2)}`,
                    severity: 'medium' as const,
                    walletId: wallet.walletId,
                    tokenType: TokenType.USDC,
                });
            }

            // Check SOL balance for transaction fees
            const hasMinSol = await this.solBalanceService.hasMinimumSolForFees(
                wallet.walletId,
            );
            if (!hasMinSol) {
                alerts.push({
                    type: 'insufficient_sol' as const,
                    message: 'Insufficient SOL for transaction fees',
                    severity: 'high' as const,
                    walletId: wallet.walletId,
                    tokenType: TokenType.SOL,
                });
            }
        }

        return alerts;
    }

    /**
     * Refresh all balances for a user
     */
    async refreshAllBalances(userId: string): Promise<AggregatedBalance> {
        const wallets = await this.walletService.getUserWallets(userId);

        // Refresh all token balances for all wallets
        for (const wallet of wallets) {
            await this.balanceService.refreshWalletBalances(wallet.walletId);
        }

        return this.getAggregatedBalance(userId);
    }
}
