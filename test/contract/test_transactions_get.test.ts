import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Transactions GET (Contract)', () => {
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

    describe('GET /transactions', () => {
        it('should return user transactions with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination parameters', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should support filtering by transaction type', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions?type=SEND')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should support filtering by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions?status=COMPLETED')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should support date range filtering', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';

            const response = await request(app.getHttpServer())
                .get(`/transactions?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should support currency filtering', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions?currency=USDC')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/transactions')
                .expect(401);
        });

        it('should return 400 for invalid pagination parameters', async () => {
            await request(app.getHttpServer())
                .get('/transactions?page=-1&limit=0')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 400 for invalid date format', async () => {
            await request(app.getHttpServer())
                .get('/transactions?startDate=invalid-date')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });
    });

    describe('GET /transactions/{id}', () => {
        it('should return specific transaction details', async () => {
            const transactionId = 'test-transaction-id';

            const response = await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', transactionId);
            expect(response.body).toHaveProperty('type');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('fromAddress');
            expect(response.body).toHaveProperty('toAddress');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');
        });

        it('should return 404 for non-existent transaction', async () => {
            const transactionId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const transactionId = 'test-transaction-id';

            await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .expect(401);
        });

        it('should return 403 for transaction belonging to another user', async () => {
            const transactionId = 'other-user-transaction-id';

            await request(app.getHttpServer())
                .get(`/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(403);
        });
    });

    describe('GET /transactions/export', () => {
        it('should export transactions as CSV', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/export?format=csv')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });

        it('should export transactions as PDF', async () => {
            const response = await request(app.getHttpServer())
                .get('/transactions/export?format=pdf')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.headers['content-type']).toContain('application/pdf');
            expect(response.headers['content-disposition']).toContain('attachment');
        });

        it('should return 400 for unsupported export format', async () => {
            await request(app.getHttpServer())
                .get('/transactions/export?format=unsupported')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/transactions/export')
                .expect(401);
        });
    });
});
