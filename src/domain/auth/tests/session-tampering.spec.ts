import { Test, TestingModule } from '@nestjs/testing';
import { SessionValidationService } from '../services/session-validation.service';
import { ParaSdkAuthService } from '../services/para-sdk-auth.service';

describe('Session Tampering Protection', () => {
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

        service = module.get<SessionValidationService>(SessionValidationService);
        paraSdkAuthService = module.get<ParaSdkAuthService>(ParaSdkAuthService);
    });

    describe('Token Tampering Detection', () => {
        it('should detect character substitution attacks', async () => {
            const originalToken = 'valid-session-token-12345';
            const tamperedTokens = [
                'valid-session-token-12346', // Last digit changed
                'valid-session-token-12344', // Last digit changed
                'valid-session-token-1234x', // Last digit replaced with letter
                'valid-session-token-1234', // Last digit removed
                'valid-session-token-123456', // Extra digit added
            ];

            // Mock valid session for original token
            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === originalToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null); // Invalid token
                });

            // Original token should work
            const originalResult = await service.validateSession(originalToken);
            expect(originalResult.isValid).toBe(true);

            // Tampered tokens should fail
            for (const tamperedToken of tamperedTokens) {
                const result = await service.validateSession(tamperedToken);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect length manipulation attacks', async () => {
            const originalToken = 'valid-session-token-12345';
            const tamperedTokens = [
                'valid-session-token-1234', // Too short
                'valid-session-token-123456', // Too long
                'valid-session-token-123456789', // Much too long
                'valid-session-token', // Much too short
            ];

            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === originalToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null);
                });

            for (const tamperedToken of tamperedTokens) {
                const result = await service.validateSession(tamperedToken);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect case manipulation attacks', async () => {
            const originalToken = 'valid-session-token-12345';
            const tamperedTokens = [
                'VALID-SESSION-TOKEN-12345', // All uppercase
                'Valid-Session-Token-12345', // Mixed case
                'valid-session-token-12345'.toUpperCase(), // Uppercase
                'valid-session-token-12345'.toLowerCase(), // Lowercase (if original was mixed)
            ];

            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === originalToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null);
                });

            for (const tamperedToken of tamperedTokens) {
                const result = await service.validateSession(tamperedToken);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect padding attacks', async () => {
            const originalToken = 'valid-session-token-12345';
            const tamperedTokens = [
                'valid-session-token-12345 ', // Trailing space
                ' valid-session-token-12345', // Leading space
                ' valid-session-token-12345 ', // Both spaces
                'valid-session-token-12345\t', // Tab character
                'valid-session-token-12345\n', // Newline
                'valid-session-token-12345\r', // Carriage return
            ];

            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === originalToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null);
                });

            for (const tamperedToken of tamperedTokens) {
                const result = await service.validateSession(tamperedToken);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect injection attacks', async () => {
            const originalToken = 'valid-session-token-12345';
            const tamperedTokens = [
                'valid-session-token-12345; DROP TABLE sessions;',
                'valid-session-token-12345<script>alert("xss")</script>',
                'valid-session-token-12345\x00null-byte',
                'valid-session-token-12345${process.env.SECRET}',
                'valid-session-token-12345" OR "1"="1',
                'valid-session-token-12345\'; DELETE FROM users; --',
            ];

            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: originalToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === originalToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null);
                });

            for (const tamperedToken of tamperedTokens) {
                const result = await service.validateSession(tamperedToken);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect replay attacks with expired tokens', async () => {
            const expiredToken = 'expired-session-token-12345';
            const expiredSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: expiredToken,
                expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(expiredSessionData);

            const result = await service.validateSession(expiredToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should detect session hijacking attempts', async () => {
            const hijackedToken = 'hijacked-session-token-12345';
            const hijackedSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: hijackedToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: false, // Session was deactivated due to hijacking
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(hijackedSessionData);

            const result = await service.validateSession(hijackedToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session is not active');
        });

        it('should handle token format validation', async () => {
            const invalidFormatTokens = [
                'not-a-valid-format',
                '123456789', // Just numbers
                'abcdefghijklmnop', // Just letters
                '!@#$%^&*()', // Special characters only
                'valid-session-token-12345-extra', // Too many parts
                'valid-session-token', // Missing required parts
            ];

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(null);

            for (const token of invalidFormatTokens) {
                const result = await service.validateSession(token);
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            }
        });

        it('should detect timing attacks', async () => {
            const validToken = 'valid-session-token-12345';
            const invalidToken = 'invalid-session-token-12345';

            const validSessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: validToken,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession')
                .mockImplementation((token) => {
                    if (token === validToken) {
                        return Promise.resolve(validSessionData);
                    }
                    return Promise.resolve(null);
                });

            const startValid = Date.now();
            await service.validateSession(validToken);
            const endValid = Date.now();

            const startInvalid = Date.now();
            await service.validateSession(invalidToken);
            const endInvalid = Date.now();

            // Both should take similar time to prevent timing attacks
            const validTime = endValid - startValid;
            const invalidTime = endInvalid - startInvalid;

            // Allow some variance but should be roughly similar
            expect(Math.abs(validTime - invalidTime)).toBeLessThan(100);
        });
    });
});
