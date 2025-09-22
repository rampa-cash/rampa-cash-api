import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Wallet Balance (Contract)', () => {
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

    describe('GET /wallet/balance', () => {
        it('should return wallet balance for authenticated user', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('walletId');
            expect(response.body).toHaveProperty('balances');
            expect(Array.isArray(response.body.balances)).toBe(true);

            // Check balance structure
            if (response.body.balances.length > 0) {
                const balance = response.body.balances[0];
                expect(balance).toHaveProperty('currency');
                expect(balance).toHaveProperty('amount');
                expect(balance).toHaveProperty('available');
                expect(balance).toHaveProperty('locked');
                expect(typeof balance.amount).toBe('string');
                expect(typeof balance.available).toBe('string');
                expect(typeof balance.locked).toBe('string');
            }
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance')
                .expect(401);
        });

        it('should return 401 for invalid access token', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should return 401 for expired access token', async () => {
            // This test would require a way to generate an expired token
            // For now, we'll test with a malformed token
            await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', 'Bearer expired.token.here')
                .expect(401);
        });

        it('should return 401 for missing Authorization header', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance')
                .expect(401);
        });

        it('should return 401 for malformed Authorization header', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', 'InvalidFormat')
                .expect(401);
        });
    });

    describe('GET /wallet/balance/{currency}', () => {
        it('should return balance for specific currency', async () => {
            const currency = 'USDC';

            const response = await request(app.getHttpServer())
                .get(`/wallet/balance/${currency}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('walletId');
            expect(response.body).toHaveProperty('currency', currency);
            expect(response.body).toHaveProperty('amount');
            expect(response.body).toHaveProperty('available');
            expect(response.body).toHaveProperty('locked');
            expect(typeof response.body.amount).toBe('string');
            expect(typeof response.body.available).toBe('string');
            expect(typeof response.body.locked).toBe('string');
        });

        it('should return 404 for unsupported currency', async () => {
            const currency = 'UNSUPPORTED';

            await request(app.getHttpServer())
                .get(`/wallet/balance/${currency}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 400 for invalid currency format', async () => {
            const currency = 'invalid-currency-format';

            await request(app.getHttpServer())
                .get(`/wallet/balance/${currency}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const currency = 'USDC';

            await request(app.getHttpServer())
                .get(`/wallet/balance/${currency}`)
                .expect(401);
        });
    });

    describe('GET /wallet/transactions', () => {
        it('should return wallet transactions for authenticated user', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/transactions')
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
                .get('/wallet/transactions?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should support date range filtering', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-12-31';

            const response = await request(app.getHttpServer())
                .get(`/wallet/transactions?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('transactions');
            expect(Array.isArray(response.body.transactions)).toBe(true);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/wallet/transactions')
                .expect(401);
        });
    });
});
