import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicKey } from '@solana/web3.js';
import { Wallet } from '../entities/wallet.entity';
import { User } from '../../user/entities/user.entity';

export interface ResolvedWallet {
    walletId: string;
    userId: string;
    wallet: Wallet;
    user: User;
}

@Injectable()
export class AddressResolutionService {
    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    /**
     * Resolve a wallet address to user and wallet information
     * @param address - Solana wallet address
     * @returns Resolved wallet information
     * @throws NotFoundException if address not found
     * @throws BadRequestException if address is invalid
     */
    async resolveWalletAddress(address: string): Promise<ResolvedWallet> {
        // Validate Solana address format
        this.validateSolanaAddress(address);

        // Find wallet by address
        const wallet = await this.walletRepository.findOne({
            where: { address },
            relations: ['user'],
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet address ${address} not found`);
        }

        if (!wallet.user) {
            throw new NotFoundException(`User not found for wallet ${address}`);
        }

        return {
            walletId: wallet.id,
            userId: wallet.user.id,
            wallet,
            user: wallet.user,
        };
    }

    /**
     * Resolve a wallet address to user information only
     * @param address - Solana wallet address
     * @returns User information
     * @throws NotFoundException if address not found
     * @throws BadRequestException if address is invalid
     */
    async resolveUserByAddress(address: string): Promise<User> {
        const resolved = await this.resolveWalletAddress(address);
        return resolved.user;
    }

    /**
     * Check if a wallet address exists in the system
     * @param address - Solana wallet address
     * @returns True if address exists, false otherwise
     */
    async addressExists(address: string): Promise<boolean> {
        try {
            this.validateSolanaAddress(address);
            const count = await this.walletRepository.count({
                where: { address },
            });
            return count > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get all wallet addresses for a user
     * @param userId - User ID
     * @returns Array of wallet addresses
     */
    async getUserWalletAddresses(userId: string): Promise<string[]> {
        const wallets = await this.walletRepository.find({
            where: { userId },
            select: ['address'],
        });

        return wallets.map((wallet) => wallet.address);
    }

    /**
     * Validate Solana address format
     * @param address - Address to validate
     * @throws BadRequestException if address is invalid
     */
    private validateSolanaAddress(address: string): void {
        try {
            new PublicKey(address);
        } catch (error) {
            throw new BadRequestException(`Invalid Solana address: ${address}`);
        }
    }

    /**
     * Resolve multiple wallet addresses at once
     * @param addresses - Array of Solana wallet addresses
     * @returns Array of resolved wallet information
     */
    async resolveMultipleAddresses(
        addresses: string[],
    ): Promise<ResolvedWallet[]> {
        // Validate all addresses first
        addresses.forEach((address) => this.validateSolanaAddress(address));

        const wallets = await this.walletRepository.find({
            where: addresses.map((address) => ({ address })),
            relations: ['user'],
        });

        return wallets.map((wallet) => ({
            walletId: wallet.id,
            userId: wallet.user.id,
            wallet,
            user: wallet.user,
        }));
    }

    /**
     * Search for wallets by partial address match
     * @param partialAddress - Partial address to search for
     * @param limit - Maximum number of results (default: 10)
     * @returns Array of matching wallets
     */
    async searchWalletsByAddress(
        partialAddress: string,
        limit: number = 10,
    ): Promise<Wallet[]> {
        if (partialAddress.length < 4) {
            throw new BadRequestException(
                'Search term must be at least 4 characters',
            );
        }

        return this.walletRepository
            .createQueryBuilder('wallet')
            .leftJoinAndSelect('wallet.user', 'user')
            .where('wallet.address ILIKE :partialAddress', {
                partialAddress: `%${partialAddress}%`,
            })
            .limit(limit)
            .getMany();
    }
}
