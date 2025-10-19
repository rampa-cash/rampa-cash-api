import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletType } from '../entities/wallet.entity';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { WalletBalanceService } from './wallet-balance.service';
import { IWalletService } from '../interfaces/wallet-service.interface';

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
        walletType: WalletType,
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet> {
        // Validate multiple wallet business rules
        await this.validateMultipleWalletRules(userId, walletType);

        // Check if wallet address already exists
        const existingAddress = await this.walletRepository.findOne({
            where: { address },
        });

        if (existingAddress) {
            throw new ConflictException('Wallet address already exists');
        }

        // Check if this will be the first wallet for the user
        const userWallets = await this.walletRepository.find({
            where: { userId, isActive: true },
        });

        const wallet = this.walletRepository.create({
            userId,
            address,
            publicKey,
            walletType,
            walletAddresses,
            isActive: true,
            status: WalletStatus.ACTIVE,
            isPrimary: userWallets.length === 0, // First wallet is primary
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
        // Optimized query: Use composite index for better performance
        return await this.walletRepository
            .createQueryBuilder('wallet')
            .leftJoinAndSelect('wallet.balances', 'balances')
            .where('wallet.userId = :userId', { userId })
            .andWhere('wallet.isActive = :isActive', { isActive: true })
            .orderBy('wallet.isPrimary', 'DESC') // Primary wallet first
            .addOrderBy('wallet.createdAt', 'ASC') // Then by creation date
            .getOne();
    }

    async findAllByUserId(userId: string): Promise<Wallet[]> {
        // Optimized query: Use composite index and select only needed fields
        return await this.walletRepository
            .createQueryBuilder('wallet')
            .leftJoinAndSelect('wallet.balances', 'balances')
            .where('wallet.userId = :userId', { userId })
            .andWhere('wallet.isActive = :isActive', { isActive: true })
            .orderBy('wallet.isPrimary', 'DESC') // Primary wallet first
            .addOrderBy('wallet.createdAt', 'ASC') // Then by creation date
            .getMany();
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
     * Validates business rules for multiple wallets per user
     */
    private async validateMultipleWalletRules(
        userId: string,
        walletType: WalletType,
    ): Promise<void> {
        const userWallets = await this.walletRepository.find({
            where: { userId, isActive: true },
        });

        // Business rule: Only one Web3Auth MPC wallet per user
        if (walletType === WalletType.WEB3AUTH_MPC) {
            const existingWeb3AuthWallet = userWallets.find(
                (wallet) => wallet.walletType === WalletType.WEB3AUTH_MPC,
            );

            if (existingWeb3AuthWallet) {
                throw new ConflictException(
                    'User can only have one Web3Auth MPC wallet',
                );
            }
        }

        // Business rule: Maximum 5 wallets per user (configurable)
        const maxWalletsPerUser = 5;
        if (userWallets.length >= maxWalletsPerUser) {
            throw new ConflictException(
                `User cannot have more than ${maxWalletsPerUser} wallets`,
            );
        }

        // Business rule: Only one primary wallet per user
        const primaryWallet = userWallets.find((wallet) => wallet.isPrimary);
        if (walletType === WalletType.WEB3AUTH_MPC && !primaryWallet) {
            // Web3Auth MPC wallet should be primary if it's the first wallet
            if (userWallets.length === 0) {
                // This will be set as primary in the create method
            }
        }
    }

    /**
     * Gets the primary wallet for a user
     */
    async findPrimaryByUserId(userId: string): Promise<Wallet | null> {
        return await this.walletRepository.findOne({
            where: { userId, isPrimary: true, isActive: true },
            relations: ['balances'],
        });
    }

    /**
     * Sets a wallet as primary (and unsets others)
     */
    async setAsPrimary(walletId: string, userId: string): Promise<Wallet> {
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId, userId, isActive: true },
        });

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        // Unset all other primary wallets for this user
        await this.walletRepository.update(
            { userId, isPrimary: true },
            { isPrimary: false },
        );

        // Set this wallet as primary
        wallet.isPrimary = true;
        return await this.walletRepository.save(wallet);
    }

    /**
     * Deactivates a wallet (soft delete)
     */
    async deactivate(walletId: string, userId: string): Promise<Wallet> {
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId, userId, isActive: true },
        });

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        // Don't allow deactivating the primary wallet if there are other active wallets
        if (wallet.isPrimary) {
            const otherActiveWallets = await this.walletRepository.find({
                where: { userId, isActive: true, id: walletId },
            });

            if (otherActiveWallets.length > 0) {
                throw new ConflictException(
                    'Cannot deactivate primary wallet when other wallets exist',
                );
            }
        }

        wallet.isActive = false;
        const updatedWallet = await this.walletRepository.save(wallet);
        return updatedWallet;
    }
}
