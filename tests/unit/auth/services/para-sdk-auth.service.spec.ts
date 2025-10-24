import { Test, TestingModule } from '@nestjs/testing';
import { ParaSdkAuthService } from '../../../../src/domain/auth/services/para-sdk-auth.service';
import { ParaSdkConfigService } from '../../../../src/domain/auth/services/para-sdk-config.service';
import { AuthProvider } from '../../../../src/domain/auth/interfaces/authentication-service.interface';

describe('ParaSdkAuthService', () => {
    let service: ParaSdkAuthService;
    let configService: ParaSdkConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ParaSdkAuthService,
                {
                    provide: ParaSdkConfigService,
                    useValue: {
                        getApiKey: jest.fn(),
                        getApiSecret: jest.fn(),
                        getBaseUrl: jest.fn(),
                        getEnvironment: jest.fn(),
                        getConfig: jest.fn(),
                        validateConfig: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ParaSdkAuthService>(ParaSdkAuthService);
        configService = module.get<ParaSdkConfigService>(ParaSdkConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('healthCheck', () => {
        it('should return true for healthy service', async () => {
            const result = await service.healthCheck();
            expect(result).toBe(true);
        });
    });

    describe('getConfiguration', () => {
        it('should return service configuration', () => {
            const mockConfig = {
                apiKey: 'test-key',
                apiSecret: 'test-secret',
                baseUrl: 'https://api.test.com',
                environment: 'development',
                walletProvider: 'para',
                sessionTtl: '3600',
                enableLogging: true,
            };
            jest.spyOn(configService, 'getConfig').mockReturnValue(mockConfig);

            const result = service.getConfiguration();

            expect(result).toEqual(mockConfig);
            expect(configService.getConfig).toHaveBeenCalled();
        });
    });

    describe('initialize', () => {
        it('should initialize service successfully', async () => {
            jest.spyOn(configService, 'validateConfig').mockReturnValue({
                isValid: true,
                errors: [],
            });

            await expect(service.initialize()).resolves.not.toThrow();
        });

        it('should throw error for invalid configuration', async () => {
            jest.spyOn(configService, 'validateConfig').mockReturnValue({
                isValid: false,
                errors: ['Invalid API key'],
            });

            await expect(service.initialize()).rejects.toThrow('Para SDK configuration invalid');
        });
    });

    describe('cleanup', () => {
        it('should cleanup service successfully', async () => {
            await expect(service.cleanup()).resolves.not.toThrow();
        });
    });

    describe('validateSession', () => {
        it('should validate session successfully', async () => {
            const result = await service.validateSession('valid-token');

            expect(result).toEqual({
                userId: 'placeholder-user-id',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: 'valid-token',
                expiresAt: expect.any(Date),
                isActive: true,
            });
        });

        it('should handle validation errors', async () => {
            jest.spyOn(service, 'validateSession').mockRejectedValue(new Error('Network error'));

            const result = await service.validateSession('invalid-token');

            expect(result).toBeNull();
        });
    });

    describe('createSession', () => {
        it('should create session successfully', async () => {
            const userInfo = {
                id: 'user-123',
                email: 'user@example.com',
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
            };

            const result = await service.createSession(userInfo);

            expect(result).toEqual({
                sessionToken: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
                refreshToken: expect.stringMatching(/^refresh_\d+_[a-z0-9]+$/),
                expiresAt: expect.any(Date),
                user: userInfo,
            });
        });
    });

    describe('refreshSession', () => {
        it('should refresh session successfully', async () => {
            const result = await service.refreshSession('refresh-token');

            expect(result).toEqual({
                sessionToken: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
                refreshToken: expect.stringMatching(/^refresh_\d+_[a-z0-9]+$/),
                expiresAt: expect.any(Date),
                user: {
                    id: 'placeholder-user-id',
                    email: 'user@example.com',
                    authProvider: 'PARA',
                    authProviderId: 'para-user-id',
                },
            });
        });
    });

    describe('revokeSession', () => {
        it('should revoke session successfully', async () => {
            await expect(service.revokeSession('session-token')).resolves.not.toThrow();
        });
    });

    describe('getUserInfo', () => {
        it('should get user info successfully', async () => {
            const result = await service.getUserInfo('valid-token');

            expect(result).toEqual({
                id: 'placeholder-user-id',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
            });
        });

        it('should return null for invalid token', async () => {
            jest.spyOn(service, 'validateSession').mockResolvedValue(null);

            const result = await service.getUserInfo('invalid-token');

            expect(result).toBeNull();
        });
    });

    describe('verifyProviderToken', () => {
        it('should verify provider token successfully', async () => {
            const result = await service.verifyProviderToken('provider-token', AuthProvider.PARA);

            expect(result).toEqual({
                id: 'placeholder-user-id',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
            });
        });
    });
});