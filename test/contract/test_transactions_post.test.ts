import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Transactions POST (Contract)', () => {
    let app: INestApplication;
    let accessToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login to get access token for authenticated requests
        const loginData = {
            email: 'test@example.com',
            password: 'SecurePassword123!',
        };

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send(loginData);

        accessToken = loginResponse.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /transactions', () => {
        it('should create a new send transaction', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '100.50',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('type', transactionData.type);
            expect(response.body).toHaveProperty(
                'amount',
                transactionData.amount,
            );
            expect(response.body).toHaveProperty(
                'currency',
                transactionData.currency,
            );
            expect(response.body).toHaveProperty(
                'toAddress',
                transactionData.toAddress,
            );
            expect(response.body).toHaveProperty('memo', transactionData.memo);
            expect(response.body).toHaveProperty(
                'priority',
                transactionData.priority,
            );
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty('createdAt');
        });

        it('should create a new request transaction', async () => {
            const transactionData = {
                type: 'REQUEST',
                amount: '50.00',
                currency: 'USDC',
                fromAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Request for payment',
                priority: 'NORMAL',
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('type', transactionData.type);
            expect(response.body).toHaveProperty(
                'amount',
                transactionData.amount,
            );
            expect(response.body).toHaveProperty(
                'currency',
                transactionData.currency,
            );
            expect(response.body).toHaveProperty(
                'fromAddress',
                transactionData.fromAddress,
            );
            expect(response.body).toHaveProperty('memo', transactionData.memo);
            expect(response.body).toHaveProperty(
                'priority',
                transactionData.priority,
            );
            expect(response.body).toHaveProperty('status', 'PENDING');
        });

        it('should return 400 for invalid transaction type', async () => {
            const transactionData = {
                type: 'INVALID_TYPE',
                amount: '100.50',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for invalid amount format', async () => {
            const transactionData = {
                type: 'SEND',
                amount: 'invalid-amount',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for negative amount', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '-100.50',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for zero amount', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '0',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for unsupported currency', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '100.50',
                currency: 'UNSUPPORTED',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for invalid address format', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '100.50',
                currency: 'USDC',
                toAddress: 'invalid-address-format',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for invalid priority', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '100.50',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'INVALID_PRIORITY',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const transactionData = {
                type: 'SEND',
                // Missing amount, currency, toAddress
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '100.50',
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .send(transactionData)
                .expect(401);
        });

        it('should return 400 for insufficient balance', async () => {
            const transactionData = {
                type: 'SEND',
                amount: '999999999.99', // Very large amount
                currency: 'USDC',
                toAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(transactionData)
                .expect(400);
        });
    });

    describe('POST /transactions/{id}/cancel', () => {
        it('should cancel a pending transaction', async () => {
            const transactionId = 'test-transaction-id';

            const response = await request(app.getHttpServer())
                .post(`/transactions/${transactionId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', transactionId);
            expect(response.body).toHaveProperty('status', 'CANCELLED');
            expect(response.body).toHaveProperty('cancelledAt');
        });

        it('should return 404 for non-existent transaction', async () => {
            const transactionId = 'non-existent-id';

            await request(app.getHttpServer())
                .post(`/transactions/${transactionId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 400 for already completed transaction', async () => {
            const transactionId = 'completed-transaction-id';

            await request(app.getHttpServer())
                .post(`/transactions/${transactionId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const transactionId = 'test-transaction-id';

            await request(app.getHttpServer())
                .post(`/transactions/${transactionId}/cancel`)
                .expect(401);
        });
    });
});
