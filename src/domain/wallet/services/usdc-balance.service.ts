import { Injectable } from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { TokenType } from '../../common/enums/token-type.enum';

@Injectable()
export class UsdcBalanceService {
    constructor(
        private readonly walletBalanceService: WalletBalanceService,
        private readonly blockchainService: SolanaBlockchainService,
    ) {}

    /**
     * Get USDC balance for a wallet
     */
    async getUsdcBalance(walletId: string): Promise<number> {
        // First try to get from database
        const dbBalance = await this.walletBalanceService.getBalance(
            walletId,
            TokenType.USDC,
        );

        // Get real-time balance from blockchain
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.USDC,
        );

        // Use blockchain balance if available, otherwise use database balance
        return blockchainBalance
            ? Number(blockchainBalance.balance)
            : dbBalance;
    }

    /**
     * Get USDC balance for multiple wallets
     */
    async getUsdcBalances(walletIds: string[]): Promise<Map<string, number>> {
        const balances = new Map<string, number>();

        for (const walletId of walletIds) {
            try {
                const balance = await this.getUsdcBalance(walletId);
                balances.set(walletId, balance);
            } catch (error) {
                console.warn(
                    `Failed to get USDC balance for wallet ${walletId}:`,
                    error,
                );
                balances.set(walletId, 0);
            }
        }

        return balances;
    }

    /**
     * Refresh USDC balance from blockchain
     */
    async refreshUsdcBalance(walletId: string): Promise<number> {
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.USDC,
        );

        if (blockchainBalance) {
            // await this.walletBalanceService.updateBalance(walletId, TokenType.USDC, Number(blockchainBalance.balance));
        }

        return blockchainBalance ? Number(blockchainBalance.balance) : 0;
    }

    /**
     * Check if wallet has sufficient USDC balance
     */
    async hasSufficientUsdcBalance(
        walletId: string,
        requiredAmount: number,
    ): Promise<boolean> {
        const balance = await this.getUsdcBalance(walletId);
        return balance >= requiredAmount;
    }

    /**
     * Get USDC balance in formatted string
     */
    async getFormattedUsdcBalance(walletId: string): Promise<string> {
        const balance = await this.getUsdcBalance(walletId);
        const formatted = (balance / Math.pow(10, 6)).toFixed(6); // USDC has 6 decimals
        return `${formatted} USDC`;
    }

    /**
     * Get USDC balance in USD (1:1 ratio)
     */
    async getUsdcBalanceInUsd(walletId: string): Promise<number> {
        const balance = await this.getUsdcBalance(walletId);
        return balance / Math.pow(10, 6); // Convert from smallest unit to USD
    }
}
