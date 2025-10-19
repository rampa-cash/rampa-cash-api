import { Injectable, Logger } from '@nestjs/common';
import { IWalletService } from '../interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../interfaces/wallet-balance-service.interface';
import { IUserService } from '../../user/interfaces/user-service.interface';
import { CreateWalletDto } from '../dto/wallet.dto';
import { Wallet } from '../entities/wallet.entity';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { User } from '../../user/entities/user.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import {
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';

/**
 * WalletApplicationService
 *
 * @description Application service that orchestrates wallet operations by coordinating
 * between domain services. This service handles the complete wallet management flow including
 * validation, user verification, wallet creation, and balance management.
 *
 * @example
 * ```typescript
 * // Create a wallet
 * const wallet = await walletApplicationService.createWallet(
 *   userId,
 *   createWalletDto
 * );
 *
 * // Get wallet with balances
 * const walletWithBalances = await walletApplicationService.getWalletWithBalances(
 *   walletId,
 *   userId
 * );
 * ```
 */
@Injectable()
export class WalletApplicationService {
    private readonly logger = new Logger(WalletApplicationService.name);

    constructor(
        private readonly walletService: IWalletService,
        private readonly walletBalanceService: IWalletBalanceService,
        private readonly userService: IUserService,
    ) {}

    /**
     * Creates a new wallet for a user
     * @param userId - ID of the user
     * @param createWalletDto - Wallet creation data
     * @returns Created wallet entity
     */
    async createWallet(
        userId: string,
        createWalletDto: CreateWalletDto,
    ): Promise<Wallet> {
        this.logger.debug(`Creating wallet for user ${userId}`);

        // Validate user exists and is active
        const user = await this.validateUser(userId);

        // Validate wallet data
        await this.validateWalletData(createWalletDto);

        // Check if user already has a wallet with this address
        await this.validateWalletUniqueness(createWalletDto.address, userId);

        // Create the wallet
        const wallet = await this.walletService.create(
            userId,
            createWalletDto.address,
            createWalletDto.publicKey,
            createWalletDto.walletAddresses,
        );

        // Initialize wallet balances for all supported tokens
        await this.initializeWalletBalances(wallet.id);

        this.logger.log(
            `Wallet ${wallet.id} created successfully for user ${userId}`,
        );
        return wallet;
    }

    /**
     * Gets a wallet with all its balances
     * @param walletId - ID of the wallet
     * @param userId - ID of the user (for authorization)
     * @returns Wallet entity with balances
     */
    async getWalletWithBalances(
        walletId: string,
        userId: string,
    ): Promise<{ wallet: Wallet; balances: WalletBalance[] }> {
        this.logger.debug(
            `Getting wallet ${walletId} with balances for user ${userId}`,
        );

        // Get the wallet
        const wallet = await this.walletService.findOne(walletId);

        // Check if user owns this wallet
        if (wallet.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to view this wallet',
            );
        }

        // Get all balances for this wallet
        const balances =
            await this.walletBalanceService.getAllBalances(walletId);

