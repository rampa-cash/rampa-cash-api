import { Injectable } from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { TokenType } from '../../common/enums/token-type.enum';

@Injectable()
export class EurcBalanceService {
    constructor(
        private readonly walletBalanceService: WalletBalanceService,
        private readonly blockchainService: SolanaBlockchainService,
    ) {}

    /**
     * Get EURC balance for a wallet
     */
    async getEurcBalance(walletId: string): Promise<number> {
        // First try to get from database
        const dbBalance = await this.walletBalanceService.getBalance(
            walletId,
            TokenType.EURC,
        );

        // Get real-time balance from blockchain
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.EURC,
        );

        // Use blockchain balance if available, otherwise use database balance
        return blockchainBalance
            ? Number(blockchainBalance.balance)
            : dbBalance;
    }

    /**
     * Get EURC balance for multiple wallets
     */
    async getEurcBalances(walletIds: string[]): Promise<Map<string, number>> {
        const balances = new Map<string, number>();

        for (const walletId of walletIds) {
            try {
                const balance = await this.getEurcBalance(walletId);
                balances.set(walletId, balance);
            } catch (error) {
                console.warn(
                    `Failed to get EURC balance for wallet ${walletId}:`,
                    error,
                );
                balances.set(walletId, 0);
            }
        }

        return balances;
    }

    /**
     * Refresh EURC balance from blockchain
     */
    async refreshEurcBalance(walletId: string): Promise<number> {
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.EURC,
        );

        if (blockchainBalance) {
            // await this.walletBalanceService.updateBalance(walletId, TokenType.EURC, Number(blockchainBalance.balance));
        }

        return blockchainBalance ? Number(blockchainBalance.balance) : 0;
    }

    /**
     * Check if wallet has sufficient EURC balance
     */
    async hasSufficientEurcBalance(
        walletId: string,
        requiredAmount: number,
    ): Promise<boolean> {
        const balance = await this.getEurcBalance(walletId);
        return balance >= requiredAmount;
    }

    /**
     * Get EURC balance in formatted string
     */
    async getFormattedEurcBalance(walletId: string): Promise<string> {
        const balance = await this.getEurcBalance(walletId);
        const formatted = (balance / Math.pow(10, 6)).toFixed(6); // EURC has 6 decimals
        return `${formatted} EURC`;
    }

    /**
     * Get EURC balance in EUR (1:1 ratio)
     */
    async getEurcBalanceInEur(walletId: string): Promise<number> {
        const balance = await this.getEurcBalance(walletId);
        return balance / Math.pow(10, 6); // Convert from smallest unit to EUR
    }
}
