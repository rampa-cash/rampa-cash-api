import { WalletBalance } from '../entities/wallet-balance.entity';
import { TokenType } from '../../common/enums/token-type.enum';

/**
 * Interface for Wallet Balance Service operations
 * Defines the contract for wallet balance management operations
 */
export interface IWalletBalanceService {
    /**
     * Get balance for a specific wallet and token type
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @returns Promise<number> - The balance amount
     */
    getBalance(walletId: string, tokenType: TokenType): Promise<number>;

    /**
     * Get all balances for a wallet
     * @param walletId - The wallet ID
     * @returns Promise<WalletBalance[]> - Array of wallet balances
     */
    getAllBalances(walletId: string): Promise<WalletBalance[]>;

    /**
     * Get balance from database only (no blockchain sync)
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @returns Promise<number> - The balance amount from database
     */
    getBalanceFromDatabase(
        walletId: string,
        tokenType: TokenType,
    ): Promise<number>;

    /**
     * Get all balances from database only (no blockchain sync)
     * @param walletId - The wallet ID
     * @returns Promise<WalletBalance[]> - Array of wallet balances from database
     */
    getAllBalancesFromDatabase(walletId: string): Promise<WalletBalance[]>;

    /**
     * Add balance to a wallet
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @param amount - The amount to add
     * @returns Promise<WalletBalance> - The updated wallet balance
     */
    addBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance>;

    /**
     * Subtract balance from a wallet
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @param amount - The amount to subtract
     * @returns Promise<WalletBalance> - The updated wallet balance
     */
    subtractBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance>;

    /**
     * Set balance for a wallet
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @param amount - The amount to set
     * @returns Promise<WalletBalance> - The updated wallet balance
     */
    setBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance>;

    /**
     * Initialize wallet balances for all supported tokens
     * @param walletId - The wallet ID
     * @returns Promise<void>
     */
    initializeWalletBalances(walletId: string): Promise<void>;

    /**
     * Sync wallet balance with blockchain
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @returns Promise<WalletBalance> - The synced wallet balance
     */
    syncBalanceWithBlockchain(
        walletId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance>;

    /**
     * Sync all wallet balances with blockchain
     * @param walletId - The wallet ID
     * @returns Promise<WalletBalance[]> - Array of synced wallet balances
     */
    syncAllBalancesWithBlockchain(walletId: string): Promise<WalletBalance[]>;

    /**
     * Update balance from blockchain data
     * @param walletId - The wallet ID
     * @param tokenType - The token type
     * @param blockchainBalance - The balance from blockchain
     * @returns Promise<WalletBalance> - The updated wallet balance
     */
    updateBalanceFromBlockchain(
        walletId: string,
        tokenType: TokenType,
        blockchainBalance: number,
    ): Promise<WalletBalance>;
}
