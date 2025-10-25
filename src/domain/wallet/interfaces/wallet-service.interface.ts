import { ExternalService } from '../../interfaces/external-service.interface';

/**
 * Wallet service interface following Dependency Inversion Principle (DIP)
 * Supports MPC wallet providers (Para SDK, etc.)
 */
export interface IWalletService extends ExternalService {
    /**
     * Create new MPC wallet for user
     * @param userId - User ID
     * @param walletType - Type of wallet to create
     * @returns Wallet creation result
     */
    createWallet(
        userId: string,
        walletType: WalletType,
    ): Promise<WalletCreationResult>;

    /**
     * Get wallet information
     * @param walletId - Wallet ID
     * @returns Wallet information
     */
    getWallet(walletId: string): Promise<WalletInfo | null>;

    /**
     * Get user's wallets
     * @param userId - User ID
     * @returns Array of wallet information
     */
    getUserWallets(userId: string): Promise<WalletInfo[]>;

    /**
     * Get wallet balance
     * @param walletId - Wallet ID
     * @param tokenType - Token type
     * @returns Balance information
     */
    getBalance(walletId: string, tokenType: TokenType): Promise<BalanceInfo>;

    /**
     * Get all wallet balances
     * @param walletId - Wallet ID
     * @returns Array of balance information
     */
    getAllBalances(walletId: string): Promise<BalanceInfo[]>;

    /**
     * Update wallet metadata
     * @param walletId - Wallet ID
     * @param metadata - Metadata to update
     * @returns Update result
     */
    updateWalletMetadata(
        walletId: string,
        metadata: Record<string, any>,
    ): Promise<WalletUpdateResult>;

    /**
     * Suspend wallet
     * @param walletId - Wallet ID
     * @param reason - Suspension reason
     * @returns Suspension result
     */
    suspendWallet(
        walletId: string,
        reason: string,
    ): Promise<WalletSuspensionResult>;

    /**
     * Activate wallet
     * @param walletId - Wallet ID
     * @returns Activation result
     */
    activateWallet(walletId: string): Promise<WalletActivationResult>;

    /**
     * Delete wallet
     * @param walletId - Wallet ID
     * @returns Deletion result
     */
    deleteWallet(walletId: string): Promise<WalletDeletionResult>;

    /**
     * Export wallet for backup
     * @param walletId - Wallet ID
     * @param userId - User ID for verification
     * @returns Wallet export data
     */
    exportWallet(walletId: string, userId: string): Promise<WalletExportResult>;

    /**
     * Import wallet from backup
     * @param exportData - Wallet export data
     * @param userId - User ID
     * @returns Import result
     */
    importWallet(
        exportData: WalletExportData,
        userId: string,
    ): Promise<WalletImportResult>;
}

/**
 * Wallet types - represents wallet providers/services
 */
export enum WalletType {
    PARA = 'para',
    PHANTOM = 'phantom',
    SOLFLARE = 'solflare',
    WEB3AUTH = 'web3auth',
}

/**
 * Token types
 */
export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL',
}

/**
 * Wallet creation result
 */
export interface WalletCreationResult {
    walletId: string;
    address: string;
    publicKey: string;
    walletType: WalletType;
    status: WalletStatus;
    createdAt: Date;
    metadata: Record<string, any>;
}

/**
 * Wallet information
 */
export interface WalletInfo {
    walletId: string;
    userId: string;
    address: string;
    publicKey: string;
    walletType: WalletType;
    status: WalletStatus;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, any>;
    balances: BalanceInfo[];
}

/**
 * Wallet status
 */
export enum WalletStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

/**
 * Balance information
 */
export interface BalanceInfo {
    tokenType: TokenType;
    balance: string;
    decimals: number;
    mintAddress: string;
    lastUpdated: Date;
}

/**
 * Wallet update result
 */
export interface WalletUpdateResult {
    walletId: string;
    success: boolean;
    updatedAt: Date;
    metadata: Record<string, any>;
}

/**
 * Wallet suspension result
 */
export interface WalletSuspensionResult {
    walletId: string;
    success: boolean;
    suspendedAt: Date;
    reason: string;
    status: WalletStatus;
}

/**
 * Wallet activation result
 */
export interface WalletActivationResult {
    walletId: string;
    success: boolean;
    activatedAt: Date;
    status: WalletStatus;
}

/**
 * Wallet deletion result
 */
export interface WalletDeletionResult {
    walletId: string;
    success: boolean;
    deletedAt: Date;
    status: WalletStatus;
}

/**
 * Wallet export result
 */
export interface WalletExportResult {
    walletId: string;
    exportData: WalletExportData;
    exportedAt: Date;
    expiresAt: Date;
}

/**
 * Wallet export data
 */
export interface WalletExportData {
    walletId: string;
    userId: string;
    address: string;
    publicKey: string;
    walletType: WalletType;
    encryptedData: string;
    checksum: string;
    version: string;
    exportedAt: Date;
}

/**
 * Wallet import result
 */
export interface WalletImportResult {
    walletId: string;
    success: boolean;
    importedAt: Date;
    status: WalletStatus;
}
