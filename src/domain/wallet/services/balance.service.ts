import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletBalanceService } from './wallet-balance.service';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface BalanceInfo {
    walletId: string;
    tokenType: TokenType;
    balance: number;
    formattedBalance: string;
    lastUpdated: Date;
    isActive: boolean;
}

export interface WalletBalanceSummary {
    walletId: string;
    totalBalance: number;
    totalFormattedBalance: string;
    tokenBalances: BalanceInfo[];
    lastUpdated: Date;
}

@Injectable()
export class BalanceService {
    constructor(
        private readonly walletService: WalletService,
        private readonly walletBalanceService: WalletBalanceService,
        private readonly blockchainService: SolanaBlockchainService,
    ) {}

    /**
     * Get balance for a specific wallet and token
     */
    async getWalletBalance(
        walletId: string,
        tokenType: TokenType,
    ): Promise<BalanceInfo> {
        const wallet = await this.walletService.getWallet(walletId);
        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        // Get balance from database
        const dbBalance = await this.walletBalanceService.getBalance(
            walletId,
            tokenType,
        );

        // Get real-time balance from blockchain
        const blockchainBalance = await this.blockchainService.getBalance(
            wallet.address,
            tokenType,
        );

        // Use blockchain balance if available, otherwise use database balance
        const balance = blockchainBalance
            ? Number(blockchainBalance.balance)
            : dbBalance;

        return {
            walletId,
            tokenType,
            balance,
            formattedBalance: this.formatBalance(balance, tokenType),
            lastUpdated: new Date(),
            isActive: true, // Mock value - WalletInfo doesn't have isActive
        };
    }

    /**
     * Get all token balances for a wallet
     */
    async getWalletBalances(walletId: string): Promise<BalanceInfo[]> {
        const wallet = await this.walletService.getWallet(walletId);
        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const tokenTypes = Object.values(TokenType);
        const balances: BalanceInfo[] = [];

        for (const tokenType of tokenTypes) {
            try {
                const balance = await this.getWalletBalance(
                    walletId,
                    tokenType,
                );
                balances.push(balance);
            } catch (error) {
                // Skip tokens that don't have balances
                console.warn(
                    `Failed to get balance for ${tokenType} in wallet ${walletId}:`,
                    error,
                );
            }
        }

        return balances;
    }

    /**
     * Get balance summary for a wallet
     */
    async getWalletBalanceSummary(
        walletId: string,
    ): Promise<WalletBalanceSummary> {
        const balances = await this.getWalletBalances(walletId);

        // Calculate total balance in USD (assuming 1:1 for USDC, 1:1 for EURC, and current SOL price)
        const totalBalance = balances.reduce((total, balance) => {
            if (
                balance.tokenType === TokenType.USDC ||
                balance.tokenType === TokenType.EURC
            ) {
                return total + balance.balance;
            } else if (balance.tokenType === TokenType.SOL) {
                // Mock SOL price - in real implementation, get from price feed
                const solPrice = 100; // $100 per SOL
                return total + balance.balance * solPrice;
            }
            return total;
        }, 0);

        return {
            walletId,
            totalBalance,
            totalFormattedBalance: this.formatBalance(
                totalBalance,
                TokenType.USDC,
            ),
            tokenBalances: balances,
            lastUpdated: new Date(),
        };
    }

    /**
     * Get balances for all user wallets
     */
    async getUserWalletBalances(
        userId: string,
    ): Promise<WalletBalanceSummary[]> {
        const wallets = await this.walletService.getUserWallets(userId);
        const summaries: WalletBalanceSummary[] = [];

        for (const wallet of wallets) {
            try {
                const summary = await this.getWalletBalanceSummary(
                    wallet.walletId,
                );
                summaries.push(summary);
            } catch (error) {
                console.warn(
                    `Failed to get balance summary for wallet ${wallet.walletId}:`,
                    error,
                );
            }
        }

        return summaries;
    }

    /**
     * Refresh wallet balance from blockchain
     */
    async refreshWalletBalance(
        walletId: string,
        tokenType: TokenType,
    ): Promise<BalanceInfo> {
        const wallet = await this.walletService.getWallet(walletId);
        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        // Get real-time balance from blockchain
        const blockchainBalance = await this.blockchainService.getBalance(
            wallet.address,
            tokenType,
        );

        if (blockchainBalance) {
            // Update database with fresh balance
            // await this.walletBalanceService.updateBalance(walletId, tokenType, Number(blockchainBalance.balance));
        }

        return this.getWalletBalance(walletId, tokenType);
    }

    /**
     * Refresh all balances for a wallet
     */
    async refreshWalletBalances(walletId: string): Promise<BalanceInfo[]> {
        const tokenTypes = Object.values(TokenType);
        const balances: BalanceInfo[] = [];

        for (const tokenType of tokenTypes) {
            try {
                const balance = await this.refreshWalletBalance(
                    walletId,
                    tokenType,
                );
                balances.push(balance);
            } catch (error) {
                console.warn(
                    `Failed to refresh balance for ${tokenType} in wallet ${walletId}:`,
                    error,
                );
            }
        }

        return balances;
    }

    /**
     * Get total balance across all user wallets
     */
    async getTotalUserBalance(userId: string): Promise<{
        totalBalance: number;
        totalFormattedBalance: string;
        walletCount: number;
        lastUpdated: Date;
    }> {
        const walletSummaries = await this.getUserWalletBalances(userId);

        const totalBalance = walletSummaries.reduce((total, summary) => {
            return total + summary.totalBalance;
        }, 0);

        return {
            totalBalance,
            totalFormattedBalance: this.formatBalance(
                totalBalance,
                TokenType.USDC,
            ),
            walletCount: walletSummaries.length,
            lastUpdated: new Date(),
        };
    }

    /**
     * Format balance with appropriate decimal places
     */
    private formatBalance(balance: number, tokenType: TokenType): string {
        const decimals = this.getTokenDecimals(tokenType);
        const formatted = (balance / Math.pow(10, decimals)).toFixed(decimals);
        return `${formatted} ${tokenType}`;
    }

    /**
     * Get decimal places for token type
     */
    private getTokenDecimals(tokenType: TokenType): number {
        const decimals = {
            [TokenType.USDC]: 6,
            [TokenType.EURC]: 6,
            [TokenType.SOL]: 9,
        };
        return decimals[tokenType] || 6;
    }

    /**
     * Check if wallet has sufficient balance
     */
    async hasSufficientBalance(
        walletId: string,
        tokenType: TokenType,
        requiredAmount: number,
    ): Promise<boolean> {
        const balance = await this.getWalletBalance(walletId, tokenType);
        return balance.balance >= requiredAmount;
    }

    /**
     * Get balance history for a wallet and token
     */
    async getBalanceHistory(
        walletId: string,
        tokenType: TokenType,
        startDate?: Date,
        endDate?: Date,
    ): Promise<
        Array<{
            timestamp: Date;
            balance: number;
            change: number;
        }>
    > {
        // Mock implementation - in real app, this would query balance history table
        return [
            {
                timestamp: new Date(),
                balance: 1000000, // 1 USDC
                change: 0,
            },
        ];
    }
}
