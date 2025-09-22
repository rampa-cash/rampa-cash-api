import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('User Registration Flow (Integration)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Complete User Registration Flow', () => {
        it('should complete full user registration and setup', async () => {
            // Step 1: User signup
            const signupData = {
                email: 'integration-test@example.com',
                password: 'SecurePassword123!',
                firstName: 'Integration',
                lastName: 'Test',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            const signupResponse = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(201);

            expect(signupResponse.body).toHaveProperty('user');
            expect(signupResponse.body).toHaveProperty('accessToken');
            expect(signupResponse.body).toHaveProperty('refreshToken');
            expect(signupResponse.body.user.email).toBe(signupData.email);

            const accessToken = signupResponse.body.accessToken;
            const userId = signupResponse.body.user.id;

            // Step 2: Verify user can login
            const loginData = {
                email: signupData.email,
                password: signupData.password,
            };

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            expect(loginResponse.body).toHaveProperty('accessToken');
            expect(loginResponse.body.user.id).toBe(userId);

            // Step 3: Check initial wallet status (should be empty or have default balance)
            const walletResponse = await request(app.getHttpServer())
                .get('/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(walletResponse.body).toHaveProperty('walletId');
            expect(walletResponse.body).toHaveProperty('balances');

            // Step 4: Connect external wallet
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
            expect(walletConnectResponse.body).toHaveProperty(
                'isConnected',
                true,
            );

            // Step 5: Create a contact
            const contactData = {
                name: 'Test Contact',
                email: 'contact@example.com',
                phoneNumber: '+0987654321',
                walletAddress: '8YzCXwCbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                type: 'REGULAR',
                isFavorite: false,
            };

            const contactResponse = await request(app.getHttpServer())
                .post('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(contactData)
                .expect(201);

            expect(contactResponse.body).toHaveProperty('id');
            expect(contactResponse.body.name).toBe(contactData.name);

            // Step 6: Create a VISA card
            const cardData = {
                type: 'VIRTUAL',
                cardholderName: 'Integration Test',
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

            const cardResponse = await request(app.getHttpServer())
                .post('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(cardData)
                .expect(201);

            expect(cardResponse.body).toHaveProperty('id');
            expect(cardResponse.body.cardholderName).toBe(
                cardData.cardholderName,
            );

            // Step 7: Verify user can access all their data
            const userDataResponse = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(userDataResponse.body).toHaveProperty('id', userId);
            expect(userDataResponse.body).toHaveProperty(
                'email',
                signupData.email,
            );

            // Step 8: Verify wallet status after setup
            const finalWalletResponse = await request(app.getHttpServer())
                .get('/wallet/status')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(finalWalletResponse.body).toHaveProperty(
                'isConnected',
                true,
            );

            // Step 9: Verify contacts are accessible
            const contactsResponse = await request(app.getHttpServer())
                .get('/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(contactsResponse.body).toHaveProperty('contacts');
            expect(contactsResponse.body.contacts.length).toBeGreaterThan(0);

            // Step 10: Verify VISA cards are accessible
            const cardsResponse = await request(app.getHttpServer())
                .get('/visa-card')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(cardsResponse.body).toHaveProperty('cards');
            expect(cardsResponse.body.cards.length).toBeGreaterThan(0);
        });

        it('should handle registration with existing email gracefully', async () => {
            const signupData = {
                email: 'existing@example.com',
                password: 'SecurePassword123!',
                firstName: 'Existing',
                lastName: 'User',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            // First registration should succeed
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(201);

            // Second registration with same email should fail
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(409);
        });

        it('should handle registration with invalid data', async () => {
            const invalidSignupData = {
                email: 'invalid-email',
                password: '123', // Too weak
                firstName: '',
                lastName: '',
                phoneNumber: 'invalid-phone',
                country: 'US',
                dateOfBirth: 'invalid-date',
                acceptTerms: false,
                acceptPrivacy: false,
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(invalidSignupData)
                .expect(400);
        });

        it('should handle registration without accepting terms', async () => {
            const signupData = {
                email: 'no-terms@example.com',
                password: 'SecurePassword123!',
                firstName: 'No',
                lastName: 'Terms',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: false,
                acceptPrivacy: true,
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(400);
        });

        it('should handle registration without accepting privacy policy', async () => {
            const signupData = {
                email: 'no-privacy@example.com',
                password: 'SecurePassword123!',
                firstName: 'No',
                lastName: 'Privacy',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: false,
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(400);
        });
    });
});
