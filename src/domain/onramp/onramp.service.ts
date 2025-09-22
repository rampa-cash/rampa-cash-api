import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnOffRamp, RampType, RampStatus, TokenType } from './entities/onoff-ramp.entity';
import { WalletService } from '../wallet/wallet.service';
import { CreateOnRampDto, CreateOffRampDto } from './dto';

@Injectable()
export class OnRampService {
    constructor(
        @InjectRepository(OnOffRamp)
        private onOffRampRepository: Repository<OnOffRamp>,
        private walletService: WalletService,
        private dataSource: DataSource,
    ) { }

    async createOnRamp(createOnRampDto: CreateOnRampDto): Promise<OnOffRamp> {
        const {
            userId,
            walletId,
            amount,
            fiatAmount,
            fiatCurrency,
            tokenType,
            provider,
            exchangeRate,
            fee = 0
        } = createOnRampDto;

        // Validate amounts
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        if (fiatAmount <= 0) {
            throw new BadRequestException('Fiat amount must be positive');
        }

        if (exchangeRate <= 0) {
            throw new BadRequestException('Exchange rate must be positive');
        }

        if (fee < 0) {
            throw new BadRequestException('Fee cannot be negative');
        }

        const onRamp = this.onOffRampRepository.create({
            userId,
            walletId,
            type: RampType.ONRAMP,
            amount,
            fiatAmount,
            fiatCurrency,
            tokenType,
            provider,
            exchangeRate,
            fee,
            status: RampStatus.PENDING,
        });

        return await this.onOffRampRepository.save(onRamp);
    }

    async createOffRamp(createOffRampDto: CreateOffRampDto): Promise<OnOffRamp> {
        const {
            userId,
            walletId,
            amount,
            fiatAmount,
            fiatCurrency,
            tokenType,
            provider,
            exchangeRate,
            fee = 0
        } = createOffRampDto;

        // Validate amounts
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        if (fiatAmount <= 0) {
            throw new BadRequestException('Fiat amount must be positive');
        }

        if (exchangeRate <= 0) {
            throw new BadRequestException('Exchange rate must be positive');
        }

        if (fee < 0) {
            throw new BadRequestException('Fee cannot be negative');
        }

        // Check if user has sufficient balance for off-ramp
        const currentBalance = await this.walletService.getBalance(walletId, tokenType);
        if (currentBalance < amount) {
            throw new BadRequestException('Insufficient balance for off-ramp');
        }

        const offRamp = this.onOffRampRepository.create({
            userId,
            walletId,
            type: RampType.OFFRAMP,
            amount,
            fiatAmount,
            fiatCurrency,
            tokenType,
            provider,
            exchangeRate,
            fee,
            status: RampStatus.PENDING,
        });

        return await this.onOffRampRepository.save(offRamp);
    }

    async findAll(userId?: string, type?: RampType): Promise<OnOffRamp[]> {
        const queryBuilder = this.onOffRampRepository.createQueryBuilder('onOffRamp')
            .leftJoinAndSelect('onOffRamp.user', 'user')
            .leftJoinAndSelect('onOffRamp.wallet', 'wallet');

        if (userId) {
            queryBuilder.andWhere('onOffRamp.userId = :userId', { userId });
        }

        if (type) {
            queryBuilder.andWhere('onOffRamp.type = :type', { type });
        }

        queryBuilder.orderBy('onOffRamp.createdAt', 'DESC');

        return await queryBuilder.getMany();
    }

    async findOne(id: string): Promise<OnOffRamp> {
        const onOffRamp = await this.onOffRampRepository.findOne({
            where: { id },
            relations: ['user', 'wallet']
        });

        if (!onOffRamp) {
            throw new NotFoundException(`On/Off ramp with ID ${id} not found`);
        }

        return onOffRamp;
    }

    async findByProvider(provider: string, providerTransactionId: string): Promise<OnOffRamp | null> {
        return await this.onOffRampRepository.findOne({
            where: { provider, providerTransactionId },
            relations: ['user', 'wallet']
        });
    }

    async findByStatus(status: RampStatus): Promise<OnOffRamp[]> {
        return await this.onOffRampRepository.find({
            where: { status },
            relations: ['user', 'wallet']
        });
    }

