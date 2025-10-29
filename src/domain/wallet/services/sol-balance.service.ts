import { Injectable } from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { SolanaBlockchainService } from '../../solana/services/solana-blockchain.service';
import { TokenType } from '../../common/enums/token-type.enum';

@Injectable()
export class SolBalanceService {
    constructor(
        private readonly walletBalanceService: WalletBalanceService,
        private readonly blockchainService: SolanaBlockchainService,
    ) {}

    /**
     * Get SOL balance for a wallet
     */
    async getSolBalance(walletId: string): Promise<number> {
        // First try to get from database
        const dbBalance = await this.walletBalanceService.getBalance(
            walletId,
            TokenType.SOL,
        );

        // Get real-time balance from blockchain
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.SOL,
        );

        // Use blockchain balance if available, otherwise use database balance
        return blockchainBalance
            ? Number(blockchainBalance.balance)
            : dbBalance;
    }

    /**
     * Get SOL balance for multiple wallets
     */
    async getSolBalances(walletIds: string[]): Promise<Map<string, number>> {
        const balances = new Map<string, number>();

        for (const walletId of walletIds) {
            try {
                const balance = await this.getSolBalance(walletId);
                balances.set(walletId, balance);
            } catch (error) {
                console.warn(
                    `Failed to get SOL balance for wallet ${walletId}:`,
                    error,
                );
                balances.set(walletId, 0);
            }
        }

        return balances;
    }

    /**
     * Refresh SOL balance from blockchain
     */
    async refreshSolBalance(walletId: string): Promise<number> {
        const blockchainBalance = await this.blockchainService.getBalance(
            walletId,
            TokenType.SOL,
        );

        if (blockchainBalance) {
            // await this.walletBalanceService.updateBalance(walletId, TokenType.SOL, Number(blockchainBalance.balance));
        }

        return blockchainBalance ? Number(blockchainBalance.balance) : 0;
    }

    /**
     * Check if wallet has sufficient SOL balance
     */
    async hasSufficientSolBalance(
        walletId: string,
        requiredAmount: number,
    ): Promise<boolean> {
        const balance = await this.getSolBalance(walletId);
        return balance >= requiredAmount;
    }

    /**
     * Get SOL balance in formatted string
     */
    async getFormattedSolBalance(walletId: string): Promise<string> {
        const balance = await this.getSolBalance(walletId);
        const formatted = (balance / Math.pow(10, 9)).toFixed(9); // SOL has 9 decimals
        return `${formatted} SOL`;
    }

    /**
     * Get SOL balance in SOL (native unit)
     */
    async getSolBalanceInSol(walletId: string): Promise<number> {
        const balance = await this.getSolBalance(walletId);
        return balance / Math.pow(10, 9); // Convert from lamports to SOL
    }

    /**
     * Get SOL balance in USD (requires price feed)
     */
    async getSolBalanceInUsd(
        walletId: string,
        solPriceUsd: number = 100,
    ): Promise<number> {
        const solBalance = await this.getSolBalanceInSol(walletId);
        return solBalance * solPriceUsd;
    }

    /**
     * Check if wallet has minimum SOL for transaction fees
     */
    async hasMinimumSolForFees(
        walletId: string,
        minimumSol: number = 0.01,
    ): Promise<boolean> {
        const solBalance = await this.getSolBalanceInSol(walletId);
        return solBalance >= minimumSol;
    }

    /**
     * Get estimated transaction fee in SOL
     */
    async getEstimatedTransactionFee(): Promise<number> {
        // Mock implementation - in real app, this would query the network for current fees
        return 0.000005; // 5000 lamports = 0.000005 SOL
    }

    /**
     * Check if wallet has enough SOL for a specific transaction
     */
    async canAffordTransaction(
        walletId: string,
        estimatedFee: number,
    ): Promise<boolean> {
        const solBalance = await this.getSolBalanceInSol(walletId);
        return solBalance >= estimatedFee;
    }
}
