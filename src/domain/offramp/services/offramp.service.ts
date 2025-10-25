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
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance-service.interface';
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
        private readonly walletService: IWalletService,
        private readonly walletBalanceService: IWalletBalanceService,
        private readonly eventBusService: EventBusService,
    ) {}

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

        // Get provider and quote
        const provider = this.providerFactory.getProvider(
            createOffRampDto.provider,
        );
        const quote = await provider.getQuote({
            tokenAmount: createOffRampDto.tokenAmount,
            tokenType: createOffRampDto.tokenType,
            fiatCurrency: createOffRampDto.fiatCurrency,
        });

        // Create off-ramp transaction
        const offRampTransaction = this.offRampRepository.create({
            ...createOffRampDto,
            status: OffRampStatus.PENDING,
            fiatAmount: quote.fiatAmount,
            exchangeRate: quote.exchangeRate,
            fee: quote.fee,
        });

        return await this.offRampRepository.save(offRampTransaction);
    }

    async initiateOffRamp(transactionId: string): Promise<OffRampTransaction> {
        const transaction = await this.offRampRepository.findOne({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new NotFoundException('Off-ramp transaction not found');
        }

        if (transaction.status !== OffRampStatus.PENDING) {
            throw new BadRequestException(
                'Transaction is not in pending status',
            );
        }

        // Check wallet balance
        const balance = await this.walletBalanceService.getBalance(
            transaction.walletId,
            transaction.tokenType as TokenType,
        );

        if (balance < transaction.tokenAmount) {
            throw new BadRequestException('Insufficient balance');
        }

        // Get provider and initiate
        const provider = this.providerFactory.getProvider(transaction.provider);
        const initiationResponse = await provider.initiateOffRamp({
            userId: transaction.userId,
            walletId: transaction.walletId,
            tokenAmount: transaction.tokenAmount,
            tokenType: transaction.tokenType,
            fiatCurrency: transaction.fiatCurrency,
            bankAccountId: transaction.bankAccountId,
        });

        // Update transaction
        transaction.status = OffRampStatus.PROCESSING;
        transaction.providerTransactionId =
            initiationResponse.providerTransactionId;

        return await this.offRampRepository.save(transaction);
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

    async cancelOffRamp(transactionId: string): Promise<OffRampTransaction> {
        const transaction = await this.offRampRepository.findOne({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new NotFoundException('Off-ramp transaction not found');
        }

        if (
            transaction.status !== OffRampStatus.PENDING &&
            transaction.status !== OffRampStatus.PROCESSING
        ) {
            throw new BadRequestException('Transaction cannot be cancelled');
        }

        // Cancel with provider if processing
        if (
            transaction.status === OffRampStatus.PROCESSING &&
            transaction.providerTransactionId
        ) {
            const provider = this.providerFactory.getProvider(
                transaction.provider,
            );
            await provider.cancelOffRamp(transaction.providerTransactionId);
        }

        transaction.status = OffRampStatus.CANCELLED;
        return await this.offRampRepository.save(transaction);
    }

    async getOffRampQuote(
        tokenAmount: number,
        tokenType: string,
        fiatCurrency: string,
        provider: OffRampProvider,
    ): Promise<any> {
        const providerService = this.providerFactory.getProvider(provider);
        return await providerService.getQuote({
            tokenAmount,
            tokenType,
            fiatCurrency,
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
