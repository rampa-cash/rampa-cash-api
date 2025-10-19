import { Injectable, Logger } from '@nestjs/common';
import { IOnRampService } from '../interfaces/onramp-service.interface';
import { IUserService } from '../../user/interfaces/user-service.interface';
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance-service.interface';
import { CreateOnRampDto } from '../dto/create-onramp.dto';
import { OnOffRamp } from '../entities/onoff-ramp.entity';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';
import { TokenType } from '../../common/enums/token-type.enum';
import { RampStatus } from '../entities/onoff-ramp.entity';
import {
    BadRequestException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';

/**
 * OnRampApplicationService
 *
 * @description Application service that orchestrates on-ramp operations by coordinating
 * between domain services. This service handles the complete on-ramp flow including
 * validation, user verification, wallet management, and balance updates.
 *
 * @example
 * ```typescript
 * // Initiate an on-ramp
 * const onRamp = await onRampApplicationService.initiateOnRamp(
 *   userId,
 *   createOnRampDto
 * );
 *
 * // Complete an on-ramp
 * const completedOnRamp = await onRampApplicationService.completeOnRamp(
 *   onRampId,
 *   solanaTransactionHash
 * );
 * ```
 */
@Injectable()
export class OnRampApplicationService {
    private readonly logger = new Logger(OnRampApplicationService.name);

    constructor(
        private readonly onRampService: IOnRampService,
        private readonly userService: IUserService,
        private readonly walletService: IWalletService,
        private readonly walletBalanceService: IWalletBalanceService,
    ) {}

    /**
     * Initiates a new on-ramp transaction
     * @param userId - ID of the user initiating the on-ramp
     * @param createOnRampDto - On-ramp creation data
     * @returns Created on-ramp entity
     */
    async initiateOnRamp(
        userId: string,
        createOnRampDto: CreateOnRampDto,
    ): Promise<OnOffRamp> {
        this.logger.debug(`Initiating on-ramp for user ${userId}`);

        // Validate user exists and is active
        const user = await this.validateUser(userId);

        // Validate wallet exists and belongs to user
        const wallet = await this.validateWallet(
            createOnRampDto.walletId,
            userId,
        );

        // Validate on-ramp data
        await this.validateOnRampData(createOnRampDto);

        // Check if user has sufficient balance for fees (if applicable)
        await this.validateUserBalance(wallet.id, createOnRampDto.tokenType);

        // Create the on-ramp
        const onRamp = await this.onRampService.createOnRamp({
            ...createOnRampDto,
            userId,
        });

        this.logger.log(
            `On-ramp ${onRamp.id} initiated successfully for user ${userId}`,
        );
        return onRamp;
    }

    /**
     * Completes an on-ramp transaction
     * @param onRampId - ID of the on-ramp to complete
     * @param solanaTransactionHash - Solana transaction hash for verification
     * @returns Completed on-ramp entity
     */
    async completeOnRamp(
        onRampId: string,
        solanaTransactionHash: string,
    ): Promise<OnOffRamp> {
        this.logger.debug(`Completing on-ramp ${onRampId}`);

        // Get the on-ramp
        const onRamp = await this.onRampService.findOne(onRampId);

        // Validate on-ramp can be completed
        if (onRamp.status !== RampStatus.PENDING) {
            throw new BadRequestException(
                `On-ramp ${onRampId} is not in pending status and cannot be completed`,
            );
        }

        // Update on-ramp status to completed
        const updatedOnRamp = await this.onRampService.updateStatus(
            onRampId,
            RampStatus.COMPLETED,
            solanaTransactionHash,
        );

        // Update wallet balance
        await this.updateWalletBalanceAfterOnRamp(updatedOnRamp);

        this.logger.log(`On-ramp ${onRampId} completed successfully`);
        return updatedOnRamp;
    }

    /**
     * Fails an on-ramp transaction
     * @param onRampId - ID of the on-ramp to fail
     * @param reason - Reason for failure
     * @returns Failed on-ramp entity
     */
    async failOnRamp(onRampId: string, reason: string): Promise<OnOffRamp> {
        this.logger.debug(`Failing on-ramp ${onRampId}: ${reason}`);

        // Get the on-ramp
        const onRamp = await this.onRampService.findOne(onRampId);

        // Update on-ramp status to failed
        const updatedOnRamp = await this.onRampService.failRamp(
            onRampId,
            reason,
        );

        this.logger.log(`On-ramp ${onRampId} failed: ${reason}`);
        return updatedOnRamp;
    }

    /**
     * Gets on-ramp history for a user
     * @param userId - ID of the user
     * @param limit - Maximum number of results
     * @param offset - Number of results to skip
     * @returns Array of on-ramp entities
     */
    async getOnRampHistory(
        userId: string,
        limit: number = 10,
        offset: number = 0,
    ): Promise<OnOffRamp[]> {
        this.logger.debug(`Getting on-ramp history for user ${userId}`);

        // Validate user exists
        await this.validateUser(userId);

        // Get on-ramp history
        return await this.onRampService.findAll(userId);
    }

    /**
     * Gets on-ramp by ID
     * @param onRampId - ID of the on-ramp
     * @param userId - ID of the user (for authorization)
     * @returns On-ramp entity
     */
    async getOnRampById(onRampId: string, userId: string): Promise<OnOffRamp> {
        this.logger.debug(`Getting on-ramp ${onRampId} for user ${userId}`);

        // Get the on-ramp
        const onRamp = await this.onRampService.findOne(onRampId);

        // Check if user owns this on-ramp
        if (onRamp.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to view this on-ramp',
            );
        }

        return onRamp;
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
     * Validates wallet exists and belongs to user
     * @param walletId - ID of the wallet
     * @param userId - ID of the user
     * @returns Wallet entity
     */
    private async validateWallet(
        walletId: string,
        userId: string,
    ): Promise<Wallet> {
        const wallet = await this.walletService.findOne(walletId);

        if (wallet.userId !== userId) {
            throw new ForbiddenException('Wallet does not belong to the user');
        }

        return wallet;
    }

    /**
     * Validates on-ramp data
     * @param createOnRampDto - On-ramp creation data
     */
    private async validateOnRampData(
        createOnRampDto: CreateOnRampDto,
    ): Promise<void> {
        // Validate amount is positive
        if (createOnRampDto.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        // Validate fiat amount is positive
        if (createOnRampDto.fiatAmount <= 0) {
            throw new BadRequestException('Fiat amount must be positive');
        }

        // Validate exchange rate is positive
        if (createOnRampDto.exchangeRate <= 0) {
            throw new BadRequestException('Exchange rate must be positive');
        }

        // Validate token type is supported
        if (!Object.values(TokenType).includes(createOnRampDto.tokenType)) {
            throw new BadRequestException('Unsupported token type');
        }
    }

    /**
     * Validates user has sufficient balance for fees
     * @param walletId - ID of the wallet
     * @param tokenType - Type of token
     */
    private async validateUserBalance(
        walletId: string,
        tokenType: TokenType,
    ): Promise<void> {
        // For now, we'll skip balance validation for on-ramps
        // as they are adding funds, not spending them
        // This could be extended to check for minimum balance requirements
        this.logger.debug(
            `Skipping balance validation for on-ramp with token ${tokenType}`,
        );
    }

    /**
     * Updates wallet balance after successful on-ramp
     * @param onRamp - Completed on-ramp entity
     */
    private async updateWalletBalanceAfterOnRamp(
        onRamp: OnOffRamp,
    ): Promise<void> {
        this.logger.debug(`Updating wallet balance after on-ramp ${onRamp.id}`);

        try {
            // Get current balance
            const currentBalance = await this.walletBalanceService.getBalance(
                onRamp.walletId,
                onRamp.tokenType,
            );

            // Calculate new balance
            const newBalance = (currentBalance || 0) + onRamp.amount;

            // Update balance
            await this.walletBalanceService.setBalance(
                onRamp.walletId,
                onRamp.tokenType,
                newBalance,
            );

            this.logger.log(`Wallet balance updated for on-ramp ${onRamp.id}`);
        } catch (error) {
            this.logger.error(
                `Failed to update wallet balance for on-ramp ${onRamp.id}:`,
                error,
            );
            // Don't throw here as the on-ramp is already marked as completed
            // The balance can be synced later
        }
    }
}
