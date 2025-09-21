import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Wallet Creation Flow (Integration)', () => {
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

    describe('Complete Wallet Creation and Management Flow', () => {
        it('should create and manage wallet successfully', async () => {
            // Step 1: Check initial wallet status
            const initialWalletResponse = await request(app.getHttpServer())
                .get('/wallet/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(initialWalletResponse.body).toHaveProperty('isConnected');
            expect(initialWalletResponse.body).toHaveProperty('walletId');

            // Step 2: Connect external wallet
            const walletConnectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            const walletConnectResponse = await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(walletConnectData)
                .expect(200);

            expect(walletConnectResponse.body).toHaveProperty('walletId');
            expect(walletConnectResponse.body).toHaveProperty('isConnected', true);
            expect(walletConnectResponse.body).toHaveProperty('walletAddress', walletConnectData.walletAddress);

            const walletId = walletConnectResponse.body.walletId;

            // Step 3: Verify wallet connection
            const walletStatusResponse = await request(app.getHttpServer())
                .get('/wallet/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(walletStatusResponse.body).toHaveProperty('isConnected', true);
            expect(walletStatusResponse.body).toHaveProperty('walletId', walletId);

            // Step 4: Check wallet balance
            const balanceResponse = await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(balanceResponse.body).toHaveProperty('walletId', walletId);
            expect(balanceResponse.body).toHaveProperty('balances');
            expect(Array.isArray(balanceResponse.body.balances)).toBe(true);

            // Step 5: Check specific currency balance
            const usdcBalanceResponse = await request(app.getHttpServer())
                .get('/wallet/balance/USDC')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(usdcBalanceResponse.body).toHaveProperty('walletId', walletId);
            expect(usdcBalanceResponse.body).toHaveProperty('currency', 'USDC');
            expect(usdcBalanceResponse.body).toHaveProperty('amount');
            expect(usdcBalanceResponse.body).toHaveProperty('available');
            expect(usdcBalanceResponse.body).toHaveProperty('locked');

            // Step 6: Get wallet transactions
            const transactionsResponse = await request(app.getHttpServer())
                .get('/wallet/transactions')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(transactionsResponse.body).toHaveProperty('transactions');
            expect(Array.isArray(transactionsResponse.body.transactions)).toBe(true);
            expect(transactionsResponse.body).toHaveProperty('pagination');

            // Step 7: Verify wallet ownership
            const verifyData = {
                walletAddress: walletConnectData.walletAddress,
                signature: 'mock-signature-data',
                message: 'mock-message',
            };

            const verifyResponse = await request(app.getHttpServer())
                .post('/wallet/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(verifyData)
                .expect(200);

            expect(verifyResponse.body).toHaveProperty('verified', true);
            expect(verifyResponse.body).toHaveProperty('walletAddress', walletConnectData.walletAddress);

            // Step 8: Disconnect wallet
            const disconnectResponse = await request(app.getHttpServer())
                .post('/wallet/disconnect')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(disconnectResponse.body).toHaveProperty('message', 'Wallet disconnected successfully');

            // Step 9: Verify wallet is disconnected
            const finalStatusResponse = await request(app.getHttpServer())
                .get('/wallet/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(finalStatusResponse.body).toHaveProperty('isConnected', false);
        });

        it('should handle wallet connection with invalid data', async () => {
            const invalidWalletData = {
                walletAddress: 'invalid-address',
                walletType: 'UNSUPPORTED',
                signature: 'invalid-signature',
                publicKey: 'invalid-public-key',
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidWalletData)
                .expect(400);
        });

        it('should handle duplicate wallet connection', async () => {
            const walletConnectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            // First connection should succeed
            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(walletConnectData)
                .expect(200);

            // Second connection with same wallet should fail
            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(walletConnectData)
                .expect(409);
        });

        it('should handle wallet verification with invalid signature', async () => {
            const verifyData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                signature: 'invalid-signature',
                message: 'mock-message',
            };

            await request(app.getHttpServer())
                .post('/wallet/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(verifyData)
                .expect(400);
        });

        it('should handle wallet disconnect when no wallet is connected', async () => {
            // Ensure no wallet is connected
            await request(app.getHttpServer())
                .post('/wallet/disconnect')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should handle wallet operations without authentication', async () => {
            await request(app.getHttpServer())
                .get('/wallet/status')
                .expect(401);

            await request(app.getHttpServer())
                .get('/wallet/balance')
                .expect(401);

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .send({})
                .expect(401);
        });
    });
});
