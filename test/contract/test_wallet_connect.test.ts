import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Wallet Connect (Contract)', () => {
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

    describe('POST /wallet/connect', () => {
        it('should connect external wallet successfully', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            const response = await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(200);

            expect(response.body).toHaveProperty('walletId');
            expect(response.body).toHaveProperty('walletAddress', connectData.walletAddress);
            expect(response.body).toHaveProperty('walletType', connectData.walletType);
            expect(response.body).toHaveProperty('isConnected', true);
            expect(response.body).toHaveProperty('connectedAt');
        });

        it('should return 400 for invalid wallet address format', async () => {
            const connectData = {
                walletAddress: 'invalid-address-format',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(400);
        });

        it('should return 400 for unsupported wallet type', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'UNSUPPORTED',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                // Missing walletType, signature, publicKey
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(400);
        });

        it('should return 400 for invalid signature', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'invalid-signature',
                publicKey: 'mock-public-key',
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(400);
        });

        it('should return 409 for already connected wallet', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            // First connection should succeed
            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(200);

            // Second connection with same wallet should fail
            await request(app.getHttpServer())
                .post('/wallet/connect')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(connectData)
                .expect(409);
        });

        it('should return 401 for unauthenticated request', async () => {
            const connectData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                walletType: 'SOLANA',
                signature: 'mock-signature-data',
                publicKey: 'mock-public-key',
            };

            await request(app.getHttpServer())
                .post('/wallet/connect')
                .send(connectData)
                .expect(401);
        });
    });

    describe('POST /wallet/disconnect', () => {
        it('should disconnect wallet successfully', async () => {
            const response = await request(app.getHttpServer())
                .post('/wallet/disconnect')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Wallet disconnected successfully');
            expect(response.body).toHaveProperty('disconnectedAt');
        });

        it('should return 404 when no wallet is connected', async () => {
            // This test assumes no wallet is connected
            await request(app.getHttpServer())
                .post('/wallet/disconnect')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .post('/wallet/disconnect')
                .expect(401);
        });
    });

    describe('GET /wallet/status', () => {
        it('should return wallet connection status', async () => {
            const response = await request(app.getHttpServer())
                .get('/wallet/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('isConnected');
            expect(response.body).toHaveProperty('walletId');
            expect(response.body).toHaveProperty('walletAddress');
            expect(response.body).toHaveProperty('walletType');
            expect(response.body).toHaveProperty('connectedAt');
        });

        it('should return 401 for unauthenticated request', async () => {
            await request(app.getHttpServer())
                .get('/wallet/status')
                .expect(401);
        });
    });

    describe('POST /wallet/verify', () => {
        it('should verify wallet ownership', async () => {
            const verifyData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                signature: 'mock-signature-data',
                message: 'mock-message',
            };

            const response = await request(app.getHttpServer())
                .post('/wallet/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(verifyData)
                .expect(200);

            expect(response.body).toHaveProperty('verified', true);
            expect(response.body).toHaveProperty('walletAddress', verifyData.walletAddress);
        });

        it('should return 400 for invalid signature verification', async () => {
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

        it('should return 400 for missing verification data', async () => {
            const verifyData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                // Missing signature and message
            };

            await request(app.getHttpServer())
                .post('/wallet/verify')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(verifyData)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const verifyData = {
                walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                signature: 'mock-signature-data',
                message: 'mock-message',
            };

            await request(app.getHttpServer())
                .post('/wallet/verify')
                .send(verifyData)
                .expect(401);
        });
    });
});
