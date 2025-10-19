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

@Injectable()
export class WalletBalanceService {
    private readonly logger = new Logger(WalletBalanceService.name);

    constructor(
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        private solanaService: SolanaService,
    ) {}

    /**
     * Get balance for a specific wallet and token type
     * Fetches real-time balance from Solana blockchain and updates local database
     */
    async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
        try {
            // Get wallet to access the address
            const wallet = await this.walletRepository.findOne({
                where: { id: walletId, isActive: true },
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
            const balance = await this.walletBalanceRepository.findOne({
                where: { walletId, tokenType },
            });

            return balance ? balance.balance : 0;
        }
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
            // Get wallet to access the address
            const wallet = await this.walletRepository.findOne({
                where: { id: walletId, isActive: true },
            });

            if (!wallet) {
                throw new NotFoundException(
                    `Wallet with ID ${walletId} not found`,
                );
            }

            // Get all token balances from Solana blockchain
            const tokenTypes = Object.values(TokenType);
            const balances: WalletBalance[] = [];

            for (const tokenType of tokenTypes) {
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
                    balances.push(balance);
                } catch (error) {
                    this.logger.warn(
                        `Failed to get balance for token ${tokenType}:`,
                        error,
                    );

                    // Fallback to database balance
                    const balance = await this.walletBalanceRepository.findOne({
                        where: { walletId, tokenType },
                    });

                    if (balance) {
                        balances.push(balance);
                    }
                }
            }

            this.logger.log(`Retrieved all balances for wallet ${walletId}`);
            return balances;
        } catch (error) {
            this.logger.error(
                `Failed to get all balances for wallet ${walletId}:`,
                error,
            );

            // Fallback to database balances
            return await this.walletBalanceRepository.find({
                where: { walletId },
            });
        }
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
     * Get balance by wallet ID and token type from database only (no blockchain call)
     */
    async getBalanceFromDatabase(
        walletId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance | null> {
        return await this.walletBalanceRepository.findOne({
            where: { walletId, tokenType },
        });
    }

    /**
     * Get all balances from database only (no blockchain calls)
     */
    async getAllBalancesFromDatabase(
        walletId: string,
    ): Promise<WalletBalance[]> {
        return await this.walletBalanceRepository.find({
            where: { walletId },
        });
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
}
