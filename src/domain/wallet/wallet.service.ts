import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletType, WalletStatus } from './entities/wallet.entity';
import { WalletBalance, TokenType } from './entities/wallet-balance.entity';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
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
        // Check if user already has an active wallet
        const existingWallet = await this.walletRepository.findOne({
            where: { userId, isActive: true },
        });

        if (existingWallet) {
            throw new ConflictException('User already has an active wallet');
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
            walletType,
            walletAddresses,
            isActive: true,
            status: WalletStatus.ACTIVE,
        });

        const savedWallet = await this.walletRepository.save(wallet);

        // Initialize wallet balances for all supported tokens
        await this.initializeWalletBalances(savedWallet.id);

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
            relations: ['balances'],
        });
    }

    async findAllByUserId(userId: string): Promise<Wallet[]> {
        return await this.walletRepository.find({
            where: { userId, isActive: true },
            relations: ['balances'],
        });
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

    async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
        const balance = await this.walletBalanceRepository.findOne({
            where: { walletId, tokenType },
        });

        return balance ? balance.balance : 0;
    }

    async updateBalance(
        walletId: string,
        tokenType: TokenType,
        newBalance: number,
    ): Promise<WalletBalance> {
        if (newBalance < 0) {
            throw new BadRequestException('Balance cannot be negative');
        }

        let balance = await this.walletBalanceRepository.findOne({
            where: { walletId, tokenType },
        });

        if (balance) {
            balance.balance = newBalance;
            balance.lastUpdated = new Date();
        } else {
            balance = this.walletBalanceRepository.create({
                walletId,
                tokenType,
                balance: newBalance,
                lastUpdated: new Date(),
            });
        }

        return await this.walletBalanceRepository.save(balance);
    }

    async addBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const currentBalance = await this.getBalance(walletId, tokenType);
        const newBalance = currentBalance + amount;

        return await this.updateBalance(walletId, tokenType, newBalance);
    }

    async subtractBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        const currentBalance = await this.getBalance(walletId, tokenType);

        if (currentBalance < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        const newBalance = currentBalance - amount;
        return await this.updateBalance(walletId, tokenType, newBalance);
    }

    async getAllBalances(walletId: string): Promise<WalletBalance[]> {
        return await this.walletBalanceRepository.find({
            where: { walletId },
        });
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

    private async initializeWalletBalances(walletId: string): Promise<void> {
        const tokenTypes = Object.values(TokenType);

        for (const tokenType of tokenTypes) {
            const balance = this.walletBalanceRepository.create({
                walletId,
                tokenType,
                balance: 0,
                lastUpdated: new Date(),
            });

            await this.walletBalanceRepository.save(balance);
        }
    }
}
