import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TokenType } from '../../src/domain/common/enums/token-type.enum';

describe('Balance Integration Tests (e2e)', () => {
    let app: INestApplication;
    let authToken: string;
    let userId: string;
    let walletId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Mock authentication - in real tests, you'd get a valid token
        authToken = 'mock-auth-token';
        userId = 'test-user-1';
        walletId = 'test-wallet-1';
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /wallet/balance/:walletId', () => {
        it('should get wallet balance for specific token', async () => {
            const response = await request(app.getHttpServer())
                .get(`/wallet/balance/${walletId}`)
                .query({ tokenType: TokenType.USDC })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                walletId,
                tokenType: TokenType.USDC,
                balance: expect.any(Number),
                formattedBalance: expect.stringContaining('USDC'),
                isActive: expect.any(Boolean),
            });
        });

        it('should return 404 for non-existent wallet', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance/non-existent')
                .query({ tokenType: TokenType.USDC })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('GET /wallet/balance/:walletId/all', () => {
        it('should get all token balances for a wallet', async () => {
            const response = await request(app.getHttpServer())
                .get(`/wallet/balance/${walletId}/all`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            response.body.forEach((balance: any) => {
                expect(balance).toMatchObject({
                    walletId,
                    tokenType: expect.any(String),
                    balance: expect.any(Number),
                    formattedBalance: expect.any(String),
                    isActive: expect.any(Boolean),
                });
            });
        });
    });

    describe('GET /wallet/balance/:walletId/summary', () => {
        it('should get wallet balance summary', async () => {
            const response = await request(app.getHttpServer())
                .get(`/wallet/balance/${walletId}/summary`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                walletId,
                totalBalance: expect.any(Number),
                totalFormattedBalance: expect.any(String),
                tokenBalances: expect.any(Array),
                lastUpdated: expect.any(String),
            });
        });
    });

    describe('GET /wallet/balance/user/all', () => {
        it('should get all user wallet balances', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/all')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            response.body.forEach((summary: any) => {
                expect(summary).toMatchObject({
                    walletId: expect.any(String),
                    totalBalance: expect.any(Number),
                    totalFormattedBalance: expect.any(String),
                    tokenBalances: expect.any(Array),
                    lastUpdated: expect.any(String),
                });
            });
        });
    });

    describe('GET /wallet/balance/user/aggregated', () => {
        it('should get aggregated balance across all user wallets', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/aggregated')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                userId,
                totalUsdValue: expect.any(Number),
                totalFormattedValue: expect.stringMatching(/^\$\d+\.\d{2}$/),
                tokenBreakdown: {
                    usdc: {
                        balance: expect.any(Number),
                        usdValue: expect.any(Number),
                        formatted: expect.stringContaining('USDC'),
                    },
                    eurc: {
                        balance: expect.any(Number),
                        eurValue: expect.any(Number),
                        formatted: expect.stringContaining('EURC'),
                    },
                    sol: {
                        balance: expect.any(Number),
                        usdValue: expect.any(Number),
                        formatted: expect.stringContaining('SOL'),
                    },
                },
                walletCount: expect.any(Number),
                lastUpdated: expect.any(String),
            });
        });
    });

    describe('GET /wallet/balance/user/total', () => {
        it('should get total user balance', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/total')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                totalBalance: expect.any(Number),
                totalFormattedBalance: expect.any(String),
                walletCount: expect.any(Number),
                lastUpdated: expect.any(String),
            });
        });
    });

    describe('POST /wallet/balance/:walletId/refresh', () => {
        it('should refresh wallet balance from blockchain', async () => {
            const response = await request(app.getHttpServer())
                .post(`/wallet/balance/${walletId}/refresh`)
                .query({ tokenType: TokenType.USDC })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                walletId,
                tokenType: TokenType.USDC,
                balance: expect.any(Number),
                formattedBalance: expect.stringContaining('USDC'),
                isActive: expect.any(Boolean),
            });
        });
    });

    describe('POST /wallet/balance/:walletId/refresh/all', () => {
        it('should refresh all token balances for a wallet', async () => {
            const response = await request(app.getHttpServer())
                .post(`/wallet/balance/${walletId}/refresh/all`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('POST /wallet/balance/user/refresh', () => {
        it('should refresh all balances for user', async () => {
            const response = await request(app.getHttpServer())
                .post('/wallet/balance/user/refresh')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                userId,
                totalUsdValue: expect.any(Number),
                totalFormattedValue: expect.any(String),
                tokenBreakdown: expect.any(Object),
                walletCount: expect.any(Number),
                lastUpdated: expect.any(String),
            });
        });
    });

    describe('GET /wallet/balance/user/distribution', () => {
        it('should get balance distribution across tokens', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/distribution')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                usdc: expect.any(Number),
                eurc: expect.any(Number),
                sol: expect.any(Number),
                total: 100,
            });

            // Verify percentages add up to 100
            const { usdc, eurc, sol, total } = response.body;
            expect(usdc + eurc + sol).toBeCloseTo(total, 2);
        });
    });

    describe('GET /wallet/balance/user/trends', () => {
        it('should get balance trends over time', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/trends')
                .query({ days: 7 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(7);

            response.body.forEach((trend: any) => {
                expect(trend).toMatchObject({
                    date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                    totalValue: expect.any(Number),
                    usdcValue: expect.any(Number),
                    eurcValue: expect.any(Number),
                    solValue: expect.any(Number),
                });
            });
        });

        it('should use default 7 days when not specified', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/trends')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(7);
        });
    });

    describe('GET /wallet/balance/user/alerts', () => {
        it('should get balance alerts', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/alerts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);

            response.body.forEach((alert: any) => {
                expect(alert).toMatchObject({
                    type: expect.stringMatching(
                        /^(low_balance|high_balance|zero_balance|insufficient_sol)$/,
                    ),
                    message: expect.any(String),
                    severity: expect.stringMatching(/^(low|medium|high)$/),
                });
            });
        });
    });

    describe('GET /wallet/balance/user/top-wallets', () => {
        it('should get top performing wallets by balance', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/top-wallets')
                .query({ limit: 5 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);

            response.body.forEach((wallet: any) => {
                expect(wallet).toMatchObject({
                    walletId: expect.any(String),
                    totalValue: expect.any(Number),
                    formattedValue: expect.any(String),
                    tokenBreakdown: {
                        usdc: expect.any(Number),
                        eurc: expect.any(Number),
                        sol: expect.any(Number),
                    },
                });
            });
        });

        it('should use default limit when not specified', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/balance/user/top-wallets')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Error Handling', () => {
        it('should return 401 for missing authorization', async () => {
            await request(app.getHttpServer())
                .get(`/wallet/balance/${walletId}`)
                .query({ tokenType: TokenType.USDC })
                .expect(401);
        });

        it('should return 400 for invalid token type', async () => {
            await request(app.getHttpServer())
                .get(`/wallet/balance/${walletId}`)
                .query({ tokenType: 'INVALID' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });

        it('should return 400 for invalid days parameter', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance/user/trends')
                .query({ days: -1 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });

        it('should return 400 for invalid limit parameter', async () => {
            await request(app.getHttpServer())
                .get('/wallet/balance/user/top-wallets')
                .query({ limit: 0 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
});
