import { Test, TestingModule } from '@nestjs/testing';
import { SessionValidationService } from '../../../../src/domain/auth/services/session-validation.service';
import { ParaSdkAuthService } from '../../../../src/domain/auth/services/para-sdk-auth.service';

describe('SessionValidationService', () => {
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
                        createSession: jest.fn(),
                        refreshSession: jest.fn(),
                        revokeSession: jest.fn(),
                        getUserInfo: jest.fn(),
                        verifyProviderToken: jest.fn(),
                        healthCheck: jest.fn(),
                        getConfiguration: jest.fn(),
                        initialize: jest.fn(),
                        cleanup: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SessionValidationService>(SessionValidationService);
        paraSdkAuthService = module.get<ParaSdkAuthService>(ParaSdkAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateSession', () => {
        it('should validate valid session successfully', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.validateSession(validToken);

            expect(result).toEqual({
                id: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
            });
        });

        it('should throw UnauthorizedException for invalid session token', async () => {
            const invalidToken = 'invalid-token';

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(null);

            await expect(service.validateSession(invalidToken)).rejects.toThrow('Invalid session token');
        });

        it('should throw UnauthorizedException for inactive session', async () => {
            const inactiveToken = 'inactive-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: inactiveToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            await expect(service.validateSession(inactiveToken)).rejects.toThrow('Session is not active');
        });

        it('should throw UnauthorizedException for expired session', async () => {
            const expiredToken = 'expired-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: expiredToken,
                expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            await expect(service.validateSession(expiredToken)).rejects.toThrow('Session has expired');
        });

        it('should handle API errors gracefully', async () => {
            const token = 'test-token';

            jest.spyOn(paraSdkAuthService, 'validateSession').mockRejectedValue(
                new Error('Network error')
            );

            await expect(service.validateSession(token)).rejects.toThrow('Session validation failed');
        });
    });

    describe('isSessionValid', () => {
        it('should return true for valid session', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.isSessionValid(validToken);

            expect(result).toBe(true);
        });

        it('should return false for invalid session', async () => {
            const invalidToken = 'invalid-token';

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(null);

            const result = await service.isSessionValid(invalidToken);

            expect(result).toBe(false);
        });
    });

    describe('getUserContext', () => {
        it('should return user context for valid session', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.getUserContext(validToken);

            expect(result).toEqual({
                user: {
                    id: 'user-123',
                    email: 'user@example.com',
                    authProvider: 'PARA',
                    authProviderId: 'para-user-id',
                },
                session: {
                    token: validToken,
                    expiresAt: mockSessionData.expiresAt,
                    isActive: true,
                },
            });
        });
    });

    describe('validateSessionForOperation', () => {
        it('should validate session for operation', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.validateSessionForOperation(validToken, 'transfer', ['read:wallet']);

            expect(result).toEqual({
                id: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
            });
        });
    });

    describe('refreshSessionIfNeeded', () => {
        it('should indicate session needs refresh when close to expiry', async () => {
            const token = 'test-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.refreshSessionIfNeeded(token);

            expect(result).toEqual({
                sessionToken: token,
                needsRefresh: true,
            });
        });

        it('should indicate session does not need refresh when far from expiry', async () => {
            const token = 'test-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(mockSessionData);

            const result = await service.refreshSessionIfNeeded(token);

            expect(result).toEqual({
                sessionToken: token,
                needsRefresh: false,
            });
        });
    });
});
