import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PublicKey, Connection } from '@solana/web3.js';
import { SolanaConnectionService } from './solana-connection.service';
import { SplTokenService } from './spl-token.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface BalanceInfo {
    address: string;
    token: TokenType;
    balance: bigint;
    decimals: number;
    lastUpdated: Date;
}

export interface BalanceCheckResult {
    hasBalance: boolean;
    currentBalance: bigint;
    requiredBalance: bigint;
    difference: bigint;
}

@Injectable()
export class SolanaBalanceService {
    private readonly logger = new Logger(SolanaBalanceService.name);

    constructor(
        private readonly connectionService: SolanaConnectionService,
        private readonly splTokenService: SplTokenService,
    ) {}

    /**
     * Get the balance of a specific token for an address
     */
    async getBalance(address: string, token: TokenType): Promise<BalanceInfo> {
        try {
            this.logger.debug(`Getting balance for ${address} - ${token}`);

            if (!this.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            let balance: bigint;
            let decimals: number;

            if (token === TokenType.SOL) {
                const solBalance = await this.connectionService
                    .getConnection()
                    .getBalance(new PublicKey(address));
                balance = BigInt(solBalance);
                decimals = 9; // SOL has 9 decimals
            } else {
                // For SPL tokens
                const tokenBalance = await this.splTokenService.getTokenBalance(
                    address,
                    token,
                );
                balance = BigInt(
                    tokenBalance ? tokenBalance.amount.toString() : '0',
                );
                decimals = 6; // Most SPL tokens have 6 decimals
            }

            this.logger.debug(`Balance for ${address} - ${token}: ${balance}`);

            return {
                address,
                token,
                balance,
                decimals,
                lastUpdated: new Date(),
            };
        } catch (error) {
            this.logger.error(
                `Failed to get balance for ${address} - ${token}: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to get balance: ${error.message}`,
            );
        }
    }

    /**
     * Get balances for multiple tokens for an address
     */
    async getMultipleBalances(
        address: string,
        tokens: TokenType[],
    ): Promise<BalanceInfo[]> {
        try {
            this.logger.debug(
                `Getting multiple balances for ${address}: ${tokens.join(', ')}`,
            );

            const balancePromises = tokens.map((token) =>
                this.getBalance(address, token),
            );
            const balances = await Promise.all(balancePromises);

            this.logger.debug(
                `Retrieved ${balances.length} balances for ${address}`,
            );
            return balances;
        } catch (error) {
            this.logger.error(
                `Failed to get multiple balances for ${address}: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to get multiple balances: ${error.message}`,
            );
        }
    }

    /**
     * Check if an address has sufficient balance for a transaction
     */
    async checkSufficientBalance(
        address: string,
        token: TokenType,
        requiredAmount: bigint,
    ): Promise<BalanceCheckResult> {
        try {
            this.logger.debug(
                `Checking sufficient balance for ${address} - ${token}: ${requiredAmount}`,
            );

            const balanceInfo = await this.getBalance(address, token);
            const currentBalance = balanceInfo.balance;
            const hasBalance = currentBalance >= requiredAmount;
            const difference = hasBalance
                ? currentBalance - requiredAmount
                : requiredAmount - currentBalance;

            this.logger.debug(
                `Balance check result: hasBalance=${hasBalance}, current=${currentBalance}, required=${requiredAmount}`,
            );

            return {
                hasBalance,
                currentBalance,
                requiredBalance: requiredAmount,
                difference,
            };
        } catch (error) {
            this.logger.error(
                `Failed to check sufficient balance: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to check sufficient balance: ${error.message}`,
            );
        }
    }

    /**
     * Get the total value of all tokens for an address (in SOL equivalent)
     */
    async getTotalValue(address: string, tokens: TokenType[]): Promise<bigint> {
        try {
            this.logger.debug(
                `Getting total value for ${address}: ${tokens.join(', ')}`,
            );

            const balances = await this.getMultipleBalances(address, tokens);

            // For MVP, we'll just return the SOL balance
            // In a real implementation, you'd convert all tokens to a common unit
            const solBalance = balances.find((b) => b.token === TokenType.SOL);
            const totalValue = solBalance ? solBalance.balance : 0n;

            this.logger.debug(
                `Total value for ${address}: ${totalValue} lamports`,
            );

            return totalValue;
        } catch (error) {
            this.logger.error(
                `Failed to get total value for ${address}: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to get total value: ${error.message}`,
            );
        }
    }

    /**
     * Validate if an address is a valid Solana address
     */
    private isValidAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get account info for an address
     */
    async getAccountInfo(address: string): Promise<any> {
        try {
            this.logger.debug(`Getting account info for ${address}`);

            if (!this.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            const accountInfo = await this.connectionService
                .getConnection()
                .getAccountInfo(new PublicKey(address));

            this.logger.debug(`Account info retrieved for ${address}`);
            return accountInfo;
        } catch (error) {
            this.logger.error(
                `Failed to get account info for ${address}: ${error.message}`,
                error.stack,
            );
            throw new BadRequestException(
                `Failed to get account info: ${error.message}`,
            );
        }
    }

    /**
     * Check if an account exists
     */
    async accountExists(address: string): Promise<boolean> {
        try {
            const accountInfo = await this.getAccountInfo(address);
            return accountInfo !== null;
        } catch (error) {
            this.logger.error(
                `Failed to check if account exists for ${address}: ${error.message}`,
                error.stack,
            );
            return false;
        }
    }
}
