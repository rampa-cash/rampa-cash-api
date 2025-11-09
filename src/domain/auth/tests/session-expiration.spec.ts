import { Test, TestingModule } from '@nestjs/testing';
import { SessionValidationService } from '../services/session-validation.service';
import { ParaSdkAuthService } from '../../../infrastructure/adapters/auth/para-sdk/para-sdk-auth.service';

describe('Session Expiration Handling', () => {
    let service: SessionValidationService;
    let paraSdkAuthService: ParaSdkAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionValidationService,
                {
                    provide: ParaSdkAuthService,
                    useValue: {
                        validateSession: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SessionValidationService>(
            SessionValidationService,
        );
        paraSdkAuthService = module.get<ParaSdkAuthService>(ParaSdkAuthService);
    });

    describe('Session Expiration Tests', () => {
        it('should reject expired sessions', async () => {
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

            const result = await service.validateSession(expiredToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should accept sessions that are about to expire but not yet expired', async () => {
            const aboutToExpireToken = 'about-to-expire-session-token';
            const aboutToExpireSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: aboutToExpireToken,
                expiresAt: new Date(Date.now() + 1000), // Expires in 1 second
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                aboutToExpireSessionData,
            );

            const result = await service.validateSession(aboutToExpireToken);

            expect(result.isValid).toBe(true);
            expect(result.userId).toBe('user-123');
        });

        it('should handle sessions that expired exactly now', async () => {
            const justExpiredToken = 'just-expired-session-token';
            const justExpiredSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: justExpiredToken,
                expiresAt: new Date(Date.now()), // Expires exactly now
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                justExpiredSessionData,
            );

            const result = await service.validateSession(justExpiredToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle sessions with very short expiration times', async () => {
            const shortExpirationToken = 'short-expiration-session-token';
            const shortExpirationSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: shortExpirationToken,
                expiresAt: new Date(Date.now() + 100), // Expires in 100ms
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                shortExpirationSessionData,
            );

            const result = await service.validateSession(shortExpirationToken);

            expect(result.isValid).toBe(true);
            expect(result.userId).toBe('user-123');
        });

        it('should handle sessions with very long expiration times', async () => {
            const longExpirationToken = 'long-expiration-session-token';
            const longExpirationSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: longExpirationToken,
                expiresAt: new Date(Date.now() + 365 * 24 * 3600000), // Expires in 1 year
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                longExpirationSessionData,
            );

            const result = await service.validateSession(longExpirationToken);

            expect(result.isValid).toBe(true);
            expect(result.userId).toBe('user-123');
        });

        it('should handle sessions with invalid expiration dates', async () => {
            const invalidExpirationToken = 'invalid-expiration-session-token';
            const invalidExpirationSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: invalidExpirationToken,
                expiresAt: new Date('invalid-date'), // Invalid date
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                invalidExpirationSessionData,
            );

            const result = await service.validateSession(
                invalidExpirationToken,
            );

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle sessions with null expiration dates', async () => {
            const nullExpirationToken = 'null-expiration-session-token';
            const nullExpirationSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: nullExpirationToken,
                expiresAt: null, // Null expiration
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                nullExpirationSessionData,
            );

            const result = await service.validateSession(nullExpirationToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle sessions with undefined expiration dates', async () => {
            const undefinedExpirationToken =
                'undefined-expiration-session-token';
            const undefinedExpirationSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: undefinedExpirationToken,
                expiresAt: undefined, // Undefined expiration
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                undefinedExpirationSessionData,
            );

            const result = await service.validateSession(
                undefinedExpirationToken,
            );

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle timezone differences in expiration dates', async () => {
            const timezoneToken = 'timezone-session-token';
            const timezoneSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: timezoneToken,
                expiresAt: new Date('2023-12-31T23:59:59Z'), // UTC time
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                timezoneSessionData,
            );

            const result = await service.validateSession(timezoneToken);

            // Should be expired since it's a past date
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle edge case where expiration is exactly at epoch', async () => {
            const epochToken = 'epoch-session-token';
            const epochSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: epochToken,
                expiresAt: new Date(0), // Unix epoch
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                epochSessionData,
            );

            const result = await service.validateSession(epochToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle future expiration dates far in the future', async () => {
            const futureToken = 'future-session-token';
            const futureSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: futureToken,
                expiresAt: new Date(Date.now() + 10 * 365 * 24 * 3600000), // 10 years from now
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                futureSessionData,
            );

            const result = await service.validateSession(futureToken);

            expect(result.isValid).toBe(true);
            expect(result.userId).toBe('user-123');
        });

        it('should handle concurrent expiration checks', async () => {
            const token = 'concurrent-expiration-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 1000), // Expires in 1 second
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(
                sessionData,
            );

            // Simulate multiple concurrent requests
            const promises = Array(10)
                .fill(null)
                .map(() => service.validateSession(token));

            const results = await Promise.all(promises);

            // All should succeed since they're within expiration time
            results.forEach((result) => {
                expect(result.isValid).toBe(true);
                expect(result.userId).toBe('user-123');
            });
        });

        it('should handle expiration during validation process', async () => {
            const token = 'expiring-during-validation-token';
            let callCount = 0;

            jest.spyOn(
                paraSdkAuthService,
                'validateSession',
            ).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // First call - session is valid
                    return Promise.resolve({
                        userId: 'user-123',
                        email: 'user@example.com',
                        authProvider: 'PARA',
                        authProviderId: 'para-user-id',
                        sessionToken: token,
                        expiresAt: new Date(Date.now() + 1000), // Expires in 1 second
                        isActive: true,
                    });
                } else {
                    // Second call - session has expired
                    return Promise.resolve({
                        userId: 'user-123',
                        email: 'user@example.com',
                        authProvider: 'PARA',
                        authProviderId: 'para-user-id',
                        sessionToken: token,
                        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
                        isActive: true,
                    });
                }
            });

            // First validation should succeed
            const firstResult = await service.validateSession(token);
            expect(firstResult.isValid).toBe(true);

            // Wait a bit for expiration
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Second validation should fail
            const secondResult = await service.validateSession(token);
            expect(secondResult.isValid).toBe(false);
            expect(secondResult.error).toBe('Session has expired');
        });
    });
});
