import { Test, TestingModule } from '@nestjs/testing';
import { DomainAccessControlService } from '../services/domain-access-control.service';
import { DomainContextService } from '../services/domain-context.service';
import { DomainBoundaryInterceptor } from '../interceptors/domain-boundary.interceptor';
import {
    DomainType,
    OperationType,
    DomainBoundaryContext,
} from '../decorators/domain-boundary.decorator';

describe('Domain Boundary System', () => {
    let domainAccessControl: DomainAccessControlService;
    let domainContext: DomainContextService;
    let domainBoundaryInterceptor: DomainBoundaryInterceptor;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DomainAccessControlService,
                DomainContextService,
                DomainBoundaryInterceptor,
            ],
        }).compile();

        domainAccessControl = module.get<DomainAccessControlService>(
            DomainAccessControlService,
        );
        domainContext = module.get<DomainContextService>(DomainContextService);
        domainBoundaryInterceptor = module.get<DomainBoundaryInterceptor>(
            DomainBoundaryInterceptor,
        );
    });

    describe('DomainAccessControlService', () => {
        it('should validate domain boundary access successfully', async () => {
            const context: DomainBoundaryContext = {
                currentDomain: DomainType.WALLET,
                operation: OperationType.READ,
                user: {
                    id: 'user-123',
                    isVerified: true,
                    isAdmin: false,
                },
                method: {
                    name: 'getBalance',
                    className: 'WalletService',
                    parameters: [],
                },
            };

            const config = {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                requiresVerification: false,
            };

            const result = await domainAccessControl.validate(context, config);
            expect(result.isValid).toBe(true);
        });

        it('should reject cross-domain access when not allowed', async () => {
            const context: DomainBoundaryContext = {
                currentDomain: DomainType.WALLET,
                targetDomain: DomainType.USER,
                operation: OperationType.WRITE,
                user: {
                    id: 'user-123',
                    isVerified: true,
                    isAdmin: false,
                },
                method: {
                    name: 'updateUser',
                    className: 'WalletService',
                    parameters: [],
                },
            };

            const config = {
                domain: DomainType.WALLET,
                operation: OperationType.WRITE,
                allowCrossDomain: false,
                requiresVerification: true,
            };

            const result = await domainAccessControl.validate(context, config);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Cross-domain access');
        });

        it('should reject operation requiring verification for unverified user', async () => {
            const context: DomainBoundaryContext = {
                currentDomain: DomainType.WALLET,
                operation: OperationType.WRITE,
                user: {
                    id: 'user-123',
                    isVerified: false,
                    isAdmin: false,
                },
                method: {
                    name: 'updateBalance',
                    className: 'WalletService',
                    parameters: [],
                },
            };

            const config = {
                domain: DomainType.WALLET,
                operation: OperationType.WRITE,
                requiresVerification: true,
            };

            const result = await domainAccessControl.validate(context, config);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('not verified');
        });

        it('should reject operation requiring admin for non-admin user', async () => {
            const context: DomainBoundaryContext = {
                currentDomain: DomainType.USER,
                operation: OperationType.MANAGE,
                user: {
                    id: 'user-123',
                    isVerified: true,
                    isAdmin: false,
                },
                method: {
                    name: 'suspendUser',
                    className: 'UserService',
                    parameters: [],
                },
            };

            const config = {
                domain: DomainType.USER,
                operation: OperationType.MANAGE,
                requiresAdmin: true,
            };

            const result = await domainAccessControl.validate(context, config);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('admin');
        });

        it('should allow cross-domain access when explicitly allowed', () => {
            const result = domainAccessControl.isCrossDomainAccessAllowed(
                DomainType.WALLET,
                DomainType.USER,
                [DomainType.USER],
            );
            expect(result).toBe(true);
        });

        it('should check domain access matrix correctly', () => {
            const result = domainAccessControl.canAccessDomain(
                DomainType.WALLET,
                DomainType.USER,
            );
            expect(result).toBe(true);
        });

        it('should reject access to unauthorized domain', () => {
            const result = domainAccessControl.canAccessDomain(
                DomainType.USER,
                DomainType.SOLANA,
            );
            expect(result).toBe(false);
        });
    });

    describe('DomainContextService', () => {
        it('should set and get domain context', async () => {
            const requestId = 'req-123';
            const context = {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: {
                    id: 'user-123',
                    isVerified: true,
                    isAdmin: false,
                },
                request: {
                    id: requestId,
                    timestamp: new Date(),
                },
            };

            await domainContext.setContext(requestId, context);
            const retrievedContext = domainContext.getContext(requestId);

            expect(retrievedContext).toEqual(context);
        });

        it('should get contexts by domain', async () => {
            const requestId1 = 'req-1';
            const requestId2 = 'req-2';
            const requestId3 = 'req-3';

            await domainContext.setContext(requestId1, {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: { id: 'user-1', isVerified: true, isAdmin: false },
                request: { id: requestId1, timestamp: new Date() },
            });

            await domainContext.setContext(requestId2, {
                domain: DomainType.USER,
                operation: OperationType.WRITE,
                user: { id: 'user-2', isVerified: true, isAdmin: false },
                request: { id: requestId2, timestamp: new Date() },
            });

            await domainContext.setContext(requestId3, {
                domain: DomainType.WALLET,
                operation: OperationType.DELETE,
                user: { id: 'user-3', isVerified: true, isAdmin: false },
                request: { id: requestId3, timestamp: new Date() },
            });

            const walletContexts = domainContext.getContextsByDomain(
                DomainType.WALLET,
            );
            expect(walletContexts).toHaveLength(2);
            expect(
                walletContexts.every((ctx) => ctx.domain === DomainType.WALLET),
            ).toBe(true);
        });

        it('should get contexts by user', async () => {
            const requestId1 = 'req-1';
            const requestId2 = 'req-2';
            const userId = 'user-123';

            await domainContext.setContext(requestId1, {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: { id: userId, isVerified: true, isAdmin: false },
                request: { id: requestId1, timestamp: new Date() },
            });

            await domainContext.setContext(requestId2, {
                domain: DomainType.USER,
                operation: OperationType.WRITE,
                user: { id: userId, isVerified: true, isAdmin: false },
                request: { id: requestId2, timestamp: new Date() },
            });

            const userContexts = domainContext.getContextsByUser(userId);
            expect(userContexts).toHaveLength(2);
            expect(userContexts.every((ctx) => ctx.user?.id === userId)).toBe(
                true,
            );
        });

        it('should check if user has active operations in domain', async () => {
            const requestId = 'req-123';
            const userId = 'user-123';

            await domainContext.setContext(requestId, {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: { id: userId, isVerified: true, isAdmin: false },
                request: { id: requestId, timestamp: new Date() },
            });

            const hasWalletOperations =
                domainContext.hasActiveOperationsInDomain(
                    userId,
                    DomainType.WALLET,
                );
            const hasUserOperations = domainContext.hasActiveOperationsInDomain(
                userId,
                DomainType.USER,
            );

            expect(hasWalletOperations).toBe(true);
            expect(hasUserOperations).toBe(false);
        });

        it('should get operation statistics', async () => {
            const requestId1 = 'req-1';
            const requestId2 = 'req-2';
            const requestId3 = 'req-3';

            await domainContext.setContext(requestId1, {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: { id: 'user-1', isVerified: true, isAdmin: false },
                request: { id: requestId1, timestamp: new Date() },
            });

            await domainContext.setContext(requestId2, {
                domain: DomainType.USER,
                operation: OperationType.WRITE,
                user: { id: 'user-2', isVerified: true, isAdmin: false },
                request: { id: requestId2, timestamp: new Date() },
            });

            await domainContext.setContext(requestId3, {
                domain: DomainType.WALLET,
                operation: OperationType.DELETE,
                user: { id: 'user-1', isVerified: true, isAdmin: false },
                request: { id: requestId3, timestamp: new Date() },
            });

            const stats = domainContext.getOperationStatistics();

            expect(stats.totalOperations).toBe(3);
            expect(stats.operationsByDomain[DomainType.WALLET]).toBe(2);
            expect(stats.operationsByDomain[DomainType.USER]).toBe(1);
            expect(stats.operationsByType[OperationType.READ]).toBe(1);
            expect(stats.operationsByType[OperationType.WRITE]).toBe(1);
            expect(stats.operationsByType[OperationType.DELETE]).toBe(1);
            expect(stats.activeUsers).toBe(2);
        });

        it('should clear context', async () => {
            const requestId = 'req-123';
            const context = {
                domain: DomainType.WALLET,
                operation: OperationType.READ,
                user: { id: 'user-123', isVerified: true, isAdmin: false },
                request: { id: requestId, timestamp: new Date() },
            };

            await domainContext.setContext(requestId, context);
            expect(domainContext.getContext(requestId)).toBeDefined();

            await domainContext.clearContext(requestId);
            expect(domainContext.getContext(requestId)).toBeUndefined();
        });
    });
});
