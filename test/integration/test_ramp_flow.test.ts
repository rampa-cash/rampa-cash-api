import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Ramp Flow (Integration)', () => {
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

    describe('Complete OnRamp Flow', () => {
        it('should complete full onramp process', async () => {
            // Step 1: Initiate onramp with credit card
            const onrampData = {
                amount: '100.00',
                currency: 'USDC',
                paymentMethod: 'CREDIT_CARD',
                cardDetails: {
                    cardNumber: '4111111111111111',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cvv: '123',
                    cardholderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            const onrampResponse = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(201);

            expect(onrampResponse.body).toHaveProperty('onrampId');
            expect(onrampResponse.body).toHaveProperty(
                'amount',
                onrampData.amount,
            );
            expect(onrampResponse.body).toHaveProperty(
                'currency',
                onrampData.currency,
            );
            expect(onrampResponse.body).toHaveProperty('status', 'PENDING');

            const onrampId = onrampResponse.body.onrampId;

            // Step 2: Check onramp status
            const statusResponse = await request(app.getHttpServer())
                .get(`/onramp/${onrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statusResponse.body).toHaveProperty('onrampId', onrampId);
            expect(statusResponse.body).toHaveProperty('status');
            expect(statusResponse.body).toHaveProperty(
                'amount',
                onrampData.amount,
            );
            expect(statusResponse.body).toHaveProperty(
                'currency',
                onrampData.currency,
            );

            // Step 3: Verify wallet balance increased (simulated)
            const balanceResponse = await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(balanceResponse.body).toHaveProperty('walletId');
            expect(balanceResponse.body).toHaveProperty('balances');
        });

        it('should handle onramp with bank transfer', async () => {
            const onrampData = {
                amount: '500.00',
                currency: 'USDC',
                paymentMethod: 'BANK_TRANSFER',
                bankDetails: {
                    accountNumber: '1234567890',
                    routingNumber: '021000021',
                    accountType: 'CHECKING',
                    bankName: 'Test Bank',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            const onrampResponse = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(201);

            expect(onrampResponse.body).toHaveProperty('onrampId');
            expect(onrampResponse.body).toHaveProperty(
                'amount',
                onrampData.amount,
            );
            expect(onrampResponse.body).toHaveProperty(
                'paymentMethod',
                'BANK_TRANSFER',
            );
        });

        it('should handle onramp with invalid data', async () => {
            const invalidOnrampData = {
                amount: 'invalid-amount',
                currency: 'UNSUPPORTED',
                paymentMethod: 'INVALID_METHOD',
                cardDetails: {
                    cardNumber: '1234',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cvv: '123',
                    cardholderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidOnrampData)
                .expect(400);
        });
    });

    describe('Complete OffRamp Flow', () => {
        it('should complete full offramp process', async () => {
            // Step 1: Initiate offramp to bank account
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'BANK_ACCOUNT',
                bankDetails: {
                    accountNumber: '1234567890',
                    routingNumber: '021000021',
                    accountType: 'CHECKING',
                    bankName: 'Test Bank',
                    accountHolderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            const offrampResponse = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(offrampResponse.body).toHaveProperty('offrampId');
            expect(offrampResponse.body).toHaveProperty(
                'amount',
                offrampData.amount,
            );
            expect(offrampResponse.body).toHaveProperty(
                'currency',
                offrampData.currency,
            );
            expect(offrampResponse.body).toHaveProperty('status', 'PENDING');

            const offrampId = offrampResponse.body.offrampId;

            // Step 2: Check offramp status
            const statusResponse = await request(app.getHttpServer())
                .get(`/offramp/${offrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statusResponse.body).toHaveProperty('offrampId', offrampId);
            expect(statusResponse.body).toHaveProperty('status');
            expect(statusResponse.body).toHaveProperty(
                'amount',
                offrampData.amount,
            );
            expect(statusResponse.body).toHaveProperty(
                'currency',
                offrampData.currency,
            );

            // Step 3: Verify wallet balance decreased (simulated)
            const balanceResponse = await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(balanceResponse.body).toHaveProperty('walletId');
            expect(balanceResponse.body).toHaveProperty('balances');
        });

        it('should handle offramp to debit card', async () => {
            const offrampData = {
                amount: '50.00',
                currency: 'USDC',
                destinationType: 'DEBIT_CARD',
                cardDetails: {
                    cardNumber: '4111111111111111',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cardholderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            const offrampResponse = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(offrampResponse.body).toHaveProperty('offrampId');
            expect(offrampResponse.body).toHaveProperty(
                'amount',
                offrampData.amount,
            );
            expect(offrampResponse.body).toHaveProperty(
                'destinationType',
                'DEBIT_CARD',
            );
        });

        it('should handle offramp to PayPal', async () => {
            const offrampData = {
                amount: '75.00',
                currency: 'USDC',
                destinationType: 'PAYPAL',
                paypalDetails: {
                    email: 'john@example.com',
                    accountHolderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            const offrampResponse = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(offrampResponse.body).toHaveProperty('offrampId');
            expect(offrampResponse.body).toHaveProperty(
                'amount',
                offrampData.amount,
            );
            expect(offrampResponse.body).toHaveProperty(
                'destinationType',
                'PAYPAL',
            );
        });

        it('should handle offramp with invalid data', async () => {
            const invalidOfframpData = {
                amount: 'invalid-amount',
                currency: 'UNSUPPORTED',
                destinationType: 'INVALID_TYPE',
                bankDetails: {
                    accountNumber: '123',
                    routingNumber: '123',
                    accountType: 'CHECKING',
                    bankName: 'Test Bank',
                    accountHolderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidOfframpData)
                .expect(400);
        });
    });

    describe('Ramp Operations Without Authentication', () => {
        it('should handle onramp operations without authentication', async () => {
            const onrampData = {
                amount: '100.00',
                currency: 'USDC',
                paymentMethod: 'CREDIT_CARD',
                cardDetails: {
                    cardNumber: '4111111111111111',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cvv: '123',
                    cardholderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            await request(app.getHttpServer())
                .post('/onramp/initiate')
                .send(onrampData)
                .expect(401);

            await request(app.getHttpServer())
                .get('/onramp/test-id/status')
                .expect(401);
        });

        it('should handle offramp operations without authentication', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'BANK_ACCOUNT',
                bankDetails: {
                    accountNumber: '1234567890',
                    routingNumber: '021000021',
                    accountType: 'CHECKING',
                    bankName: 'Test Bank',
                    accountHolderName: 'John Doe',
                },
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
            };

            await request(app.getHttpServer())
                .post('/offramp/initiate')
                .send(offrampData)
                .expect(401);

            await request(app.getHttpServer())
                .get('/offramp/test-id/status')
                .expect(401);
        });
    });

    describe('Ramp Status Operations', () => {
        it('should handle non-existent onramp status', async () => {
            const nonExistentId = 'non-existent-onramp-id';

            await request(app.getHttpServer())
                .get(`/onramp/${nonExistentId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should handle non-existent offramp status', async () => {
            const nonExistentId = 'non-existent-offramp-id';

            await request(app.getHttpServer())
                .get(`/offramp/${nonExistentId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });
});
