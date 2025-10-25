import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { WalletBalanceService } from './wallet-balance.service';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import {
    IWalletService,
    WalletType,
    TokenType,
    WalletCreationResult,
    WalletInfo,
    BalanceInfo,
    WalletUpdateResult,
    WalletSuspensionResult,
    WalletActivationResult,
    WalletDeletionResult,
    WalletExportResult,
    WalletExportData,
    WalletImportResult,
} from '../interfaces/wallet-service.interface';

@Injectable()
export class WalletService implements IWalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        private walletBalanceService: WalletBalanceService,
    ) {}

    async create(
        userId: string,
        address: string,
        publicKey: string,
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet> {
        // Check if user already has a wallet (only one wallet per user for MVP)
        const existingWallet = await this.walletRepository.findOne({
            where: { userId, isActive: true },
        });

        if (existingWallet) {
            throw new ConflictException('User already has a wallet');
        }

        // Check if wallet address already exists
        const existingAddress = await this.walletRepository.findOne({
            where: { address },
        });

        if (existingAddress) {
            throw new ConflictException('Wallet address already exists');
        }

        const wallet = this.walletRepository.create({
            userId,
            address,
            publicKey,
            walletType: WalletType.PARA, // Using Para wallet provider
            walletAddresses,
            isActive: true,
            status: WalletStatus.ACTIVE,
        });

        const savedWallet = await this.walletRepository.save(wallet);

        // Initialize wallet balances for all supported tokens
        await this.walletBalanceService.initializeWalletBalances(
            savedWallet.id,
        );

        return savedWallet;
    }

    async findOne(id: string): Promise<Wallet> {
        const wallet = await this.walletRepository.findOne({
            where: { id, isActive: true },
            relations: ['user', 'balances'],
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet with ID ${id} not found`);
        }

        return wallet;
    }

    async findByUserId(userId: string): Promise<Wallet | null> {
        return await this.walletRepository.findOne({
            where: { userId, isActive: true },
            relations: ['user', 'balances'],
        });
    }

    async findAllByUserId(userId: string): Promise<Wallet[]> {
        // For MVP: Each user has only one wallet
        const wallet = await this.findByUserId(userId);
        return wallet ? [wallet] : [];
    }

    async findByAddress(address: string): Promise<Wallet | null> {
        return await this.walletRepository.findOne({
            where: { address, isActive: true },
            relations: ['user', 'balances'],
        });
    }

    async findAll(): Promise<Wallet[]> {
        return await this.walletRepository.find({
            where: { isActive: true },
            relations: ['user', 'balances'],
        });
    }

    async findActiveWallets(): Promise<Wallet[]> {
        return await this.walletRepository.find({
            where: { isActive: true },
            select: ['id', 'address', 'userId', 'status'],
        });
    }

    async update(id: string, updateData: Partial<Wallet>): Promise<Wallet> {
        const wallet = await this.findOne(id);

        // Check for address conflicts if address is being updated
        if (updateData.address && updateData.address !== wallet.address) {
            const existingWallet = await this.walletRepository.findOne({
                where: { address: updateData.address },
            });

            if (existingWallet) {
                throw new ConflictException('Wallet address already exists');
            }
        }

        Object.assign(wallet, updateData);
        return await this.walletRepository.save(wallet);
    }

    async remove(id: string): Promise<void> {
        const wallet = await this.findOne(id);

        // Soft delete - set isActive to false
        wallet.isActive = false;
        await this.walletRepository.save(wallet);
    }

    async suspend(id: string): Promise<Wallet> {
        const wallet = await this.findOne(id);
        wallet.status = WalletStatus.SUSPENDED;
        return await this.walletRepository.save(wallet);
    }

    async activate(id: string): Promise<Wallet> {
        const wallet = await this.findOne(id);
        wallet.status = WalletStatus.ACTIVE;
        return await this.walletRepository.save(wallet);
    }

    async updateWalletAddresses(
        id: string,
        walletAddresses: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet> {
        const wallet = await this.findOne(id);
        wallet.walletAddresses = walletAddresses;
        return await this.walletRepository.save(wallet);
    }

    /**
     * Gets the wallet for a user (since each user has only one wallet for MVP)
     */
    async findPrimaryByUserId(userId: string): Promise<Wallet | null> {
        return await this.findByUserId(userId);
    }

    // ===== ExternalService Interface Implementation =====

    /**
     * Health check for the external service
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Simple health check - verify database connection
            await this.walletRepository.count();
            return true;
        } catch (error) {
            this.logger.error('Wallet service health check failed', error);
            return false;
        }
    }

    /**
     * Get service configuration
     */
    getConfiguration(): Record<string, any> {
        return {
            serviceName: 'WalletService',
            version: '1.0.0',
            supportedWalletTypes: Object.values(WalletType),
            supportedTokenTypes: Object.values(TokenType),
        };
    }

    /**
     * Initialize the service
     */
    async initialize(): Promise<void> {
        this.logger.log('Initializing WalletService');
        // Service is ready after constructor
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        this.logger.log('Cleaning up WalletService');
        // No specific cleanup needed for this service
    }

    // ===== IWalletService Interface Implementation =====

    /**
     * Create new MPC wallet for user
     */
    async createWallet(
        userId: string,
        walletType: WalletType,
    ): Promise<WalletCreationResult> {
        // For now, we'll create a placeholder wallet since Para SDK integration is pending
        // This will be replaced with actual Para SDK implementation
        const address = `placeholder_${Date.now()}`;
        const publicKey = `pubkey_${Date.now()}`;

        const wallet = await this.create(userId, address, publicKey);

        return {
            walletId: wallet.id,
            address: wallet.address,
            publicKey: wallet.publicKey,
            walletType: wallet.walletType as WalletType,
            status: wallet.status,
            createdAt: wallet.createdAt,
            metadata: wallet.walletMetadata || {},
        };
    }

    /**
     * Get wallet information
     */
    async getWallet(walletId: string): Promise<WalletInfo | null> {
        const wallet = await this.findOne(walletId);
        if (!wallet) return null;

        const balances =
            await this.walletBalanceService.getAllBalances(walletId);

        return {
            walletId: wallet.id,
            userId: wallet.userId,
            address: wallet.address,
            publicKey: wallet.publicKey,
            walletType: wallet.walletType as WalletType,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
            metadata: wallet.walletMetadata || {},
            balances: balances.map((b) => ({
                tokenType: b.tokenType,
                balance: b.balance.toString(),
                decimals: this.getTokenDecimals(b.tokenType),
                mintAddress: this.getTokenMintAddress(b.tokenType),
                lastUpdated: b.updatedAt,
            })),
        };
    }

    /**
     * Get user's wallets
     */
    async getUserWallets(userId: string): Promise<WalletInfo[]> {
        const wallets = await this.findAllByUserId(userId);
        const walletInfos: WalletInfo[] = [];

        for (const wallet of wallets) {
            const balances = await this.walletBalanceService.getAllBalances(
                wallet.id,
            );
            walletInfos.push({
                walletId: wallet.id,
                userId: wallet.userId,
                address: wallet.address,
                publicKey: wallet.publicKey,
                walletType: wallet.walletType as WalletType,
                status: wallet.status,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
                metadata: wallet.walletMetadata || {},
                balances: balances.map((b) => ({
                    tokenType: b.tokenType,
                    balance: b.balance.toString(),
                    decimals: this.getTokenDecimals(b.tokenType),
                    mintAddress: this.getTokenMintAddress(b.tokenType),
                    lastUpdated: b.updatedAt,
                })),
            });
        }

        return walletInfos;
    }

    /**
     * Get wallet balance
     */
    async getBalance(
        walletId: string,
        tokenType: TokenType,
    ): Promise<BalanceInfo> {
        const balances =
            await this.walletBalanceService.getAllBalances(walletId);
        const balance = balances.find((b) => b.tokenType === tokenType);

        if (!balance) {
            throw new Error(`Balance not found for token type: ${tokenType}`);
        }

        return {
            tokenType: balance.tokenType,
            balance: balance.balance.toString(),
            decimals: this.getTokenDecimals(balance.tokenType),
            mintAddress: this.getTokenMintAddress(balance.tokenType),
            lastUpdated: balance.updatedAt,
        };
    }

    /**
     * Get all wallet balances
     */
    async getAllBalances(walletId: string): Promise<BalanceInfo[]> {
        const balances =
            await this.walletBalanceService.getAllBalances(walletId);
        return balances.map((b) => ({
            tokenType: b.tokenType,
            balance: b.balance.toString(),
            decimals: this.getTokenDecimals(b.tokenType),
            mintAddress: this.getTokenMintAddress(b.tokenType),
            lastUpdated: b.updatedAt,
        }));
    }

    /**
     * Update wallet metadata
     */
    async updateWalletMetadata(
        walletId: string,
        metadata: Record<string, any>,
    ): Promise<WalletUpdateResult> {
        const wallet = await this.findOne(walletId);
        wallet.walletMetadata = { ...wallet.walletMetadata, ...metadata };
        await this.walletRepository.save(wallet);

        return {
            walletId,
            success: true,
            updatedAt: new Date(),
            metadata,
        };
    }

    /**
     * Suspend wallet
     */
    async suspendWallet(
        walletId: string,
        reason: string,
    ): Promise<WalletSuspensionResult> {
        await this.suspend(walletId);
        return {
            walletId,
            success: true,
            suspendedAt: new Date(),
            reason,
            status: WalletStatus.SUSPENDED,
        };
    }

    /**
     * Activate wallet
     */
    async activateWallet(walletId: string): Promise<WalletActivationResult> {
        await this.activate(walletId);
        return {
            walletId,
            success: true,
            activatedAt: new Date(),
            status: WalletStatus.ACTIVE,
        };
    }

    /**
     * Delete wallet
     */
    async deleteWallet(walletId: string): Promise<WalletDeletionResult> {
        await this.remove(walletId);
        return {
            walletId,
            success: true,
            deletedAt: new Date(),
            status: WalletStatus.DELETED,
        };
    }

    /**
     * Export wallet for backup
     */
    async exportWallet(
        walletId: string,
        userId: string,
    ): Promise<WalletExportResult> {
        const wallet = await this.findOne(walletId);
        if (!wallet || wallet.userId !== userId) {
            throw new Error('Wallet not found or access denied');
        }

        const exportedAt = new Date();
        const expiresAt = new Date(exportedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        return {
            walletId: wallet.id,
            exportData: {
                walletId: wallet.id,
                userId: wallet.userId,
                address: wallet.address,
                publicKey: wallet.publicKey,
                walletType: wallet.walletType as WalletType,
                encryptedData: JSON.stringify(wallet.walletMetadata || {}), // Simple encryption placeholder
                checksum: this.generateChecksum(wallet),
                version: '1.0.0',
                exportedAt,
            },
            exportedAt,
            expiresAt,
        };
    }

    /**
     * Import wallet from backup
     */
    async importWallet(
        exportData: WalletExportData,
        userId: string,
    ): Promise<WalletImportResult> {
        // For now, this is a placeholder implementation
        // In a real scenario, this would validate the export data and create the wallet
        throw new Error(
            'Wallet import not yet implemented - requires Para SDK integration',
        );
    }

    // ===== Helper Methods =====

    /**
     * Get token decimals for a given token type
     */
    private getTokenDecimals(tokenType: TokenType): number {
        const decimalsMap = {
            [TokenType.USDC]: 6,
            [TokenType.EURC]: 6,
            [TokenType.SOL]: 9,
        };
        return decimalsMap[tokenType] || 6;
    }

    /**
     * Get mint address for a given token type
     */
    private getTokenMintAddress(tokenType: TokenType): string {
        const mintAddressMap = {
            [TokenType.USDC]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint address
            [TokenType.EURC]: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp', // EURC mint address
            [TokenType.SOL]: 'So11111111111111111111111111111111111111112', // Wrapped SOL mint address
        };
        return mintAddressMap[tokenType] || '';
    }

    /**
     * Generate checksum for wallet export
     */
    private generateChecksum(wallet: Wallet): string {
        // Simple checksum generation - in production, use proper cryptographic hash
        const data = `${wallet.id}-${wallet.address}-${wallet.publicKey}-${wallet.createdAt.getTime()}`;
        return Buffer.from(data).toString('base64').slice(0, 16);
    }
}
