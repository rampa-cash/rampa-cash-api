import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('OffRamp Initiate (Contract)', () => {
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

    describe('POST /offramp/initiate', () => {
        it('should initiate offramp to bank account', async () => {
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

            const response = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(response.body).toHaveProperty('offrampId');
            expect(response.body).toHaveProperty('amount', offrampData.amount);
            expect(response.body).toHaveProperty('currency', offrampData.currency);
            expect(response.body).toHaveProperty('destinationType', offrampData.destinationType);
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('estimatedArrival');
        });

        it('should initiate offramp to debit card', async () => {
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

            const response = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(response.body).toHaveProperty('offrampId');
            expect(response.body).toHaveProperty('amount', offrampData.amount);
            expect(response.body).toHaveProperty('currency', offrampData.currency);
            expect(response.body).toHaveProperty('destinationType', offrampData.destinationType);
            expect(response.body).toHaveProperty('status', 'PENDING');
        });

        it('should initiate offramp to PayPal', async () => {
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

            const response = await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(201);

            expect(response.body).toHaveProperty('offrampId');
            expect(response.body).toHaveProperty('amount', offrampData.amount);
            expect(response.body).toHaveProperty('currency', offrampData.currency);
            expect(response.body).toHaveProperty('destinationType', offrampData.destinationType);
            expect(response.body).toHaveProperty('status', 'PENDING');
        });

        it('should return 400 for invalid amount format', async () => {
            const offrampData = {
                amount: 'invalid-amount',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for negative amount', async () => {
            const offrampData = {
                amount: '-100.00',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for amount below minimum', async () => {
            const offrampData = {
                amount: '5.00', // Below minimum
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for amount above maximum', async () => {
            const offrampData = {
                amount: '50000.00', // Above maximum
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for unsupported currency', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'UNSUPPORTED',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for invalid destination type', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'INVALID_TYPE',
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for invalid bank account number', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'BANK_ACCOUNT',
                bankDetails: {
                    accountNumber: '123', // Invalid account number
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for invalid routing number', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'BANK_ACCOUNT',
                bankDetails: {
                    accountNumber: '1234567890',
                    routingNumber: '123', // Invalid routing number
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
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for invalid PayPal email', async () => {
            const offrampData = {
                amount: '100.00',
                currency: 'USDC',
                destinationType: 'PAYPAL',
                paypalDetails: {
                    email: 'invalid-email', // Invalid email
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
                .send(offrampData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const offrampData = {
                amount: '100.00',
                // Missing currency, destinationType, etc.
            };

            await request(app.getHttpServer())
                .post('/offramp/initiate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
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
        });

        it('should return 400 for insufficient balance', async () => {
            const offrampData = {
                amount: '999999999.99', // Very large amount
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
                .set('Authorization', `Bearer ${accessToken}`)
                .send(offrampData)
                .expect(400);
        });
    });

    describe('GET /offramp/{id}/status', () => {
        it('should return offramp status', async () => {
            const offrampId = 'test-offramp-id';

            const response = await request(app.getHttpServer())
                .get(`/offramp/${offrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('offrampId', offrampId);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('amount');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('createdAt');
        });

        it('should return 404 for non-existent offramp', async () => {
            const offrampId = 'non-existent-id';

            await request(app.getHttpServer())
                .get(`/offramp/${offrampId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const offrampId = 'test-offramp-id';

            await request(app.getHttpServer())
                .get(`/offramp/${offrampId}/status`)
                .expect(401);
        });
    });
});
