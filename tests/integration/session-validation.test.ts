import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SessionValidationService } from '../../src/domain/auth/services/session-validation.service';
import { ParaSdkAuthService } from '../../src/infrastructure/adapters/auth/para-sdk/para-sdk-auth.service';

describe('Session Validation Integration Tests', () => {
    let app: INestApplication;
    let sessionValidationService: SessionValidationService;
    let paraSdkAuthService: ParaSdkAuthService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        sessionValidationService = moduleFixture.get<SessionValidationService>(
            SessionValidationService,
        );
        paraSdkAuthService =
            moduleFixture.get<ParaSdkAuthService>(ParaSdkAuthService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Session Validation Middleware Integration', () => {
        it('should protect all API endpoints with session validation', async () => {
            const endpoints = [
                { method: 'GET', path: '/user/profile' },
                { method: 'GET', path: '/wallet/balance' },
                { method: 'GET', path: '/transactions' },
                { method: 'GET', path: '/contacts' },
                { method: 'GET', path: '/onramp/status' },
                { method: 'GET', path: '/offramp/status' },
                { method: 'GET', path: '/transfer/history' },
                { method: 'GET', path: '/solana/funding/status' },
            ];

            for (const endpoint of endpoints) {
                let response: any;
                switch (endpoint.method.toLowerCase()) {
                    case 'get':
                        response = await request(app.getHttpServer())
                            .get(endpoint.path)
                            .expect(401);
                        break;
                    case 'post':
                        response = await request(app.getHttpServer())
                            .post(endpoint.path)
                            .expect(401);
                        break;
                    case 'put':
                        response = await request(app.getHttpServer())
                            .put(endpoint.path)
                            .expect(401);
                        break;
                    case 'patch':
                        response = await request(app.getHttpServer())
                            .patch(endpoint.path)
                            .expect(401);
                        break;
                    case 'delete':
                        response = await request(app.getHttpServer())
                            .delete(endpoint.path)
                            .expect(401);
                        break;
                    default:
                        throw new Error(
                            `Unsupported method: ${endpoint.method}`,
                        );
                }

                expect(response.body.message).toContain(
                    'Authorization header with Bearer token is required',
                );
            }
        });

        it('should accept valid session tokens', async () => {
            const validToken = 'valid-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: validToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                mockSessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should reject invalid session tokens', async () => {
            const invalidToken = 'invalid-session-token';

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                null,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);

            expect(response.body.message).toContain('Invalid session token');
        });

        it('should reject expired session tokens', async () => {
            const expiredToken = 'expired-session-token';
            const expiredSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: expiredToken,
                expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                expiredSessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session has expired');
        });

        it('should reject inactive session tokens', async () => {
            const inactiveToken = 'inactive-session-token';
            const inactiveSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: inactiveToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Inactive session
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                inactiveSessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${inactiveToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should handle malformed authorization headers', async () => {
            const malformedHeaders = [
                'InvalidToken',
                'Bearer',
                'Bearer ',
                'Basic valid-token',
                'Token valid-token',
                '',
            ];

            for (const header of malformedHeaders) {
                const response = await request(app.getHttpServer())
                    .get('/user/profile')
                    .set('Authorization', header)
                    .expect(401);

                expect(response.body.message).toContain(
                    'Authorization header with Bearer token is required',
                );
            }
        });

        it('should handle missing authorization headers', async () => {
            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .expect(401);

            expect(response.body.message).toContain(
                'Authorization header with Bearer token is required',
            );
        });

        it('should handle concurrent session validation requests', async () => {
            const validToken = 'valid-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: validToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                mockSessionData,
            );

            // Simulate 10 concurrent requests
            const promises = Array(10)
                .fill(null)
                .map(() =>
                    request(app.getHttpServer())
                        .get('/user/profile')
                        .set('Authorization', `Bearer ${validToken}`),
                );

            const responses = await Promise.all(promises);

            // All should succeed
            responses.forEach((response) => {
                expect(response.status).toBe(200);
            });
        });

        it('should handle session validation errors gracefully', async () => {
            const errorToken = 'error-session-token';

            jest.spyOn(paraSdkAuthService, 'validateSession').mockRejectedValue(
                new Error('Service unavailable'),
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${errorToken}`)
                .expect(401);

            expect(response.body.message).toContain(
                'Session validation failed',
            );
        });

        it('should validate session for different HTTP methods', async () => {
            const validToken = 'valid-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: validToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                mockSessionData,
            );

            const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

            for (const method of methods) {
                let response: any;
                switch (method.toLowerCase()) {
                    case 'get':
                        response = await request(app.getHttpServer())
                            .get('/user/profile')
                            .set('Authorization', `Bearer ${validToken}`);
                        break;
                    case 'post':
                        response = await request(app.getHttpServer())
                            .post('/user/profile')
                            .set('Authorization', `Bearer ${validToken}`);
                        break;
                    case 'put':
                        response = await request(app.getHttpServer())
                            .put('/user/profile')
                            .set('Authorization', `Bearer ${validToken}`);
                        break;
                    case 'patch':
                        response = await request(app.getHttpServer())
                            .patch('/user/profile')
                            .set('Authorization', `Bearer ${validToken}`);
                        break;
                    case 'delete':
                        response = await request(app.getHttpServer())
                            .delete('/user/profile')
                            .set('Authorization', `Bearer ${validToken}`);
                        break;
                    default:
                        throw new Error(`Unsupported method: ${method}`);
                }

                // Should not get 401 (unauthorized) - session validation passed
                expect(response.status).not.toBe(401);
            }
        });

        it('should handle session refresh during validation', async () => {
            const refreshToken = 'refresh-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: refreshToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                mockSessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${refreshToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it('should handle session validation with different user contexts', async () => {
            const userTokens = [
                { token: 'user1-token', userId: 'user-1' },
                { token: 'user2-token', userId: 'user-2' },
                { token: 'user3-token', userId: 'user-3' },
            ];

            jest.spyOn(
                paraSdkAuthService,
                'validateSession',
            ).mockImplementation((token) => {
                const user = userTokens.find((u) => u.token === token);
                if (user) {
                    return Promise.resolve({
                        userId: user.userId,
                        email: `${user.userId}@example.com`,
                        authProvider: 'PARA',
                        authProviderId: `para-${user.userId}`,
                        sessionToken: token,
                        expiresAt: new Date(Date.now() + 3600000),
                        isActive: true,
                    });
                }
                return Promise.resolve(null);
            });

            for (const userToken of userTokens) {
                const response = await request(app.getHttpServer())
                    .get('/user/profile')
                    .set('Authorization', `Bearer ${userToken.token}`)
                    .expect(200);

                expect(response.body).toBeDefined();
            }
        });
    });
});
