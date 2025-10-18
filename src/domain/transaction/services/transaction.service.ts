import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';
import { WalletService } from '../../wallet/services/wallet.service';
import { CreateTransactionDto, TransactionQueryDto } from '../dto';

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        private walletService: WalletService,
        private dataSource: DataSource,
    ) {}

    async create(
        createTransactionDto: CreateTransactionDto,
    ): Promise<Transaction> {
        const {
            senderId,
            recipientId,
            senderWalletId,
            recipientWalletId,
            amount,
            tokenType,
            description,
            fee = 0,
        } = createTransactionDto;

        // Validate sender and recipient are different
        if (senderId === recipientId) {
            throw new BadRequestException(
                'Sender and recipient cannot be the same',
            );
        }

        // Validate amount
        if (amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        // Check if sender has sufficient balance
        const senderBalance = await this.walletService.getBalance(
            senderWalletId,
            tokenType,
        );
        if (senderBalance < amount + fee) {
            throw new BadRequestException('Insufficient balance');
        }

        // Use transaction to ensure atomicity
        return await this.dataSource.transaction(async (manager) => {
            // Create transaction record
            const transaction = manager.create(Transaction, {
                senderId,
                recipientId,
                senderWalletId,
                recipientWalletId,
                amount,
                tokenType,
                description,
                fee,
                status: TransactionStatus.PENDING,
            });

            const savedTransaction = await manager.save(transaction);

            // Deduct from sender's balance
            await this.walletService.subtractBalance(
                senderWalletId,
                tokenType,
                amount + fee,
            );

            return savedTransaction;
        });
    }

    async findAll(query: TransactionQueryDto = {}): Promise<Transaction[]> {
        const queryBuilder = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.sender', 'sender')
            .leftJoinAndSelect('transaction.recipient', 'recipient')
            .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
            .leftJoinAndSelect(
                'transaction.recipientWallet',
                'recipientWallet',
            );

        if (query.userId) {
            queryBuilder.andWhere(
                '(transaction.senderId = :userId OR transaction.recipientId = :userId)',
                {
                    userId: query.userId,
                },
            );
        }

        if (query.status) {
            queryBuilder.andWhere('transaction.status = :status', {
                status: query.status,
            });
        }

        if (query.tokenType) {
            queryBuilder.andWhere('transaction.tokenType = :tokenType', {
                tokenType: query.tokenType,
            });
        }

        if (query.startDate) {
            queryBuilder.andWhere('transaction.createdAt >= :startDate', {
                startDate: query.startDate,
            });
        }

        if (query.endDate) {
            queryBuilder.andWhere('transaction.createdAt <= :endDate', {
                endDate: query.endDate,
            });
        }

        queryBuilder.orderBy('transaction.createdAt', 'DESC');

        if (query.limit) {
            queryBuilder.limit(query.limit);
        }

        if (query.offset) {
            queryBuilder.offset(query.offset);
        }

        return await queryBuilder.getMany();
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id },
            relations: [
                'sender',
                'recipient',
                'senderWallet',
                'recipientWallet',
            ],
        });

        if (!transaction) {
            throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        return transaction;
    }

    async findByUser(
        userId: string,
        limit: number = 50,
        offset: number = 0,
    ): Promise<Transaction[]> {
        return await this.findAll({
            userId,
            limit,
            offset,
        });
    }

    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return await this.findAll({ status });
    }

    async confirmTransaction(
        id: string,
        solanaTransactionHash: string,
    ): Promise<Transaction> {
        const transaction = await this.findOne(id);

        if (transaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException(
                'Transaction is not in pending status',
            );
        }

        return await this.dataSource.transaction(async (manager) => {
            // Update transaction status
            transaction.status = TransactionStatus.CONFIRMED;
            transaction.solanaTransactionHash = solanaTransactionHash;
            transaction.confirmedAt = new Date();

            const updatedTransaction = await manager.save(transaction);

            // Add to recipient's balance
            await this.walletService.addBalance(
                transaction.recipientWalletId,
                transaction.tokenType,
                transaction.amount,
            );

            return updatedTransaction;
        });
    }

    async failTransaction(
        id: string,
        failureReason: string,
    ): Promise<Transaction> {
        const transaction = await this.findOne(id);

        if (transaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException(
                'Transaction is not in pending status',
            );
        }

        return await this.dataSource.transaction(async (manager) => {
            // Update transaction status
            transaction.status = TransactionStatus.FAILED;
            transaction.failureReason = failureReason;
            transaction.failedAt = new Date();

            const updatedTransaction = await manager.save(transaction);

            // Refund to sender's balance
            await this.walletService.addBalance(
                transaction.senderWalletId,
                transaction.tokenType,
                transaction.amount + transaction.fee,
            );

            return updatedTransaction;
        });
    }

    async cancelTransaction(id: string, userId: string): Promise<Transaction> {
        const transaction = await this.findOne(id);

        if (transaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException(
                'Transaction is not in pending status',
            );
        }

        // Only sender can cancel the transaction
        if (transaction.senderId !== userId) {
            throw new ForbiddenException(
                'Only the sender can cancel the transaction',
            );
        }

        return await this.dataSource.transaction(async (manager) => {
            // Update transaction status
            transaction.status = TransactionStatus.CANCELLED;

            const updatedTransaction = await manager.save(transaction);

            // Refund to sender's balance
            await this.walletService.addBalance(
                transaction.senderWalletId,
                transaction.tokenType,
                transaction.amount + transaction.fee,
            );

            return updatedTransaction;
        });
    }

    async getTransactionStats(
        userId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalSent: number;
        totalReceived: number;
        totalFees: number;
        transactionCount: number;
    }> {
        const queryBuilder = this.transactionRepository
            .createQueryBuilder('transaction')
            .where(
                '(transaction.senderId = :userId OR transaction.recipientId = :userId)',
                { userId },
            );

        if (startDate) {
            queryBuilder.andWhere('transaction.createdAt >= :startDate', {
                startDate,
            });
        }

        if (endDate) {
            queryBuilder.andWhere('transaction.createdAt <= :endDate', {
                endDate,
            });
        }

        const transactions = await queryBuilder.getMany();

        const stats = transactions.reduce(
            (acc, transaction) => {
                if (transaction.status === TransactionStatus.CONFIRMED) {
                    if (transaction.senderId === userId) {
                        acc.totalSent += transaction.amount;
                    }
                    if (transaction.recipientId === userId) {
                        acc.totalReceived += transaction.amount;
                    }
                    acc.totalFees += transaction.fee;
                    acc.transactionCount++;
                }
                return acc;
            },
            {
                totalSent: 0,
                totalReceived: 0,
                totalFees: 0,
                transactionCount: 0,
            },
        );

        return stats;
    }
}
