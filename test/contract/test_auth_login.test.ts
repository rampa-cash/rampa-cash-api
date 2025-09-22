import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../../src/app.module';

describe('Auth Login (Contract)', () => {
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

    describe('POST /auth/login', () => {
        it('should login with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
            };

            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('email', loginData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should return 401 for invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'SecurePassword123!',
            };

            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(401);
        });

        it('should return 401 for invalid password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'WrongPassword123!',
            };

            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(401);
        });

        it('should return 400 for missing email', async () => {
            const loginData = {
                password: 'SecurePassword123!',
            };

            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(400);
        });

        it('should return 400 for missing password', async () => {
            const loginData = {
                email: 'test@example.com',
            };

            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(400);
        });

        it('should return 400 for invalid email format', async () => {
            const loginData = {
                email: 'invalid-email',
                password: 'SecurePassword123!',
            };

            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(400);
        });

        it('should return 400 for empty request body', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({})
                .expect(400);
        });

        it('should return 429 for too many login attempts', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'WrongPassword123!',
            };

            // Make multiple failed login attempts
            for (let i = 0; i < 6; i++) {
                await request(app.getHttpServer())
                    .post('/auth/login')
                    .send(loginData);
            }

            // The 6th attempt should be rate limited
            await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(429);
        });
    });

    describe('POST /auth/refresh', () => {
        it('should refresh access token with valid refresh token', async () => {
            // First login to get tokens
            const loginData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
            };

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            const refreshToken = loginResponse.body.refreshToken;

            // Use refresh token to get new access token
            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
        });

        it('should return 401 for invalid refresh token', async () => {
            const refreshData = {
                refreshToken: 'invalid-refresh-token',
            };

            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send(refreshData)
                .expect(401);
        });

        it('should return 400 for missing refresh token', async () => {
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({})
                .expect(400);
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout successfully with valid access token', async () => {
            // First login to get access token
            const loginData = {
                email: 'test@example.com',
                password: 'SecurePassword123!',
            };

            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send(loginData)
                .expect(200);

            const accessToken = loginResponse.body.accessToken;

            // Logout with access token
            await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
        });

        it('should return 401 for missing access token', async () => {
            await request(app.getHttpServer())
                .post('/auth/logout')
                .expect(401);
        });

        it('should return 401 for invalid access token', async () => {
            await request(app.getHttpServer())
                .post('/auth/logout')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });
});
