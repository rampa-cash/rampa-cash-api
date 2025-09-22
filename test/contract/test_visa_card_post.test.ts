import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('VISA Card POST (Contract)', () => {
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

    describe('POST /visa-card', () => {
        it('should create a new virtual VISA card', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            const response = await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('cardNumber');
            expect(response.body).toHaveProperty('lastFourDigits');
            expect(response.body).toHaveProperty('expiryMonth');
            expect(response.body).toHaveProperty('expiryYear');
            expect(response.body).toHaveProperty(
                'cardholderName',
                cardData.cardholderName,
            );
            expect(response.body).toHaveProperty('type', cardData.type);
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty(
                'balance',
                cardData.initialBalance,
            );
            expect(response.body).toHaveProperty('currency', cardData.currency);
            expect(response.body).toHaveProperty('createdAt');
        });

        it('should create a new physical VISA card', async () => {
            const cardData = {
                type: 'PHYSICAL',
                cardholderName: 'Jane Smith',
                billingAddress: {
                    street: '456 Oak Ave',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'US',
                },
                initialBalance: '500.00',
                currency: 'USD',
                design: 'PREMIUM',
                shippingAddress: {
                    street: '456 Oak Ave',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90210',
                    country: 'US',
                },
            };

            const response = await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('cardNumber');
            expect(response.body).toHaveProperty('lastFourDigits');
            expect(response.body).toHaveProperty('expiryMonth');
            expect(response.body).toHaveProperty('expiryYear');
            expect(response.body).toHaveProperty(
                'cardholderName',
                cardData.cardholderName,
            );
            expect(response.body).toHaveProperty('type', cardData.type);
            expect(response.body).toHaveProperty('status', 'PENDING');
            expect(response.body).toHaveProperty(
                'balance',
                cardData.initialBalance,
            );
            expect(response.body).toHaveProperty('currency', cardData.currency);
            expect(response.body).toHaveProperty('shippingAddress');
        });

        it('should return 400 for invalid card type', async () => {
            const cardData = {
                type: 'INVALID_TYPE',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for invalid cardholder name', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: '', // Empty name
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for invalid initial balance', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: 'invalid-balance',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for negative initial balance', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '-100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for initial balance below minimum', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '5.00', // Below minimum
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for unsupported currency', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'UNSUPPORTED',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for invalid design', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'INVALID_DESIGN',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for invalid billing address', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '', // Empty street
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const cardData = {
                type: 'VIRTUAL',
                // Missing cardholderName, billingAddress, etc.
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 400 for insufficient balance', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '999999999.99', // Very large amount
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'John Doe',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US',
                },
                initialBalance: '100.00',
                currency: 'USD',
                design: 'DEFAULT',
            };

            await request(app.getHttpServer())
                .post('/visa-card')
                .send(cardData)
                .expect(401);
        });
    });

    describe('POST /visa-card/{id}/activate', () => {
        it('should activate a VISA card', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/activate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', cardId);
            expect(response.body).toHaveProperty('status', 'ACTIVE');
            expect(response.body).toHaveProperty('activatedAt');
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/activate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 400 for already activated card', async () => {
            const cardId = 'already-activated-card-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/activate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/activate`)
                .expect(401);
        });
    });

    describe('POST /visa-card/{id}/deactivate', () => {
        it('should deactivate a VISA card', async () => {
            const cardId = 'test-card-id';

            const response = await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/deactivate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', cardId);
            expect(response.body).toHaveProperty('status', 'INACTIVE');
            expect(response.body).toHaveProperty('deactivatedAt');
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/deactivate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });

        it('should return 400 for already deactivated card', async () => {
            const cardId = 'already-deactivated-card-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/deactivate`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/deactivate`)
                .expect(401);
        });
    });

    describe('POST /visa-card/{id}/top-up', () => {
        it('should top up a VISA card', async () => {
            const cardId = 'test-card-id';
            const topUpData = {
                amount: '50.00',
                currency: 'USD',
                paymentMethod: 'WALLET',
            };

            const response = await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/top-up`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(topUpData)
                .expect(200);

            expect(response.body).toHaveProperty('cardId', cardId);
            expect(response.body).toHaveProperty('amount', topUpData.amount);
            expect(response.body).toHaveProperty(
                'currency',
                topUpData.currency,
            );
            expect(response.body).toHaveProperty('newBalance');
            expect(response.body).toHaveProperty('transactionId');
        });

        it('should return 400 for invalid top-up amount', async () => {
            const cardId = 'test-card-id';
            const topUpData = {
                amount: 'invalid-amount',
                currency: 'USD',
                paymentMethod: 'WALLET',
            };

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/top-up`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(topUpData)
                .expect(400);
        });

        it('should return 400 for insufficient balance', async () => {
            const cardId = 'test-card-id';
            const topUpData = {
                amount: '999999999.99', // Very large amount
                currency: 'USD',
                paymentMethod: 'WALLET',
            };

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/top-up`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(topUpData)
                .expect(400);
        });

        it('should return 404 for non-existent card', async () => {
            const cardId = 'non-existent-id';
            const topUpData = {
                amount: '50.00',
                currency: 'USD',
                paymentMethod: 'WALLET',
            };

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/top-up`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send(topUpData)
                .expect(404);
        });

        it('should return 401 for unauthenticated request', async () => {
            const cardId = 'test-card-id';
            const topUpData = {
                amount: '50.00',
                currency: 'USD',
                paymentMethod: 'WALLET',
            };

            await request(app.getHttpServer())
                .post(`/visa-card/${cardId}/top-up`)
                .send(topUpData)
                .expect(401);
        });
    });
});
