import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    OffRampTransaction,
    OffRampStatus,
    OffRampProvider,
} from '../entities/offramp-transaction.entity';
import { IOffRampProvider } from '../interfaces/offramp-provider.interface';
import { OffRampProviderFactoryService } from './offramp-provider-factory.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { WalletBalanceService } from '../../wallet/services/wallet-balance.service';
import { EventBusService } from '../../common/services/event-bus.service';
import { TokenType } from '../../common/enums/token-type.enum';

export interface CreateOffRampDto {
    userId: string;
    walletId: string;
    tokenAmount: number;
    tokenType: string;
    fiatCurrency: string;
    provider: OffRampProvider;
    bankAccountId?: string;
}

export interface UpdateOffRampStatusDto {
    status: OffRampStatus;
    providerTransactionId?: string;
    failureReason?: string;
}

@Injectable()
export class OffRampService {
    constructor(
        @InjectRepository(OffRampTransaction)
        private readonly offRampRepository: Repository<OffRampTransaction>,
        private readonly providerFactory: OffRampProviderFactoryService,
        private readonly walletService: WalletService,
        private readonly walletBalanceService: WalletBalanceService,
        private readonly eventBusService: EventBusService,
    ) {}

    /**
     * Create a new off-ramp transaction
     *
     * SIMPLIFIED for Transak: Just creates a pending record with user intent.
     * Actual transaction happens in Transak widget. All amounts come from webhook.
     */
    async createOffRampTransaction(
        createOffRampDto: CreateOffRampDto,
    ): Promise<OffRampTransaction> {
        // Validate user and wallet
        const wallets = await this.walletService.getUserWallets(
            createOffRampDto.userId,
        );
        const wallet = wallets.find(
            (w) => w.walletId === createOffRampDto.walletId,
        );

        if (!wallet) {
            throw new BadRequestException('Invalid wallet for user');
        }

        // Just create pending record - NO provider API calls
        // Actual amounts (fiatAmount, exchangeRate, fee) come from Transak webhook
        const offRampTransaction = this.offRampRepository.create({
            ...createOffRampDto,
            status: OffRampStatus.PENDING,
            walletAddress: wallet.address, // Store for webhook matching
            fiatAmount: undefined, // Will be set from webhook
            exchangeRate: undefined, // Will be set from webhook
            fee: undefined, // Will be set from webhook
            metadata: {
                intendedTokenAmount: createOffRampDto.tokenAmount, // Store intent
                partnerCustomerId: createOffRampDto.userId, // For webhook matching
            },
        });

        return await this.offRampRepository.save(offRampTransaction);
    }

    async updateOffRampStatus(
        transactionId: string,
        status: OffRampStatus,
        providerTransactionId?: string,
        failureReason?: string,
    ): Promise<OffRampTransaction> {
        const transaction = await this.offRampRepository.findOne({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new NotFoundException('Off-ramp transaction not found');
        }

        transaction.status = status;
        if (providerTransactionId) {
            transaction.providerTransactionId = providerTransactionId;
        }
        if (failureReason) {
            transaction.failureReason = failureReason;
        }

        if (status === OffRampStatus.COMPLETED) {
            transaction.completedAt = new Date();
        } else if (status === OffRampStatus.FAILED) {
            transaction.failedAt = new Date();
        }

        return await this.offRampRepository.save(transaction);
    }

    async getOffRampTransaction(
        transactionId: string,
    ): Promise<OffRampTransaction | null> {
        return await this.offRampRepository.findOne({
            where: { id: transactionId },
        });
    }

    async getOffRampTransactionsForUser(
        userId: string,
        status?: OffRampStatus,
    ): Promise<OffRampTransaction[]> {
        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        return await this.offRampRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async getOffRampStats(
        userId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalOffRamp: number;
        totalFees: number;
        completedOffRamp: number;
        failedOffRamp: number;
    }> {
        const where: any = { userId };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.$gte = startDate;
            }
            if (endDate) {
                where.createdAt.$lte = endDate;
            }
        }

        const transactions = await this.offRampRepository.find({ where });

        const totalOffRamp = transactions.reduce(
            (sum, t) => sum + t.tokenAmount,
            0,
        );
        const totalFees = transactions.reduce(
            (sum, t) => sum + (t.fee || 0),
            0,
        );
        const completedOffRamp = transactions.filter(
            (t) => t.status === OffRampStatus.COMPLETED,
        ).length;
        const failedOffRamp = transactions.filter(
            (t) => t.status === OffRampStatus.FAILED,
        ).length;

        return {
            totalOffRamp,
            totalFees,
            completedOffRamp,
            failedOffRamp,
        };
    }

    async processPendingOffRampTransactions(): Promise<void> {
        const pendingTransactions = await this.offRampRepository.find({
            where: { status: OffRampStatus.PROCESSING },
        });

        for (const transaction of pendingTransactions) {
            try {
                const provider = this.providerFactory.getProvider(
                    transaction.provider,
                );
                const statusResponse = await provider.getOffRampStatus(
                    transaction.providerTransactionId,
                );

                if (statusResponse.status !== transaction.status) {
                    await this.updateOffRampStatus(
                        transaction.id,
                        statusResponse.status,
                        statusResponse.providerTransactionId,
                        statusResponse.failureReason,
                    );
                }
            } catch (error) {
                console.error(
                    `Failed to process off-ramp transaction ${transaction.id}:`,
                    error,
                );
            }
        }
    }
}