        return { wallet, balances };
    }

    /**
     * Gets all wallets for a user with their balances
     * @param userId - ID of the user
     * @returns Array of wallet entities with balances
     */
    async getUserWalletsWithBalances(
        userId: string,
    ): Promise<{ wallet: Wallet; balances: WalletBalance[] }[]> {
        this.logger.debug(
            `Getting all wallets with balances for user ${userId}`,
        );

        // Validate user exists
        await this.validateUser(userId);

        // Get all wallets for the user
        const wallets = await this.walletService.findAllByUserId(userId);

        // Get balances for each wallet
        const walletsWithBalances = await Promise.all(
            wallets.map(async (wallet) => {
                const balances = await this.walletBalanceService.getAllBalances(
                    wallet.id,
                );
                return { wallet, balances };
            }),
        );

        return walletsWithBalances;
    }

    /**
     * Updates wallet status
     * @param walletId - ID of the wallet
     * @param userId - ID of the user (for authorization)
     * @param status - New wallet status
     * @returns Updated wallet entity
     */
    async updateWalletStatus(
        walletId: string,
        userId: string,
        status: WalletStatus,
    ): Promise<Wallet> {
        this.logger.debug(`Updating wallet ${walletId} status to ${status}`);

        // Get the wallet
        const wallet = await this.walletService.findOne(walletId);

        // Check if user owns this wallet
        if (wallet.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to update this wallet',
            );
        }

        // Update wallet status
        const updatedWallet = await this.walletService.update(walletId, {
            status,
        });

        this.logger.log(`Wallet ${walletId} status updated to ${status}`);
        return updatedWallet;
    }

    /**
     * Gets wallet balance for a specific token
     * @param walletId - ID of the wallet
     * @param userId - ID of the user (for authorization)
     * @param tokenType - Type of token
     * @returns Wallet balance
     */
    async getWalletBalance(
        walletId: string,
        userId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance> {
        this.logger.debug(
            `Getting wallet ${walletId} balance for token ${tokenType}`,
        );

        // Get the wallet
        const wallet = await this.walletService.findOne(walletId);

        // Check if user owns this wallet
        if (wallet.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to view this wallet',
            );
        }

        // Get the balance
        const balanceAmount = await this.walletBalanceService.getBalance(
            walletId,
            tokenType,
        );

        // Create a WalletBalance object to return
        const balance = new WalletBalance();
        balance.walletId = walletId;
        balance.tokenType = tokenType;
        balance.balance = balanceAmount;

        return balance;
    }

    /**
     * Syncs wallet balance with blockchain
     * @param walletId - ID of the wallet
     * @param userId - ID of the user (for authorization)
     * @param tokenType - Type of token
     * @returns Updated wallet balance
     */
    async syncWalletBalance(
        walletId: string,
        userId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance> {
        this.logger.debug(
            `Syncing wallet ${walletId} balance for token ${tokenType}`,
        );

        // Get the wallet
        const wallet = await this.walletService.findOne(walletId);

        // Check if user owns this wallet
        if (wallet.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to sync this wallet',
            );
        }

        // Sync the balance
        const updatedBalance =
            await this.walletBalanceService.syncBalanceWithBlockchain(
                walletId,
                tokenType,
            );

        this.logger.log(
            `Wallet ${walletId} balance synced for token ${tokenType}`,
        );
        return updatedBalance;
    }

    /**
     * Deletes a wallet
     * @param walletId - ID of the wallet
     * @param userId - ID of the user (for authorization)
     */
    async deleteWallet(walletId: string, userId: string): Promise<void> {
        this.logger.debug(`Deleting wallet ${walletId}`);

        // Get the wallet
        const wallet = await this.walletService.findOne(walletId);

        // Check if user owns this wallet
        if (wallet.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to delete this wallet',
            );
        }

        // Check if wallet has any non-zero balances
        const balances =
            await this.walletBalanceService.getAllBalances(walletId);
        const hasNonZeroBalances = balances.some(
            (balance) => balance.balance > 0,
        );

        if (hasNonZeroBalances) {
            throw new BadRequestException(
                'Cannot delete wallet with non-zero balances',
            );
        }

        // Delete all wallet balances first
        await this.walletBalanceService.initializeWalletBalances(walletId);

        // Delete the wallet
        await this.walletService.remove(walletId);

        this.logger.log(`Wallet ${walletId} deleted successfully`);
    }

    /**
     * Validates user exists and is active
     * @param userId - ID of the user
     * @returns User entity
     */
    private async validateUser(userId: string): Promise<User> {
        const user = await this.userService.findOne(userId);

        if (user.status !== 'active') {
            throw new ForbiddenException('User account is not active');
        }

        return user;
    }

    /**
     * Validates wallet data
     * @param createWalletDto - Wallet creation data
     */
    private async validateWalletData(
        createWalletDto: CreateWalletDto,
    ): Promise<void> {
        // Validate address is provided
        if (!createWalletDto.address) {
            throw new BadRequestException('Wallet address is required');
        }

        // Validate address format (basic validation)
        if (createWalletDto.address.length < 32) {
            throw new BadRequestException('Invalid wallet address format');
        }

        // Validate public key is provided
        if (!createWalletDto.publicKey) {
            throw new BadRequestException('Wallet public key is required');
        }

        // For MVP: Only Web3Auth wallets are supported, no validation needed
    }

    /**
     * Validates wallet address uniqueness
     * @param address - Wallet address
     * @param userId - ID of the user
     */
    private async validateWalletUniqueness(
        address: string,
        userId: string,
    ): Promise<void> {
        const existingWallet = await this.walletService.findByAddress(address);
        if (existingWallet) {
            throw new BadRequestException('Wallet address already exists');
        }
    }

    /**
     * Initializes wallet balances for all supported tokens
     * @param walletId - ID of the wallet
     */
    private async initializeWalletBalances(walletId: string): Promise<void> {
        this.logger.debug(
            `Initializing wallet balances for wallet ${walletId}`,
        );

        const supportedTokens = Object.values(TokenType);

        for (const tokenType of supportedTokens) {
            await this.walletBalanceService.setBalance(walletId, tokenType, 0);
        }

        this.logger.log(`Wallet balances initialized for wallet ${walletId}`);
    }
}
