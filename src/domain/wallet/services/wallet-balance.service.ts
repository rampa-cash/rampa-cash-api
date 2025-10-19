import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from '../entities/wallet-balance.entity';
import { Wallet } from '../entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { SolanaService } from '../../solana/services/solana.service';
import { IWalletBalanceService } from '../interfaces/wallet-balance-service.interface';
import { EventBusService } from '../../common/services/event-bus.service';
import { WalletBalanceUpdatedEvent } from '../events/wallet-balance-updated.event';

@Injectable()
export class WalletBalanceService implements IWalletBalanceService {
    private readonly logger = new Logger(WalletBalanceService.name);

    constructor(
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        private solanaService: SolanaService,
        private eventBus: EventBusService,
    ) {}

    /**
     * Get balance for a specific wallet and token type
     * Fetches real-time balance from Solana blockchain and updates local database
     */
    async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
        try {
            // Optimized query: Get only needed fields from wallet
            const wallet = await this.walletRepository.findOne({
                where: { id: walletId, isActive: true },
                select: ['id', 'address'], // Only select needed fields
            });

            if (!wallet) {
                throw new NotFoundException(
                    `Wallet with ID ${walletId} not found`,
                );
            }

            // Get real balance from Solana blockchain
            const tokenBalance = await this.solanaService.getTokenBalance(
                wallet.address,
                tokenType as any,
            );

            // Extract the actual balance amount
            const blockchainBalance = tokenBalance ? tokenBalance.uiAmount : 0;

            // Update local database with real balance
            await this.updateBalance(walletId, tokenType, blockchainBalance);

            this.logger.log(
                `Retrieved balance for wallet ${walletId}, token ${tokenType}: ${blockchainBalance}`,
            );
            return blockchainBalance;
        } catch (error) {
            this.logger.error(
                `Failed to get balance for wallet ${walletId}, token ${tokenType}:`,
                error,
            );

            // Fallback to database balance if blockchain call fails
            const balance = await this.getBalanceFromDatabase(
                walletId,
                tokenType,
            );
            return balance;
        }
    }

    /**
     * Get balance from database only (optimized query)
     */
    async getBalanceFromDatabase(
        walletId: string,
        tokenType: TokenType,
    ): Promise<number> {
        const result = await this.walletBalanceRepository
            .createQueryBuilder('balance')
            .select('balance.balance')
            .where('balance.walletId = :walletId', { walletId })
            .andWhere('balance.tokenType = :tokenType', { tokenType })
            .getRawOne();

        return result?.balance || 0;
    }

    /**
     * Update balance for a specific wallet and token type
     */
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

    /**
     * Add amount to wallet balance
     */
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

    /**
     * Subtract amount from wallet balance
     */
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

    /**
     * Get all balances for a wallet
     * Fetches real-time balances from Solana blockchain for all supported tokens
     */
    async getAllBalances(walletId: string): Promise<WalletBalance[]> {
        try {
            // Optimized query: Get only needed fields from wallet
            const wallet = await this.walletRepository.findOne({
                where: { id: walletId, isActive: true },
                select: ['id', 'address'], // Only select needed fields
            });

            if (!wallet) {
                throw new NotFoundException(
                    `Wallet with ID ${walletId} not found`,
                );
            }

            // Get all token balances from Solana blockchain
            const tokenTypes = Object.values(TokenType);
            const balances: WalletBalance[] = [];

            // Process tokens in parallel for better performance
            const balancePromises = tokenTypes.map(async (tokenType) => {
                try {
                    const tokenBalance =
                        await this.solanaService.getTokenBalance(
                            wallet.address,
                            tokenType as any,
                        );

                    // Extract the actual balance amount
                    const blockchainBalance = tokenBalance
                        ? tokenBalance.uiAmount
                        : 0;

                    // Update local database with real balance
                    const balance = await this.updateBalance(
                        walletId,
                        tokenType,
                        blockchainBalance,
                    );
                    return balance;
                } catch (error) {
                    this.logger.warn(
                        `Failed to get balance for token ${tokenType}:`,
                        error,
                    );

                    // Fallback to database balance
                    const balance = await this.walletBalanceRepository.findOne({
                        where: { walletId, tokenType },
                    });
                    return balance;
                }
            });

            const results = await Promise.allSettled(balancePromises);

            // Process results and collect successful balances
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    balances.push(result.value);
                } else {
                    this.logger.warn(
                        `Failed to get balance for token ${tokenTypes[index]}`,
                    );
                }
            });

            this.logger.log(`Retrieved all balances for wallet ${walletId}`);
            return balances;
        } catch (error) {
            this.logger.error(
                `Failed to get all balances for wallet ${walletId}:`,
                error,
            );

            // Fallback to database balances
            return await this.getAllBalancesFromDatabase(walletId);
        }
    }

    /**
     * Get all balances from database only (optimized query)
     */
    async getAllBalancesFromDatabase(
        walletId: string,
    ): Promise<WalletBalance[]> {
        return await this.walletBalanceRepository
            .createQueryBuilder('balance')
            .where('balance.walletId = :walletId', { walletId })
            .orderBy('balance.tokenType', 'ASC')
            .getMany();
    }

    /**
     * Initialize wallet balances for all supported tokens
     */
    async initializeWalletBalances(walletId: string): Promise<void> {
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

    /**
     * Check if wallet has sufficient balance for a transaction
     */
    async hasSufficientBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<boolean> {
        const balance = await this.getBalance(walletId, tokenType);
        return balance >= amount;
    }

    /**
     * Get total balance across all tokens for a wallet
     */
    async getTotalBalance(walletId: string): Promise<number> {
        const balances = await this.getAllBalances(walletId);
        return balances.reduce((total, balance) => total + balance.balance, 0);
    }

    /**
     * Set balance for a wallet
     */
    async setBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        if (amount < 0) {
            throw new BadRequestException('Balance cannot be negative');
        }

        let walletBalance = await this.walletBalanceRepository.findOne({
            where: { walletId, tokenType },
        });

        const previousBalance = walletBalance?.balance || 0;
        const balanceChange = amount - previousBalance;

        if (!walletBalance) {
            walletBalance = this.walletBalanceRepository.create({
                walletId,
                tokenType,
                balance: amount,
            });
        } else {
            walletBalance.balance = amount;
        }

        walletBalance.lastUpdated = new Date();
        const savedBalance =
            await this.walletBalanceRepository.save(walletBalance);

        // Get wallet to find userId for the event
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId },
            select: ['id', 'userId'],
        });

        if (wallet && balanceChange !== 0) {
            // Publish WalletBalanceUpdated event
            const event = new WalletBalanceUpdatedEvent(
                walletId,
                wallet.userId,
                tokenType,
                amount,
                previousBalance,
                balanceChange,
                'balance_updated',
                undefined, // transactionId
                undefined, // onRampId
                undefined, // offRampId
                new Date(),
            );

            await this.eventBus.publish(event);
        }

        return savedBalance;
    }

    /**
     * Sync wallet balance with blockchain
     */
    async syncBalanceWithBlockchain(
        walletId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance> {
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId, isActive: true },
            select: ['id', 'address'],
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet with ID ${walletId} not found`);
        }

        const blockchainBalance = await this.solanaService.getTokenBalance(
            wallet.address,
            tokenType as any,
        );

        // Handle case where blockchain balance is null (no token account exists)
        const balanceAmount = blockchainBalance ? blockchainBalance.amount : 0;
        return await this.updateBalanceFromBlockchain(
            walletId,
            tokenType,
            balanceAmount,
        );
    }

    /**
     * Sync all wallet balances with blockchain
     */
    async syncAllBalancesWithBlockchain(
        walletId: string,
    ): Promise<WalletBalance[]> {
        const wallet = await this.walletRepository.findOne({
            where: { id: walletId, isActive: true },
            select: ['id', 'address'],
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet with ID ${walletId} not found`);
        }

        const tokenTypes = Object.values(TokenType);
        const syncPromises = tokenTypes.map((tokenType) =>
            this.syncBalanceWithBlockchain(walletId, tokenType),
        );

        return await Promise.all(syncPromises);
    }

    /**
     * Update balance from blockchain data
     */
    async updateBalanceFromBlockchain(
        walletId: string,
        tokenType: TokenType,
        blockchainBalance: number,
    ): Promise<WalletBalance> {
        let walletBalance = await this.walletBalanceRepository.findOne({
            where: { walletId, tokenType },
        });

        if (!walletBalance) {
            walletBalance = this.walletBalanceRepository.create({
                walletId,
                tokenType,
                balance: blockchainBalance,
            });
        } else {
            walletBalance.balance = blockchainBalance;
        }

        walletBalance.lastUpdated = new Date();
        return await this.walletBalanceRepository.save(walletBalance);
    }
}
