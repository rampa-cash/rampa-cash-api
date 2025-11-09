import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

@Injectable()
export class TransactionRepository {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) {}

    async findById(id: string): Promise<Transaction | null> {
        return this.transactionRepository.findOne({ where: { id } });
    }

    async findByUserId(userId: string): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: [{ senderId: userId }, { recipientId: userId }],
            order: { createdAt: 'DESC' },
        });
    }

    async create(transaction: Partial<Transaction>): Promise<Transaction> {
        const newTransaction = this.transactionRepository.create(transaction);
        return this.transactionRepository.save(newTransaction);
    }

    async update(
        id: string,
        updates: Partial<Transaction>,
    ): Promise<Transaction | null> {
        await this.transactionRepository.update(id, updates);
        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.transactionRepository.delete(id);
    }

    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: { status },
            order: { createdAt: 'DESC' },
        });
    }

    async findByTokenType(tokenType: TokenType): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: { tokenType },
            order: { createdAt: 'DESC' },
        });
    }
}
