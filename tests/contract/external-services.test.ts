import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('External Services Contract Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Para SDK Integration', () => {
        it('should handle Para SDK session import', async () => {
            const mockSessionData = {
                sessionId: 'test-session-id',
                userId: 'test-user-id',
                provider: 'google',
                email: 'test@example.com',
                name: 'Test User',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
            };

            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(mockSessionData)
                .expect(201);

            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('userId');
        });

        it('should handle Para SDK session validation', async () => {
            const mockSessionToken = 'test-session-token';

            const response = await request(app.getHttpServer())
                .post('/auth/session/validate')
                .send({ sessionToken: mockSessionToken })
                .expect(200);

            expect(response.body).toHaveProperty('valid');
            expect(response.body).toHaveProperty('session');
        });

        it('should handle Para SDK session refresh', async () => {
            const mockSessionToken = 'test-session-token';

            const response = await request(app.getHttpServer())
                .post('/auth/session/refresh')
                .send({ sessionToken: mockSessionToken })
                .expect(200);

            expect(response.body).toHaveProperty('sessionToken');
            expect(response.body).toHaveProperty('expiresAt');
        });
    });

    describe('Solana Blockchain Integration', () => {
        it('should handle Solana wallet creation', async () => {
            const mockWalletData = {
                userId: 'test-user-id',
                type: 'para',
                name: 'Test Wallet',
            };

            const response = await request(app.getHttpServer())
                .post('/wallets')
                .set('Authorization', 'Bearer test-session-token')
                .send(mockWalletData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('address');
            expect(response.body).toHaveProperty('type');
        });

        it('should handle Solana balance checking', async () => {
            const walletId = 'test-wallet-id';

            const response = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', 'Bearer test-session-token')
                .expect(200);

            expect(response.body).toHaveProperty('balances');
            expect(Array.isArray(response.body.balances)).toBe(true);
        });

        it('should handle Solana transaction creation', async () => {
            const mockTransactionData = {
                senderId: 'test-sender-id',
                recipientId: 'test-recipient-id',
                amount: '1000000', // 1 USDC in micro units
                tokenType: 'USDC',
                description: 'Test transaction',
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', 'Bearer test-session-token')
                .send(mockTransactionData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
        });
    });

    describe('Payment Provider Integration', () => {
        it('should handle on-ramp initiation', async () => {
            const mockOnRampData = {
                userId: 'test-user-id',
                amount: 100.00,
                currency: 'USD',
                paymentMethod: 'card',
                walletId: 'test-wallet-id',
            };

            const response = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', 'Bearer test-session-token')
                .send(mockOnRampData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
        });

        it('should handle on-ramp status checking', async () => {
            const onRampId = 'test-onramp-id';

            const response = await request(app.getHttpServer())
                .get(`/onramp/status/${onRampId}`)
                .set('Authorization', 'Bearer test-session-token')
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
        });

        it('should handle payment provider webhooks', async () => {
            const mockWebhookData = {
                event: 'payment.completed',
                data: {
                    transactionId: 'test-transaction-id',
                    status: 'completed',
                    amount: 100.00,
                    currency: 'USD',
                },
                signature: 'test-signature',
            };

            const response = await request(app.getHttpServer())
                .post('/webhooks/payment')
                .send(mockWebhookData)
                .expect(200);

            expect(response.body).toHaveProperty('received');
        });
    });

    describe('External API Error Handling', () => {
        it('should handle Para SDK service unavailable', async () => {
            const mockSessionData = {
                sessionId: 'invalid-session-id',
                userId: 'test-user-id',
                provider: 'google',
                email: 'test@example.com',
                name: 'Test User',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
            };

            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(mockSessionData)
                .expect(503);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('service unavailable');
        });

        it('should handle Solana RPC errors', async () => {
            const walletId = 'invalid-wallet-id';

            const response = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', 'Bearer test-session-token')
                .expect(503);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('blockchain service unavailable');
        });

        it('should handle payment provider errors', async () => {
            const mockOnRampData = {
                userId: 'test-user-id',
                amount: 0.01, // Below minimum amount
                currency: 'USD',
                paymentMethod: 'card',
                walletId: 'test-wallet-id',
            };

            const response = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', 'Bearer test-session-token')
                .send(mockOnRampData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('minimum amount');
        });
    });

    describe('External Service Timeout Handling', () => {
        it('should handle Para SDK timeout', async () => {
            const mockSessionData = {
                sessionId: 'timeout-session-id',
                userId: 'test-user-id',
                provider: 'google',
                email: 'test@example.com',
                name: 'Test User',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
            };

            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(mockSessionData)
                .expect(504);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('timeout');
        });

        it('should handle Solana RPC timeout', async () => {
            const walletId = 'timeout-wallet-id';

            const response = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', 'Bearer test-session-token')
                .expect(504);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('timeout');
        });
    });

    describe('External Service Rate Limiting', () => {
        it('should handle Para SDK rate limiting', async () => {
            const mockSessionData = {
                sessionId: 'rate-limited-session-id',
                userId: 'test-user-id',
                provider: 'google',
                email: 'test@example.com',
                name: 'Test User',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
            };

            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(mockSessionData)
                .expect(429);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('rate limit');
        });

        it('should handle Solana RPC rate limiting', async () => {
            const walletId = 'rate-limited-wallet-id';

            const response = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', 'Bearer test-session-token')
                .expect(429);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('rate limit');
        });
    });

    describe('External Service Data Validation', () => {
        it('should validate Para SDK session data format', async () => {
            const invalidSessionData = {
                sessionId: 'test-session-id',
                // Missing required fields
            };

            const response = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(invalidSessionData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('validation');
        });

        it('should validate Solana transaction data format', async () => {
            const invalidTransactionData = {
                senderId: 'test-sender-id',
                // Missing required fields
            };

            const response = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', 'Bearer test-session-token')
                .send(invalidTransactionData)
                .expect(400);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('validation');
        });
    });
});
