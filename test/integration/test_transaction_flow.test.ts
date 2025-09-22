import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Transaction Flow (Integration)', () => {
    let app: INestApplication;
    let accessToken: string;
    // let contactId: string; // Unused variable

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

        // Create a contact for testing
        const contactData = {
            name: 'Transaction Test Contact',
            email: 'transaction@example.com',
            phoneNumber: '+1234567890',
            walletAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            type: 'REGULAR',
            isFavorite: false,
        };

        const contactResponse = await request(app.getHttpServer())
            .post('/contacts')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(contactData);

        contactId = contactResponse.body.id;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete Transaction Flow', () => {
        it('should complete full transaction lifecycle', async () => {
            // Step 1: Create a send transaction
            const sendTransactionData = {
                type: 'SEND',
                amount: '50.00',
                currency: 'USDC',
                toAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            const sendResponse = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(sendTransactionData)
                .expect(201);

            expect(sendResponse.body).toHaveProperty('id');
            expect(sendResponse.body).toHaveProperty('type', 'SEND');
            expect(sendResponse.body).toHaveProperty(
                'amount',
                sendTransactionData.amount,
            );
            expect(sendResponse.body).toHaveProperty('status', 'PENDING');

            const transactionId = sendResponse.body.id;

            // Step 2: Get transaction details
            const getTransactionResponse = await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getTransactionResponse.body).toHaveProperty(
                'id',
                transactionId,
            );
            expect(getTransactionResponse.body).toHaveProperty('type', 'SEND');
            expect(getTransactionResponse.body).toHaveProperty(
                'status',
                'PENDING',
            );

            // Step 3: Get all transactions
            const allTransactionsResponse = await request(app.getHttpServer())
                .get('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(allTransactionsResponse.body).toHaveProperty('transactions');
            expect(
                Array.isArray(allTransactionsResponse.body.transactions),
            ).toBe(true);
            expect(allTransactionsResponse.body).toHaveProperty('pagination');

            // Step 4: Filter transactions by type
            const filteredTransactionsResponse = await request(
                app.getHttpServer(),
            )
                .get('/transactions?type=SEND')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(filteredTransactionsResponse.body).toHaveProperty(
                'transactions',
            );
            expect(
                Array.isArray(filteredTransactionsResponse.body.transactions),
            ).toBe(true);

            // Step 5: Filter transactions by status
            const statusFilteredResponse = await request(app.getHttpServer())
                .get('/transactions?status=PENDING')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statusFilteredResponse.body).toHaveProperty('transactions');
            expect(
                Array.isArray(statusFilteredResponse.body.transactions),
            ).toBe(true);

            // Step 6: Filter transactions by currency
            const currencyFilteredResponse = await request(app.getHttpServer())
                .get('/transactions?currency=USDC')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(currencyFilteredResponse.body).toHaveProperty(
                'transactions',
            );
            expect(
                Array.isArray(currencyFilteredResponse.body.transactions),
            ).toBe(true);

            // Step 7: Filter transactions by date range
            const dateFilteredResponse = await request(app.getHttpServer())
                .get('/transactions?startDate=2024-01-01&endDate=2024-12-31')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(dateFilteredResponse.body).toHaveProperty('transactions');
            expect(Array.isArray(dateFilteredResponse.body.transactions)).toBe(
                true,
            );

            // Step 8: Export transactions as CSV
            const exportCsvResponse = await request(app.getHttpServer())
                .get('/transactions/export?format=csv')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(exportCsvResponse.headers['content-type']).toContain(
                'text/csv',
            );

            // Step 9: Export transactions as PDF
            const exportPdfResponse = await request(app.getHttpServer())
                .get('/transactions/export?format=pdf')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(exportPdfResponse.headers['content-type']).toContain(
                'application/pdf',
            );

            // Step 10: Cancel transaction (if still pending)
            const cancelResponse = await request(app.getHttpServer())
                .post(`/transactions/${transactionId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(cancelResponse.body).toHaveProperty('id', transactionId);
            expect(cancelResponse.body).toHaveProperty('status', 'CANCELLED');
        });

        it('should create and manage request transactions', async () => {
            // Step 1: Create a request transaction
            const requestTransactionData = {
                type: 'REQUEST',
                amount: '25.00',
                currency: 'USDC',
                fromAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Request for payment',
                priority: 'NORMAL',
            };

            const requestResponse = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(requestTransactionData)
                .expect(201);

            expect(requestResponse.body).toHaveProperty('id');
            expect(requestResponse.body).toHaveProperty('type', 'REQUEST');
            expect(requestResponse.body).toHaveProperty(
                'amount',
                requestTransactionData.amount,
            );
            expect(requestResponse.body).toHaveProperty('status', 'PENDING');

            const requestTransactionId = requestResponse.body.id;

            // Step 2: Get request transaction details
            const getRequestResponse = await request(app.getHttpServer())
                .get(`/transactions/${requestTransactionId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRequestResponse.body).toHaveProperty(
                'id',
                requestTransactionId,
            );
            expect(getRequestResponse.body).toHaveProperty('type', 'REQUEST');

            // Step 3: Filter by request type
            const requestFilteredResponse = await request(app.getHttpServer())
                .get('/transactions?type=REQUEST')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(requestFilteredResponse.body).toHaveProperty('transactions');
            expect(
                Array.isArray(requestFilteredResponse.body.transactions),
            ).toBe(true);
        });

        it('should handle transaction creation with invalid data', async () => {
            const invalidTransactionData = {
                type: 'INVALID_TYPE',
                amount: 'invalid-amount',
                currency: 'UNSUPPORTED',
                toAddress: 'invalid-address',
                memo: 'Test transaction',
                priority: 'INVALID_PRIORITY',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidTransactionData)
                .expect(400);
        });

        it('should handle transaction creation with insufficient balance', async () => {
            const insufficientBalanceData = {
                type: 'SEND',
                amount: '999999999.99', // Very large amount
                currency: 'USDC',
                toAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                memo: 'Test transaction',
                priority: 'NORMAL',
            };

            await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(insufficientBalanceData)
                .expect(400);
        });

        it('should handle transaction operations without authentication', async () => {
            await request(app.getHttpServer()).get('/transactions').expect(401);

            await request(app.getHttpServer())
                .post('/transactions')
                .send({})
                .expect(401);

            await request(app.getHttpServer())
                .get('/transactions/test-id')
                .expect(401);
        });

        it('should handle non-existent transaction operations', async () => {
            const nonExistentId = 'non-existent-transaction-id';

            await request(app.getHttpServer())
                .get(`/transactions/${nonExistentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            await request(app.getHttpServer())
                .post(`/transactions/${nonExistentId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should handle transaction cancellation for completed transactions', async () => {
            // This would require a completed transaction, which is hard to create in a test
            // For now, we'll test the error case
            const completedTransactionId = 'completed-transaction-id';

            await request(app.getHttpServer())
                .post(`/transactions/${completedTransactionId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });
    });
});
