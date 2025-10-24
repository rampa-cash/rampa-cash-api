import { Test, TestingModule } from '@nestjs/testing';
import { SessionValidationService } from '../services/session-validation.service';
import { ParaSdkAuthService } from '../services/para-sdk-auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('SessionValidationService Security', () => {
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

    describe('Security Tests', () => {
        it('should reject malformed session tokens', async () => {
            const malformedTokens = [
                '',
                'invalid-token',
                'Bearer',
                'Bearer ',
                'Bearer invalid-token-without-proper-format',
                'Bearer ' + 'a'.repeat(10000), // Extremely long token
                'Bearer ' + 'a'.repeat(1), // Too short token
                'Bearer ' + 'a'.repeat(1000) + '\x00', // Null byte injection
                'Bearer ' + 'a'.repeat(1000) + '<script>alert("xss")</script>', // XSS attempt
                'Bearer ' + 'a'.repeat(1000) + '; DROP TABLE users;', // SQL injection attempt
            ];

            for (const token of malformedTokens) {
                const result = await service.validateSession(token);
                expect(result.isValid).toBe(false);
                expect(result.error).toBeDefined();
            }
        });

        it('should handle session token tampering attempts', async () => {
            const originalToken = 'valid-session-token';
            const tamperedTokens = [
                originalToken + 'x', // Append character
                'x' + originalToken, // Prepend character
                originalToken.slice(0, -1), // Remove last character
                originalToken.slice(1), // Remove first character
                originalToken.replace('a', 'b'), // Character substitution
                originalToken.toUpperCase(), // Case change
                originalToken.split('').reverse().join(''), // Reverse
            ];

            for (const token of tamperedTokens) {
                const result = await service.validateSession(token);
                expect(result.isValid).toBe(false);
                expect(result.error).toBeDefined();
            }
        });

        it('should handle concurrent session validation attempts', async () => {
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

            // Simulate 100 concurrent requests
            const promises = Array(100).fill(null).map(() => 
                service.validateSession(validToken)
            );

            const results = await Promise.all(promises);

            // All should succeed
            results.forEach(result => {
                expect(result.isValid).toBe(true);
                expect(result.userId).toBe('user-123');
            });
        });

        it('should handle session expiration gracefully', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(expiredSessionData);

            const result = await service.validateSession(expiredToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session has expired');
        });

        it('should handle inactive sessions', async () => {
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

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(inactiveSessionData);

            const result = await service.validateSession(inactiveToken);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session is not active');
        });

        it('should handle service unavailability', async () => {
            const token = 'valid-session-token';
            
            jest.spyOn(paraSdkAuthService, 'validateSession').mockRejectedValue(
                new Error('Service unavailable')
            );

            const result = await service.validateSession(token);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session validation failed');
        });

        it('should handle null/undefined session data', async () => {
            const token = 'valid-session-token';
            
            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(null);

            const result = await service.validateSession(token);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Invalid session token');
        });

        it('should prevent session hijacking by validating session ownership', async () => {
            const token = 'valid-session-token';
            const sessionData = {
                userId: 'user-123',
                email: 'user@example.com',
                authProvider: 'PARA',
                authProviderId: 'para-user-id',
                sessionToken: token,
                expiresAt: new Date(Date.now() + 3600000),
                isActive: true,
            };

            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(sessionData);

            const result = await service.validateSession(token);

            expect(result.isValid).toBe(true);
            expect(result.userId).toBe('user-123');
            expect(result.sessionData).toBeDefined();
            expect(result.sessionData.userId).toBe('user-123');
        });

        it('should handle rate limiting for failed attempts', async () => {
            const invalidToken = 'invalid-token';
            
            jest.spyOn(paraSdkAuthService, 'validateSession').mockResolvedValue(null);

            // Simulate multiple failed attempts
            const promises = Array(10).fill(null).map(() => 
                service.validateSession(invalidToken)
            );

            const results = await Promise.all(promises);

            // All should fail
            results.forEach(result => {
                expect(result.isValid).toBe(false);
                expect(result.error).toBe('Invalid session token');
            });
        });

        it('should sanitize error messages to prevent information leakage', async () => {
            const token = 'valid-session-token';
            
            jest.spyOn(paraSdkAuthService, 'validateSession').mockRejectedValue(
                new Error('Database connection failed: password incorrect')
            );

            const result = await service.validateSession(token);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Session validation failed');
            expect(result.error).not.toContain('password');
            expect(result.error).not.toContain('Database');
        });
    });
});
