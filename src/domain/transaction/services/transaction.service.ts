import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { WALLET_SERVICE_TOKEN } from '../../common/tokens/service-tokens';
import { CreateTransactionDto, TransactionQueryDto } from '../dto';
import { ITransactionService } from '../interfaces/transaction-service.interface';
import { EventBusService } from '../../common/services/event-bus.service';
import { TransactionCreatedEvent } from '../events/transaction-created.event';

@Injectable()
export class TransactionService implements ITransactionService {
    constructor(
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        @Inject(WALLET_SERVICE_TOKEN)
        private walletService: any,
        private dataSource: DataSource,
        private eventBus: EventBusService,
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

        // Create transaction record (balance checking and operations handled by orchestration layer)
        const transaction = this.transactionRepository.create({
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

        const savedTransaction =
            await this.transactionRepository.save(transaction);

        // Publish TransactionCreated event
        const event = new TransactionCreatedEvent(
            savedTransaction.id,
            savedTransaction.senderId,
            savedTransaction.recipientId,
            savedTransaction.senderWalletId,
            savedTransaction.recipientWalletId,
            savedTransaction.amount,
            savedTransaction.tokenType,
            savedTransaction.status,
            savedTransaction.solanaTransactionHash,
            savedTransaction.fee,
            savedTransaction.createdAt,
        );

        await this.eventBus.publish(event);

        return savedTransaction;
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

        // Optimize user filtering with separate queries for better index usage
        if (query.userId) {
            // Use UNION for better performance than OR conditions
            const senderQuery = this.transactionRepository
                .createQueryBuilder('transaction')
                .leftJoinAndSelect('transaction.sender', 'sender')
                .leftJoinAndSelect('transaction.recipient', 'recipient')
                .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
                .leftJoinAndSelect(
                    'transaction.recipientWallet',
                    'recipientWallet',
                )
                .where('transaction.senderId = :userId', {
                    userId: query.userId,
                });

            const recipientQuery = this.transactionRepository
                .createQueryBuilder('transaction')
                .leftJoinAndSelect('transaction.sender', 'sender')
                .leftJoinAndSelect('transaction.recipient', 'recipient')
                .leftJoinAndSelect('transaction.senderWallet', 'senderWallet')
                .leftJoinAndSelect(
                    'transaction.recipientWallet',
                    'recipientWallet',
                )
                .where('transaction.recipientId = :userId', {
                    userId: query.userId,
                });

            // Apply other filters to both queries
            if (query.status) {
                senderQuery.andWhere('transaction.status = :status', {
                    status: query.status,
                });
                recipientQuery.andWhere('transaction.status = :status', {
                    status: query.status,
                });
            }

            if (query.tokenType) {
                senderQuery.andWhere('transaction.tokenType = :tokenType', {
                    tokenType: query.tokenType,
                });
                recipientQuery.andWhere('transaction.tokenType = :tokenType', {
                    tokenType: query.tokenType,
                });
            }

            if (query.startDate) {
                senderQuery.andWhere('transaction.createdAt >= :startDate', {
                    startDate: query.startDate,
                });
                recipientQuery.andWhere('transaction.createdAt >= :startDate', {
                    startDate: query.startDate,
                });
            }

            if (query.endDate) {
                senderQuery.andWhere('transaction.createdAt <= :endDate', {
                    endDate: query.endDate,
                });
                recipientQuery.andWhere('transaction.createdAt <= :endDate', {
                    endDate: query.endDate,
                });
            }

            // Order and limit
            senderQuery.orderBy('transaction.createdAt', 'DESC');
            recipientQuery.orderBy('transaction.createdAt', 'DESC');

            if (query.limit) {
                senderQuery.limit(query.limit);
                recipientQuery.limit(query.limit);
            }

            if (query.offset) {
                senderQuery.offset(query.offset);
                recipientQuery.offset(query.offset);
            }

            // Execute both queries and combine results
            const [senderTransactions, recipientTransactions] =
                await Promise.all([
                    senderQuery.getMany(),
                    recipientQuery.getMany(),
                ]);

            // Combine and deduplicate results
            const allTransactions = [
                ...senderTransactions,
                ...recipientTransactions,
            ];
            const uniqueTransactions = allTransactions.filter(
                (transaction, index, self) =>
                    index === self.findIndex((t) => t.id === transaction.id),
            );

            // Sort by creation date
            return uniqueTransactions.sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );
        }

        // Apply other filters for non-user queries
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

        // Update transaction status (balance operations handled by orchestration layer)
        transaction.status = TransactionStatus.CONFIRMED;
        transaction.solanaTransactionHash = solanaTransactionHash;
        transaction.confirmedAt = new Date();

        return await this.transactionRepository.save(transaction);
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

        // Update transaction status (balance operations handled by orchestration layer)
        transaction.status = TransactionStatus.FAILED;
        transaction.failureReason = failureReason;
        transaction.failedAt = new Date();

        return await this.transactionRepository.save(transaction);
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

        // Update transaction status (balance operations handled by orchestration layer)
        transaction.status = TransactionStatus.CANCELLED;

        return await this.transactionRepository.save(transaction);
    }

    /**
     * Get pending transactions
     */
    async findPendingTransactions(): Promise<Transaction[]> {
        return await this.findByStatus(TransactionStatus.PENDING);
    }

    /**
     * Get confirmed transactions
     */
    async findConfirmedTransactions(): Promise<Transaction[]> {
        return await this.findByStatus(TransactionStatus.CONFIRMED);
    }

    /**
     * Get failed transactions
     */
    async findFailedTransactions(): Promise<Transaction[]> {
        return await this.findByStatus(TransactionStatus.FAILED);
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
