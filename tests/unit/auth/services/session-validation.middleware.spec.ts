import { Test, TestingModule } from '@nestjs/testing';
import { SessionValidationMiddleware } from '../../../../src/domain/auth/middleware/session-validation.middleware';
import { SessionValidationService } from '../../../../src/domain/auth/services/session-validation.service';

describe('SessionValidationMiddleware', () => {
    let middleware: SessionValidationMiddleware;
    let sessionValidationService: SessionValidationService;

    const mockSessionValidationService = {
        validateSession: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionValidationMiddleware,
                {
                    provide: SessionValidationService,
                    useValue: mockSessionValidationService,
                },
            ],
        }).compile();

        middleware = module.get<SessionValidationMiddleware>(SessionValidationMiddleware);
        sessionValidationService = module.get<SessionValidationService>(SessionValidationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockRequest = {
                headers: {},
                user: undefined,
                sessionToken: undefined,
            };
            mockResponse = {};
            mockNext = jest.fn();
        });

        it('should validate session successfully', async () => {
            const sessionToken = 'valid-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                expiresAt: new Date(Date.now() + 3600000),
            };

            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockResolvedValue({
                isValid: true,
                userId: 'user-123',
                sessionData: mockSessionData,
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.user).toEqual({
                id: 'user-123',
                sessionData: mockSessionData,
            });
            expect(mockRequest.sessionToken).toBe(sessionToken);
            expect(mockNext).toHaveBeenCalled();
            expect(sessionValidationService.validateSession).toHaveBeenCalledWith(sessionToken);
        });

        it('should throw UnauthorizedException for missing authorization header', async () => {
            mockRequest.headers.authorization = undefined;

            await expect(middleware.use(mockRequest, mockResponse, mockNext)).rejects.toThrow(
                'Authorization header with Bearer token is required'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for invalid authorization format', async () => {
            mockRequest.headers.authorization = 'InvalidFormat token';

            await expect(middleware.use(mockRequest, mockResponse, mockNext)).rejects.toThrow(
                'Authorization header with Bearer token is required'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for invalid session', async () => {
            const sessionToken = 'invalid-session-token';
            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockResolvedValue({
                isValid: false,
                error: 'Invalid session token',
            });

            await expect(middleware.use(mockRequest, mockResponse, mockNext)).rejects.toThrow(
                'Invalid session token'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException for expired session', async () => {
            const sessionToken = 'expired-session-token';
            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockResolvedValue({
                isValid: false,
                error: 'Session expired',
            });

            await expect(middleware.use(mockRequest, mockResponse, mockNext)).rejects.toThrow(
                'Session expired'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle validation service errors', async () => {
            const sessionToken = 'test-token';
            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockRejectedValue(
                new Error('Validation service error')
            );

            await expect(middleware.use(mockRequest, mockResponse, mockNext)).rejects.toThrow(
                'Session validation failed'
            );
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});

describe('OptionalSessionValidationMiddleware', () => {
    let middleware: any;
    let sessionValidationService: SessionValidationService;

    const mockSessionValidationService = {
        validateSession: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: 'OptionalSessionValidationMiddleware',
                    useClass: class extends (await import('../../../../src/domain/auth/middleware/session-validation.middleware')).OptionalSessionValidationMiddleware {
                        constructor(sessionValidationService: SessionValidationService) {
                            super(sessionValidationService);
                        }
                    },
                },
                {
                    provide: SessionValidationService,
                    useValue: mockSessionValidationService,
                },
            ],
        }).compile();

        middleware = module.get('OptionalSessionValidationMiddleware');
        sessionValidationService = module.get<SessionValidationService>(SessionValidationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    describe('use', () => {
        let mockRequest: any;
        let mockResponse: any;
        let mockNext: jest.Mock;

        beforeEach(() => {
            mockRequest = {
                headers: {},
                user: undefined,
                sessionToken: undefined,
            };
            mockResponse = {};
            mockNext = jest.fn();
        });

        it('should validate session when authorization header is present', async () => {
            const sessionToken = 'valid-session-token';
            const mockSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                expiresAt: new Date(Date.now() + 3600000),
            };

            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockResolvedValue({
                isValid: true,
                userId: 'user-123',
                sessionData: mockSessionData,
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.user).toEqual({
                id: 'user-123',
                sessionData: mockSessionData,
            });
            expect(mockRequest.sessionToken).toBe(sessionToken);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should continue without validation when no authorization header', async () => {
            mockRequest.headers.authorization = undefined;

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockRequest.sessionToken).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
            expect(sessionValidationService.validateSession).not.toHaveBeenCalled();
        });

        it('should continue without validation when session is invalid', async () => {
            const sessionToken = 'invalid-session-token';
            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockResolvedValue({
                isValid: false,
                error: 'Invalid session token',
            });

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockRequest.sessionToken).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
        });

        it('should continue on validation service errors', async () => {
            const sessionToken = 'test-token';
            mockRequest.headers.authorization = `Bearer ${sessionToken}`;

            mockSessionValidationService.validateSession.mockRejectedValue(
                new Error('Validation service error')
            );

            await middleware.use(mockRequest, mockResponse, mockNext);

            expect(mockRequest.user).toBeUndefined();
            expect(mockRequest.sessionToken).toBeUndefined();
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
