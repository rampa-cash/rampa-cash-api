import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('OnRamp Initiate (Contract)', () => {
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

    describe('POST /onramp/initiate', () => {
        it('should initiate onramp with credit card', async () => {
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

            const response = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(201);

            expect(response.body).toHaveProperty('onrampId');
            expect(response.body).toHaveProperty('amount', onrampData.amount);
            expect(response.body).toHaveProperty('currency', onrampData.currency);
            expect(response.body).toHaveProperty('paymentMethod', onrampData.paymentMethod);
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('expiresAt');
        });

        it('should initiate onramp with bank transfer', async () => {
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

            const response = await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(201);

            expect(response.body).toHaveProperty('onrampId');
            expect(response.body).toHaveProperty('amount', onrampData.amount);
            expect(response.body).toHaveProperty('currency', onrampData.currency);
            expect(response.body).toHaveProperty('paymentMethod', onrampData.paymentMethod);
            expect(response.body).toHaveProperty('status', 'PENDING');
        });

        it('should return 400 for invalid amount format', async () => {
            const onrampData = {
                amount: 'invalid-amount',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for negative amount', async () => {
            const onrampData = {
                amount: '-100.00',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for amount below minimum', async () => {
            const onrampData = {
                amount: '5.00', // Below minimum
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for amount above maximum', async () => {
            const onrampData = {
                amount: '100000.00', // Above maximum
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for unsupported currency', async () => {
            const onrampData = {
                amount: '100.00',
                currency: 'UNSUPPORTED',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for invalid payment method', async () => {
            const onrampData = {
                amount: '100.00',
                currency: 'USDC',
                paymentMethod: 'INVALID_METHOD',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for invalid card number', async () => {
            const onrampData = {
                amount: '100.00',
                currency: 'USDC',
                paymentMethod: 'CREDIT_CARD',
                cardDetails: {
                    cardNumber: '1234', // Invalid card number
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
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for expired card', async () => {
            const onrampData = {
                amount: '100.00',
                currency: 'USDC',
                paymentMethod: 'CREDIT_CARD',
                cardDetails: {
                    cardNumber: '4111111111111111',
                    expiryMonth: '01',
                    expiryYear: '2020', // Expired
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
                .send(onrampData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const onrampData = {
                amount: '100.00',
                // Missing currency, paymentMethod, etc.
            };

            await request(app.getHttpServer())
                .post('/onramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(onrampData)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
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
        });
    });

    describe('GET /onramp/{id}/status', () => {
        it('should return onramp status', async () => {
            const onrampId = 'test-onramp-id';

            const response = await request(app.getHttpServer())
                .get(`/onramp/${onrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('onrampId', onrampId);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('createdAt');
        });

        it('should return 404 for non-existent onramp', async () => {
            const onrampId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/onramp/${onrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const onrampId = 'test-onramp-id';

            await request(app.getHttpServer())
                .get(`/onramp/${onrampId}/status`)
                .expect(401);
        });
    });
});
