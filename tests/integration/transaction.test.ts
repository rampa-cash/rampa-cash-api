import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { TransactionModule } from '../../src/domain/transaction/transaction.module';
import { Transaction } from '../../src/domain/transaction/entities/transaction.entity';
import { TransactionStatus } from '../../src/domain/common/enums/transaction-status.enum';
import { TokenType } from '../../src/domain/common/enums/token-type.enum';

describe('Transaction Integration Tests', () => {
    let app: INestApplication;
    let transactionRepository: Repository<Transaction>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Transaction],
                    synchronize: true,
                }),
                TransactionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        transactionRepository = moduleFixture.get<Repository<Transaction>>(
            getRepositoryToken(Transaction),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await transactionRepository.clear();
    });

    describe('POST /transactions', () => {
        it('should create a new transaction', async () => {
            const createTransactionDto = {
                senderId: 'user-1',
                recipientId: 'user-2',
                amount: 1000000,
                tokenType: TokenType.USDC,
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(201);

            expect(response.body).toMatchObject({
                senderId: 'user-1',
                recipientId: 'user-2',
                amount: 1000000,
                tokenType: TokenType.USDC,
                status: TransactionStatus.PENDING,
            });
            expect(response.body.id).toBeDefined();
            expect(response.body.createdAt).toBeDefined();
        });

        it('should create external wallet transaction', async () => {
            const createTransactionDto = {
                senderId: 'user-1',
                externalAddress: 'external-wallet-address',
                amount: 500000,
                tokenType: TokenType.SOL,
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .send(createTransactionDto)
                .expect(201);

            expect(response.body).toMatchObject({
                senderId: 'user-1',
                externalAddress: 'external-wallet-address',
                amount: 500000,
                tokenType: TokenType.SOL,
                status: TransactionStatus.PENDING,
            });
        });

        it('should validate required fields', async () => {
            const invalidDto = {
                senderId: '',
                amount: '-100',
                tokenType: 'INVALID',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .send(invalidDto)
                .expect(400);
        });
    });

    describe('GET /transactions', () => {
        beforeEach(async () => {
            // Create test transactions
            const transactions = [
                {
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.CONFIRMED,
                    createdAt: new Date(),
                },
                {
                    id: 'tx-2',
                    senderId: 'user-2',
                    recipientId: 'user-1',
                    amount: 500000,
                    tokenType: TokenType.EURC,
                    status: TransactionStatus.PENDING,
                    createdAt: new Date(),
                },
            ];

            for (const tx of transactions) {
                await transactionRepository.save(
                    transactionRepository.create(tx),
                );
            }
        });

        it('should return transaction history for a user', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions')
                .query({ userId: 'user-1' })
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toMatchObject({
                id: 'tx-2',
                senderId: 'user-2',
                recipientId: 'user-1',
            });
        });

        it('should filter by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions')
                .query({ userId: 'user-1', status: TransactionStatus.PENDING })
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].status).toBe(TransactionStatus.PENDING);
        });
    });

    describe('GET /transactions/sent', () => {
        beforeEach(async () => {
            await transactionRepository.save(
                transactionRepository.create({
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.CONFIRMED,
                    createdAt: new Date(),
                }),
            );
        });

        it('should return sent transactions for a user', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/sent')
                .query({ userId: 'user-1' })
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].senderId).toBe('user-1');
        });
    });

    describe('GET /transactions/received', () => {
        beforeEach(async () => {
            await transactionRepository.save(
                transactionRepository.create({
                    id: 'tx-1',
                    senderId: 'user-2',
                    recipientId: 'user-1',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.CONFIRMED,
                    createdAt: new Date(),
                }),
            );
        });

        it('should return received transactions for a user', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/received')
                .query({ userId: 'user-1' })
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].recipientId).toBe('user-1');
        });
    });

    describe('GET /transactions/:id', () => {
        beforeEach(async () => {
            await transactionRepository.save(
                transactionRepository.create({
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.PENDING,
                    createdAt: new Date(),
                }),
            );
        });

        it('should return a specific transaction', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/tx-1')
                .expect(200);

            expect(response.body).toMatchObject({
                id: 'tx-1',
                senderId: 'user-1',
                recipientId: 'user-2',
                amount: 1000000,
                tokenType: TokenType.USDC,
                status: TransactionStatus.PENDING,
            });
        });

        it('should return 404 for non-existent transaction', async () => {
            await request(app.getHttpServer())
                .get('/transactions/non-existent')
                .expect(404);
        });
    });

    describe('PUT /transactions/:id/confirm', () => {
        beforeEach(async () => {
            await transactionRepository.save(
                transactionRepository.create({
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.PENDING,
                    createdAt: new Date(),
                }),
            );
        });

        it('should confirm a transaction', async () => {
            const response = await request(app.getHttpServer())
                .put('/transactions/tx-1/confirm')
                .send({ signature: 'signature-123' })
                .expect(200);

            expect(response.body.status).toBe(TransactionStatus.CONFIRMED);
            expect(response.body.solanaTransactionHash).toBe('signature-123');
            expect(response.body.confirmedAt).toBeDefined();
        });
    });

    describe('PUT /transactions/:id/cancel', () => {
        beforeEach(async () => {
            await transactionRepository.save(
                transactionRepository.create({
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.PENDING,
                    createdAt: new Date(),
                }),
            );
        });

        it('should cancel a transaction', async () => {
            const response = await request(app.getHttpServer())
                .put('/transactions/tx-1/cancel')
                .send({ reason: 'User cancelled' })
                .expect(200);

            expect(response.body.status).toBe(TransactionStatus.FAILED);
            expect(response.body.failureReason).toBe('User cancelled');
            expect(response.body.failedAt).toBeDefined();
        });
    });

    describe('GET /transactions/stats', () => {
        beforeEach(async () => {
            const transactions = [
                {
                    id: 'tx-1',
                    senderId: 'user-1',
                    recipientId: 'user-2',
                    amount: 1000000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.CONFIRMED,
                    createdAt: new Date(),
                },
                {
                    id: 'tx-2',
                    senderId: 'user-2',
                    recipientId: 'user-1',
                    amount: 500000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.CONFIRMED,
                    createdAt: new Date(),
                },
                {
                    id: 'tx-3',
                    senderId: 'user-1',
                    recipientId: 'user-3',
                    amount: 200000,
                    tokenType: TokenType.USDC,
                    status: TransactionStatus.FAILED,
                    createdAt: new Date(),
                },
            ];

            for (const tx of transactions) {
                await transactionRepository.save(
                    transactionRepository.create(tx),
                );
            }
        });

        it('should return transaction statistics', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/stats')
                .query({ userId: 'user-1' })
                .expect(200);

            expect(response.body).toMatchObject({
                totalSent: '1200000',
                totalReceived: '500000',
                successRate: 50,
            });
        });
    });
});
