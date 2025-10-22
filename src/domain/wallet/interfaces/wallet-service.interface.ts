import { Wallet, WalletType } from '../entities/wallet.entity';

/**
 * Interface for Wallet Service operations
 * Defines the contract for wallet management operations
 */
export interface IWalletService {
    /**
     * Creates a new Web3Auth wallet for a user
     * @param userId - The ID of the user
     * @param address - The wallet address
     * @param publicKey - The wallet public key
     * @param walletAddresses - Optional Web3Auth wallet addresses
     * @returns Promise<Wallet> - The created wallet
     */
    create(
        userId: string,
        address: string,
        publicKey: string,
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet>;

    /**
     * Finds a wallet by its ID
     * @param id - The wallet ID
     * @returns Promise<Wallet> - The wallet if found
     * @throws NotFoundException if wallet not found
     */
    findOne(id: string): Promise<Wallet>;

    /**
     * Finds the primary wallet for a user
     * @param userId - The user ID
     * @returns Promise<Wallet | null> - The primary wallet or null
     */
    findByUserId(userId: string): Promise<Wallet | null>;

    /**
     * Finds all wallets for a user
     * @param userId - The user ID
     * @returns Promise<Wallet[]> - Array of user wallets
     */
    findAllByUserId(userId: string): Promise<Wallet[]>;

    /**
     * Finds a wallet by its address
     * @param address - The wallet address
     * @returns Promise<Wallet | null> - The wallet or null
     */
    findByAddress(address: string): Promise<Wallet | null>;

    /**
     * Finds all active wallets
     * @returns Promise<Wallet[]> - Array of all active wallets
     */
    findAll(): Promise<Wallet[]>;

    /**
     * Updates a wallet
     * @param id - The wallet ID
     * @param updateData - Partial wallet data to update
     * @returns Promise<Wallet> - The updated wallet
     */
    update(id: string, updateData: Partial<Wallet>): Promise<Wallet>;

    /**
     * Removes a wallet (soft delete)
     * @param id - The wallet ID
     * @returns Promise<void>
     */
    remove(id: string): Promise<void>;

    /**
     * Suspends a wallet
     * @param id - The wallet ID
     * @returns Promise<Wallet> - The suspended wallet
     */
    suspend(id: string): Promise<Wallet>;

    /**
     * Activates a wallet
     * @param id - The wallet ID
     * @returns Promise<Wallet> - The activated wallet
     */
    activate(id: string): Promise<Wallet>;

    /**
     * Updates wallet addresses (for Web3Auth wallets)
     * @param id - The wallet ID
     * @param walletAddresses - The new wallet addresses
     * @returns Promise<Wallet> - The updated wallet
     */
    updateWalletAddresses(
        id: string,
        walletAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet>;

    /**
     * Gets the wallet for a user (since each user has only one Web3Auth wallet)
     * @param userId - The user ID
     * @returns Promise<Wallet | null> - The wallet or null
     */
    findPrimaryByUserId(userId: string): Promise<Wallet | null>;
}
