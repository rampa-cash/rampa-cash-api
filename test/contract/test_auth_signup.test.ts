import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Auth Signup (Contract)', () => {
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

    describe('POST /auth/signup', () => {
        it('should create a new user account', async () => {
            const signupData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            const response = await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(201);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty(
                'email',
                signupData.email,
            );
            expect(response.body.user).toHaveProperty(
                'firstName',
                signupData.firstName,
            );
            expect(response.body.user).toHaveProperty(
                'lastName',
                signupData.lastName,
            );
            expect(response.body.user).toHaveProperty(
                'phoneNumber',
                signupData.phoneNumber,
            );
            expect(response.body.user).toHaveProperty(
                'country',
                signupData.country,
            );
            expect(response.body.user).toHaveProperty(
                'dateOfBirth',
                signupData.dateOfBirth,
            );
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should return 400 for invalid email format', async () => {
            const signupData = {
                email: 'invalid-email',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(400);
        });

        it('should return 400 for weak password', async () => {
            const signupData = {
                email: 'test@example.com',
                password: '123',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(400);
        });

        it('should return 400 for missing required fields', async () => {
            const signupData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
                // Missing firstName, lastName, etc.
            };

            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(400);
        });

        it('should return 409 for duplicate email', async () => {
            const signupData = {
                email: 'duplicate@example.com',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+1234567890',
                country: 'US',
                dateOfBirth: '1990-01-01',
                acceptTerms: true,
                acceptPrivacy: true,
            };

            // First signup should succeed
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(201);

            // Second signup with same email should fail
            await request(app.getHttpServer())
                .post('/auth/signup')
                .send(signupData)
                .expect(409);
        });

        it('should return 400 for terms not accepted', async () => {
            const signupData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
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

        it('should return 400 for privacy policy not accepted', async () => {
            const signupData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
                firstName: 'John',
                lastName: 'Doe',
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
