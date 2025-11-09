import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('User Flows E2E Tests', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let sessionToken: string;
    let userId: string;
    let walletId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [],
                    synchronize: true,
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        dataSource = moduleFixture.get<DataSource>(DataSource);

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete User Registration Flow', () => {
        it('should complete full user registration and setup', async () => {
            // Step 1: Import session from Para SDK
            const sessionData = {
                sessionId: 'e2e-session-id',
                userId: 'e2e-user-id',
                provider: 'google',
                email: 'e2e@example.com',
                name: 'E2E Test User',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
            };

            const sessionResponse = await request(app.getHttpServer())
                .post('/auth/session/import')
                .send(sessionData)
                .expect(201);

            expect(sessionResponse.body).toHaveProperty('sessionId');
            expect(sessionResponse.body).toHaveProperty('userId');
            sessionToken = sessionResponse.body.sessionToken;
            userId = sessionResponse.body.userId;

            // Step 2: Get user profile
            const profileResponse = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(profileResponse.body).toHaveProperty('id');
            expect(profileResponse.body).toHaveProperty('email');
            expect(profileResponse.body).toHaveProperty('name');

            // Step 3: Complete KYC
            const kycData = {
                firstName: 'E2E',
                lastName: 'Test',
                phoneNumber: '+1234567890',
                dateOfBirth: '1990-01-01',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
            };

            const kycResponse = await request(app.getHttpServer())
                .put('/users/profile')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(kycData)
                .expect(200);

            expect(kycResponse.body).toHaveProperty('kycStatus');
            expect(kycResponse.body.kycStatus).toBe('completed');

            // Step 4: Create wallet
            const walletData = {
                type: 'para',
                name: 'E2E Test Wallet',
            };

            const walletResponse = await request(app.getHttpServer())
                .post('/wallets')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(walletData)
                .expect(201);

            expect(walletResponse.body).toHaveProperty('id');
            expect(walletResponse.body).toHaveProperty('address');
            walletId = walletResponse.body.id;

            // Step 5: Check wallet balance
            const balanceResponse = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(balanceResponse.body).toHaveProperty('balances');
            expect(Array.isArray(balanceResponse.body.balances)).toBe(true);
        });
    });

    describe('Complete Transaction Flow', () => {
        it('should complete full transaction from creation to completion', async () => {
            // Step 1: Create a contact
            const contactData = {
                name: 'Test Contact',
                email: 'contact@example.com',
                phoneNumber: '+1987654321',
                walletAddress: 'test-wallet-address-123',
            };

            const contactResponse = await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(contactData)
                .expect(201);

            expect(contactResponse.body).toHaveProperty('id');
            const contactId = contactResponse.body.id;

            // Step 2: Create transaction
            const transactionData = {
                senderId: userId,
                recipientId: contactId,
                amount: '1000000', // 1 USDC in micro units
                tokenType: 'USDC',
                description: 'E2E Test Transaction',
            };

            const transactionResponse = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(transactionData)
                .expect(201);

            expect(transactionResponse.body).toHaveProperty('id');
            expect(transactionResponse.body).toHaveProperty('status');
            const transactionId = transactionResponse.body.id;

            // Step 3: Check transaction status
            const statusResponse = await request(app.getHttpServer())
                .get(`/transactions/${transactionId}/status`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(statusResponse.body).toHaveProperty('status');

            // Step 4: Get transaction history
            const historyResponse = await request(app.getHttpServer())
                .get('/transactions/history')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(historyResponse.body).toHaveProperty('transactions');
            expect(Array.isArray(historyResponse.body.transactions)).toBe(true);
        });
    });

    describe('Complete OnRamp Flow', () => {
        it('should complete full on-ramp process', async () => {
            // Step 1: Initiate on-ramp
            const onRampData = {
                userId: userId,
                amount: 100.0,
                currency: 'USD',
                paymentMethod: 'card',
                walletId: walletId,
            };

            const onRampResponse = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(onRampData)
                .expect(201);

            expect(onRampResponse.body).toHaveProperty('id');
            expect(onRampResponse.body).toHaveProperty('status');
            const onRampId = onRampResponse.body.id;

            // Step 2: Check on-ramp status
            const statusResponse = await request(app.getHttpServer())
                .get(`/onramp/status/${onRampId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(statusResponse.body).toHaveProperty('id');
            expect(statusResponse.body).toHaveProperty('status');

            // Step 3: Simulate payment completion webhook
            const webhookData = {
                event: 'payment.completed',
                data: {
                    transactionId: onRampId,
                    status: 'completed',
                    amount: 100.0,
                    currency: 'USD',
                },
                signature: 'test-signature',
            };

            const webhookResponse = await request(app.getHttpServer())
                .post('/webhooks/payment')
                .send(webhookData)
                .expect(200);

            expect(webhookResponse.body).toHaveProperty('received');

            // Step 4: Verify wallet balance updated
            const balanceResponse = await request(app.getHttpServer())
                .get(`/wallets/${walletId}/balance`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(balanceResponse.body).toHaveProperty('balances');
        });
    });

    describe('Complete Learning Flow', () => {
        it('should complete full learning module flow', async () => {
            // Step 1: Get available learning modules
            const modulesResponse = await request(app.getHttpServer())
                .get('/learning/modules')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(modulesResponse.body).toHaveProperty('modules');
            expect(Array.isArray(modulesResponse.body.modules)).toBe(true);

            // Step 2: Start a learning module
            const moduleId = 'test-module-id';
            const startResponse = await request(app.getHttpServer())
                .post(`/learning/modules/${moduleId}/start`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(201);

            expect(startResponse.body).toHaveProperty('progressId');
            expect(startResponse.body).toHaveProperty('status');

            // Step 3: Update progress
            const progressData = {
                progress: 50,
            };

            const progressResponse = await request(app.getHttpServer())
                .put(`/learning/modules/${moduleId}/progress`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(progressData)
                .expect(200);

            expect(progressResponse.body).toHaveProperty('progress');
            expect(progressResponse.body).toHaveProperty('status');

            // Step 4: Complete module
            const completeResponse = await request(app.getHttpServer())
                .post(`/learning/modules/${moduleId}/complete`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(completeResponse.body).toHaveProperty('status');
            expect(completeResponse.body.status).toBe('completed');

            // Step 5: Check BONK rewards
            const rewardsResponse = await request(app.getHttpServer())
                .get('/learning/rewards')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(rewardsResponse.body).toHaveProperty('rewards');
            expect(Array.isArray(rewardsResponse.body.rewards)).toBe(true);
        });
    });

    describe('Complete Investment Flow', () => {
        it('should complete full investment flow', async () => {
            // Step 1: Get investment options
            const optionsResponse = await request(app.getHttpServer())
                .get('/investments/options')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(optionsResponse.body).toHaveProperty('options');
            expect(Array.isArray(optionsResponse.body.options)).toBe(true);

            // Step 2: Create investment
            const investmentData = {
                investmentOptionId: 'test-option-id',
                amount: 1000,
            };

            const investmentResponse = await request(app.getHttpServer())
                .post('/investments/invest')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(investmentData)
                .expect(201);

            expect(investmentResponse.body).toHaveProperty('id');
            expect(investmentResponse.body).toHaveProperty('status');
            const investmentId = investmentResponse.body.id;

            // Step 3: Check investment status
            const statusResponse = await request(app.getHttpServer())
                .get(`/investments/my-investments/${investmentId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(statusResponse.body).toHaveProperty('id');
            expect(statusResponse.body).toHaveProperty('status');

            // Step 4: Get investment performance
            const performanceResponse = await request(app.getHttpServer())
                .get('/investments/my-investments/performance')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(performanceResponse.body).toHaveProperty('investments');
            expect(Array.isArray(performanceResponse.body.investments)).toBe(
                true,
            );
        });
    });

    describe('Error Recovery Flow', () => {
        it('should handle and recover from errors gracefully', async () => {
            // Step 1: Attempt invalid transaction
            const invalidTransactionData = {
                senderId: userId,
                recipientId: 'invalid-recipient',
                amount: '1000000',
                tokenType: 'USDC',
                description: 'Invalid Transaction',
            };

            const errorResponse = await request(app.getHttpServer())
                .post('/transactions')
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(invalidTransactionData)
                .expect(400);

            expect(errorResponse.body).toHaveProperty('message');

            // Step 2: Verify system still works after error
            const healthResponse = await request(app.getHttpServer())
                .get('/health')
                .expect(200);

            expect(healthResponse.body).toHaveProperty('status');
            expect(healthResponse.body.status).toBe('ok');

            // Step 3: Verify user can still access their data
            const profileResponse = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(profileResponse.body).toHaveProperty('id');
        });
    });

    describe('Session Management Flow', () => {
        it('should handle session refresh and expiration', async () => {
            // Step 1: Refresh session
            const refreshResponse = await request(app.getHttpServer())
                .post('/auth/session/refresh')
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);

            expect(refreshResponse.body).toHaveProperty('sessionToken');
            expect(refreshResponse.body).toHaveProperty('expiresAt');

            // Step 2: Use refreshed session
            const profileResponse = await request(app.getHttpServer())
                .get('/users/profile')
                .set(
                    'Authorization',
                    `Bearer ${refreshResponse.body.sessionToken}`,
                )
                .expect(200);

            expect(profileResponse.body).toHaveProperty('id');

            // Step 3: Test expired session
            const expiredToken = 'expired-token';
            const expiredResponse = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(expiredResponse.body).toHaveProperty('message');
        });
    });
});
