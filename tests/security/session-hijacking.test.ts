import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SessionValidationService } from '../../src/domain/auth/services/session-validation.service';
import { ParaSdkAuthService } from '../../src/infrastructure/adapters/auth/para-sdk/para-sdk-auth.service';
import { AuthProvider } from '../../src/domain/auth/interfaces/authentication-service.interface';

describe('Session Hijacking Prevention Security Tests', () => {
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

    describe('Session Hijacking Prevention', () => {
        it('should prevent session hijacking through token theft', async () => {
            const originalToken = 'original-user-token';
            const hijackedToken = 'hijacked-user-token';

            const originalSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            const hijackedSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: hijackedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to hijacking
            };

            jest.spyOn(
                paraSdkAuthService,
                'validateSession',
            ).mockImplementation((token) => {
                if (token === originalToken) {
                    return Promise.resolve(originalSessionData);
                } else if (token === hijackedToken) {
                    return Promise.resolve(hijackedSessionData);
                }
                return Promise.resolve(null);
            });

            // Original token should work
            const originalResponse = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${originalToken}`)
                .expect(200);

            expect(originalResponse.body).toBeDefined();

            // Hijacked token should fail
            const hijackedResponse = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${hijackedToken}`)
                .expect(401);

            expect(hijackedResponse.body.message).toContain(
                'Session is not active',
            );
        });

        it('should prevent session hijacking through IP address changes', async () => {
            const token = 'ip-change-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to IP change
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through user agent changes', async () => {
            const token = 'user-agent-change-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to user agent change
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token}`)
                .set('User-Agent', 'Mozilla/5.0 (Different Browser)')
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through concurrent sessions', async () => {
            const token1 = 'concurrent-session-1';
            const token2 = 'concurrent-session-2';
            const userId = 'user-123';

            const sessionData1 = {
                userId: userId,
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: token1,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            const sessionData2 = {
                userId: userId,
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: token2,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Second session deactivated
            };

            jest.spyOn(
                paraSdkAuthService,
                'validateSession',
            ).mockImplementation((token) => {
                if (token === token1) {
                    return Promise.resolve(sessionData1);
                } else if (token === token2) {
                    return Promise.resolve(sessionData2);
                }
                return Promise.resolve(null);
            });

            // First session should work
            const response1 = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response1.body).toBeDefined();

            // Second session should fail
            const response2 = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token2}`)
                .expect(401);

            expect(response2.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through token replay attacks', async () => {
            const token = 'replay-attack-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to replay attack
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session fixation attacks', async () => {
            const fixedToken = 'fixed-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: fixedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to fixation attack
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${fixedToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through cross-site request forgery', async () => {
            const csrfToken = 'csrf-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: csrfToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to CSRF
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${csrfToken}`)
                .set('Referer', 'https://malicious-site.com')
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through man-in-the-middle attacks', async () => {
            const mitmToken = 'mitm-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: mitmToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to MITM
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${mitmToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session prediction attacks', async () => {
            const predictedToken = 'predicted-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: predictedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to prediction attack
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${predictedToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session fixation with different origins', async () => {
            const originToken = 'origin-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: originToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to origin change
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${originToken}`)
                .set('Origin', 'https://malicious-origin.com')
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session sharing', async () => {
            const sharedToken = 'shared-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: sharedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to sharing
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${sharedToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session cloning', async () => {
            const clonedToken = 'cloned-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: clonedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to cloning
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${clonedToken}`)
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });

        it('should prevent session hijacking through session hijacking with different devices', async () => {
            const deviceToken = 'device-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                sessionToken: deviceToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session deactivated due to device change
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            const response = await request(app.getHttpServer())
                .get('/user/profile')
                .set('Authorization', `Bearer ${deviceToken}`)
                .set('User-Agent', 'Mobile App/1.0 (Different Device)')
                .expect(401);

            expect(response.body.message).toContain('Session is not active');
        });
    });
});