    async updateStatus(id: string, status: RampStatus, providerTransactionId?: string): Promise<OnOffRamp> {
        const onOffRamp = await this.findOne(id);

        if (providerTransactionId) {
            onOffRamp.providerTransactionId = providerTransactionId;
        }

        onOffRamp.status = status;

        if (status === RampStatus.COMPLETED) {
            onOffRamp.completedAt = new Date();
        } else if (status === RampStatus.FAILED) {
            onOffRamp.failedAt = new Date();
        }

        return await this.onOffRampRepository.save(onOffRamp);
    }

    async processOnRamp(id: string, providerTransactionId: string): Promise<OnOffRamp> {
        const onRamp = await this.findOne(id);

        if (onRamp.type !== RampType.ONRAMP) {
            throw new BadRequestException('This is not an on-ramp transaction');
        }

        if (onRamp.status !== RampStatus.PENDING) {
            throw new BadRequestException('On-ramp is not in pending status');
        }

        return await this.dataSource.transaction(async (manager) => {
            // Update status to processing
            onRamp.status = RampStatus.PROCESSING;
            onRamp.providerTransactionId = providerTransactionId;
            await manager.save(onRamp);

            // Add tokens to user's wallet
            await this.walletService.addBalance(
                onRamp.walletId,
                onRamp.tokenType,
                onRamp.amount
            );

            // Update status to completed
            onRamp.status = RampStatus.COMPLETED;
            onRamp.completedAt = new Date();

            return await manager.save(onRamp);
        });
    }

    async processOffRamp(id: string, providerTransactionId: string): Promise<OnOffRamp> {
        const offRamp = await this.findOne(id);

        if (offRamp.type !== RampType.OFFRAMP) {
            throw new BadRequestException('This is not an off-ramp transaction');
        }

        if (offRamp.status !== RampStatus.PENDING) {
            throw new BadRequestException('Off-ramp is not in pending status');
        }

        return await this.dataSource.transaction(async (manager) => {
            // Update status to processing
            offRamp.status = RampStatus.PROCESSING;
            offRamp.providerTransactionId = providerTransactionId;
            await manager.save(offRamp);

            // Deduct tokens from user's wallet
            await this.walletService.subtractBalance(
                offRamp.walletId,
                offRamp.tokenType,
                offRamp.amount
            );

            // Update status to completed
            offRamp.status = RampStatus.COMPLETED;
            offRamp.completedAt = new Date();

            return await manager.save(offRamp);
        });
    }

    async failRamp(id: string, failureReason: string): Promise<OnOffRamp> {
        const onOffRamp = await this.findOne(id);

        if (onOffRamp.status === RampStatus.COMPLETED) {
            throw new BadRequestException('Cannot fail a completed ramp');
        }

        onOffRamp.status = RampStatus.FAILED;
        onOffRamp.failureReason = failureReason;
        onOffRamp.failedAt = new Date();

        return await this.onOffRampRepository.save(onOffRamp);
    }

    async getRampStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
        totalOnRamp: number;
        totalOffRamp: number;
        totalFees: number;
        completedOnRamp: number;
        completedOffRamp: number;
        failedOnRamp: number;
        failedOffRamp: number;
    }> {
        const queryBuilder = this.onOffRampRepository.createQueryBuilder('onOffRamp')
            .where('onOffRamp.userId = :userId', { userId });

        if (startDate) {
            queryBuilder.andWhere('onOffRamp.createdAt >= :startDate', { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere('onOffRamp.createdAt <= :endDate', { endDate });
        }

        const ramps = await queryBuilder.getMany();

        const stats = ramps.reduce((acc, ramp) => {
            if (ramp.type === RampType.ONRAMP) {
                acc.totalOnRamp += ramp.amount;
                if (ramp.status === RampStatus.COMPLETED) {
                    acc.completedOnRamp += ramp.amount;
                } else if (ramp.status === RampStatus.FAILED) {
                    acc.failedOnRamp += ramp.amount;
                }
            } else {
                acc.totalOffRamp += ramp.amount;
                if (ramp.status === RampStatus.COMPLETED) {
                    acc.completedOffRamp += ramp.amount;
                } else if (ramp.status === RampStatus.FAILED) {
                    acc.failedOffRamp += ramp.amount;
                }
            }
            acc.totalFees += ramp.fee;
            return acc;
        }, {
            totalOnRamp: 0,
            totalOffRamp: 0,
            totalFees: 0,
            completedOnRamp: 0,
            completedOffRamp: 0,
            failedOnRamp: 0,
            failedOffRamp: 0
        });

        return stats;
    }
}
