import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffRampService } from '../services/offramp.service';
import {
    OffRampTransaction,
    OffRampStatus,
    OffRampProvider,
} from '../entities/offramp-transaction.entity';
import { OffRampProviderFactoryService } from '../services/offramp-provider-factory.service';
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance.service.interface';
import { EventBusService } from '../../common/services/event-bus.service';

describe('OffRampService', () => {
    let service: OffRampService;
    let offRampRepository: Repository<OffRampTransaction>;
    let providerFactory: OffRampProviderFactoryService;
    let walletService: IWalletService;
    let walletBalanceService: IWalletBalanceService;
    let eventBusService: EventBusService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OffRampService,
                {
                    provide: getRepositoryToken(OffRampTransaction),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: OffRampProviderFactoryService,
                    useValue: {
                        getProvider: jest.fn(),
                    },
                },
                {
                    provide: IWalletService,
                    useValue: {
                        getUserWallets: jest.fn(),
                        getWallet: jest.fn(),
                    },
                },
                {
                    provide: IWalletBalanceService,
                    useValue: {
                        getBalance: jest.fn(),
                        subtractBalance: jest.fn(),
                    },
                },
                {
                    provide: EventBusService,
                    useValue: {
                        publish: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OffRampService>(OffRampService);
        offRampRepository = module.get<Repository<OffRampTransaction>>(
            getRepositoryToken(OffRampTransaction),
        );
        providerFactory = module.get<OffRampProviderFactoryService>(
            OffRampProviderFactoryService,
        );
        walletService = module.get<IWalletService>(IWalletService);
        walletBalanceService = module.get<IWalletBalanceService>(
            IWalletBalanceService,
        );
        eventBusService = module.get<EventBusService>(EventBusService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('createOffRampTransaction', () => {
        it('should create a new off-ramp transaction', async () => {
            const createOffRampDto = {
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
                fiatCurrency: 'USD',
                provider: OffRampProvider.TRANSAK,
            };

            const mockWallets = [{ walletId: 'wallet-1', userId: 'user-1' }];

            const mockQuote = {
                provider: 'transak',
                tokenAmount: 100.0,
                fiatAmount: 100.0,
                fiatCurrency: 'USD',
                exchangeRate: 1.0,
                fee: 1.0,
                estimatedTime: '1-3 business days',
                expiresAt: new Date(),
            };

            const mockTransaction = {
                id: 'offramp-1',
                ...createOffRampDto,
                status: OffRampStatus.PENDING,
                fiatAmount: 100.0,
                exchangeRate: 1.0,
                fee: 1.0,
                createdAt: new Date(),
            };

            jest.spyOn(walletService, 'getUserWallets').mockResolvedValue(
                mockWallets as any,
            );
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue({
                getQuote: jest.fn().mockResolvedValue(mockQuote),
            } as any);
            jest.spyOn(offRampRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            jest.spyOn(offRampRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );

            const result =
                await service.createOffRampTransaction(createOffRampDto);

            expect(result).toEqual(mockTransaction);
            expect(offRampRepository.create).toHaveBeenCalledWith({
                ...createOffRampDto,
                status: OffRampStatus.PENDING,
                fiatAmount: 100.0,
                exchangeRate: 1.0,
                fee: 1.0,
            });
            expect(offRampRepository.save).toHaveBeenCalledWith(
                mockTransaction,
            );
        });

        it('should throw error for invalid wallet', async () => {
            const createOffRampDto = {
                userId: 'user-1',
                walletId: 'invalid-wallet',
                tokenAmount: 100.0,
                tokenType: 'USDC',
                fiatCurrency: 'USD',
                provider: OffRampProvider.TRANSAK,
            };

            jest.spyOn(walletService, 'getUserWallets').mockResolvedValue([]);

            await expect(
                service.createOffRampTransaction(createOffRampDto),
            ).rejects.toThrow('Invalid wallet for user');
        });
    });

    describe('initiateOffRamp', () => {
        it('should initiate an off-ramp transaction', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
                fiatCurrency: 'USD',
                status: OffRampStatus.PENDING,
            };

            const mockInitiationResponse = {
                transactionId: 'offramp-1',
                providerTransactionId: 'provider-tx-123',
                status: OffRampStatus.PROCESSING,
                quote: {},
                redirectUrl: 'https://provider.com/offramp',
                expiresAt: new Date(),
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(walletBalanceService, 'getBalance').mockResolvedValue(
                200.0,
            );
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue({
                initiateOffRamp: jest
                    .fn()
                    .mockResolvedValue(mockInitiationResponse),
            } as any);
            jest.spyOn(offRampRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status: OffRampStatus.PROCESSING,
                providerTransactionId: 'provider-tx-123',
            } as any);

            const result = await service.initiateOffRamp(transactionId);

            expect(result.status).toBe(OffRampStatus.PROCESSING);
            expect(result.providerTransactionId).toBe('provider-tx-123');
        });

        it('should throw error for insufficient balance', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
                fiatCurrency: 'USD',
                status: OffRampStatus.PENDING,
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(walletBalanceService, 'getBalance').mockResolvedValue(
                50.0,
            ); // Insufficient balance

            await expect(
                service.initiateOffRamp(transactionId),
            ).rejects.toThrow('Insufficient balance');
        });
    });

    describe('updateOffRampStatus', () => {
        it('should update transaction status', async () => {
            const transactionId = 'offramp-1';
            const status = OffRampStatus.COMPLETED;
            const providerTransactionId = 'provider-tx-123';

            const mockTransaction = {
                id: transactionId,
                status: OffRampStatus.PROCESSING,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(offRampRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status,
                providerTransactionId,
                completedAt: expect.any(Date),
            } as any);

            const result = await service.updateOffRampStatus(
                transactionId,
                status,
                providerTransactionId,
            );

            expect(result.status).toBe(status);
            expect(result.providerTransactionId).toBe(providerTransactionId);
        });

        it('should set completion timestamp for completed status', async () => {
            const transactionId = 'offramp-1';
            const status = OffRampStatus.COMPLETED;

            const mockTransaction = {
                id: transactionId,
                status: OffRampStatus.PROCESSING,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(offRampRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status,
                completedAt: new Date(),
            } as any);

            const result = await service.updateOffRampStatus(
                transactionId,
                status,
            );

            expect(result.status).toBe(status);
            expect(result.completedAt).toBeDefined();
        });
    });

    describe('getOffRampTransaction', () => {
        it('should return a specific transaction', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                userId: 'user-1',
                status: OffRampStatus.COMPLETED,
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );

            const result = await service.getOffRampTransaction(transactionId);

            expect(result).toEqual(mockTransaction);
            expect(offRampRepository.findOne).toHaveBeenCalledWith({
                where: { id: transactionId },
            });
        });

        it('should return null for non-existent transaction', async () => {
            const transactionId = 'non-existent';

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(null);

            const result = await service.getOffRampTransaction(transactionId);

            expect(result).toBeNull();
        });
    });

    describe('getOffRampTransactionsForUser', () => {
        it('should return transactions for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                { id: 'offramp-1', userId, status: OffRampStatus.COMPLETED },
                { id: 'offramp-2', userId, status: OffRampStatus.PENDING },
            ];

            jest.spyOn(offRampRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getOffRampTransactionsForUser(userId);

            expect(result).toEqual(mockTransactions);
            expect(offRampRepository.find).toHaveBeenCalledWith({
                where: { userId },
                order: { createdAt: 'DESC' },
            });
        });

        it('should filter by status when provided', async () => {
            const userId = 'user-1';
            const status = OffRampStatus.COMPLETED;

            jest.spyOn(offRampRepository, 'find').mockResolvedValue([]);

            await service.getOffRampTransactionsForUser(userId, status);

            expect(offRampRepository.find).toHaveBeenCalledWith({
                where: { userId, status },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('cancelOffRamp', () => {
        it('should cancel a pending transaction', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                status: OffRampStatus.PENDING,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(offRampRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status: OffRampStatus.CANCELLED,
            } as any);

            const result = await service.cancelOffRamp(transactionId);

            expect(result.status).toBe(OffRampStatus.CANCELLED);
        });

        it('should cancel a processing transaction with provider', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                status: OffRampStatus.PROCESSING,
                providerTransactionId: 'provider-tx-123',
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue({
                cancelOffRamp: jest.fn().mockResolvedValue(true),
            } as any);
            jest.spyOn(offRampRepository, 'save').mockResolvedValue({
                ...mockTransaction,
                status: OffRampStatus.CANCELLED,
            } as any);

            const result = await service.cancelOffRamp(transactionId);

            expect(result.status).toBe(OffRampStatus.CANCELLED);
        });

        it('should throw error for non-cancellable transaction', async () => {
            const transactionId = 'offramp-1';
            const mockTransaction = {
                id: transactionId,
                status: OffRampStatus.COMPLETED,
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: 100.0,
                tokenType: 'USDC',
            };

            jest.spyOn(offRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );

            await expect(service.cancelOffRamp(transactionId)).rejects.toThrow(
                'Transaction cannot be cancelled',
            );
        });
    });

    describe('getOffRampQuote', () => {
        it('should return quote from provider', async () => {
            const mockQuote = {
                provider: 'transak',
                tokenAmount: 100.0,
                fiatAmount: 100.0,
                fiatCurrency: 'USD',
                exchangeRate: 1.0,
                fee: 1.0,
                estimatedTime: '1-3 business days',
                expiresAt: new Date(),
            };

            jest.spyOn(providerFactory, 'getProvider').mockReturnValue({
                getQuote: jest.fn().mockResolvedValue(mockQuote),
            } as any);

            const result = await service.getOffRampQuote(
                100.0,
                'USDC',
                'USD',
                OffRampProvider.TRANSAK,
            );

            expect(result).toEqual(mockQuote);
        });
    });

    describe('getOffRampStats', () => {
        it('should return transaction statistics for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                {
                    id: 'offramp-1',
                    userId,
                    tokenAmount: 100.0,
                    fee: 1.0,
                    status: OffRampStatus.COMPLETED,
                },
                {
                    id: 'offramp-2',
                    userId,
                    tokenAmount: 50.0,
                    fee: 0.5,
                    status: OffRampStatus.COMPLETED,
                },
                {
                    id: 'offramp-3',
                    userId,
                    tokenAmount: 200.0,
                    fee: 2.0,
                    status: OffRampStatus.FAILED,
                },
            ];

            jest.spyOn(offRampRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getOffRampStats(userId);

            expect(result.totalOffRamp).toBe(350.0);
            expect(result.totalFees).toBe(3.5);
            expect(result.completedOffRamp).toBe(2);
            expect(result.failedOffRamp).toBe(1);
        });
    });

    describe('processPendingOffRampTransactions', () => {
        it('should process pending transactions', async () => {
            const mockTransactions = [
                {
                    id: 'offramp-1',
                    status: OffRampStatus.PROCESSING,
                    provider: OffRampProvider.TRANSAK,
                    providerTransactionId: 'provider-tx-123',
                },
                {
                    id: 'offramp-2',
                    status: OffRampStatus.PROCESSING,
                    provider: OffRampProvider.MOONPAY,
                    providerTransactionId: 'provider-tx-456',
                },
            ];

            jest.spyOn(offRampRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );
            jest.spyOn(service, 'updateOffRampStatus').mockResolvedValue(
                {} as any,
            );

            await service.processPendingOffRampTransactions();

            expect(service.updateOffRampStatus).toHaveBeenCalledTimes(2);
        });

        it('should handle errors gracefully', async () => {
            jest.spyOn(offRampRepository, 'find').mockRejectedValue(
                new Error('Database error'),
            );

            await expect(
                service.processPendingOffRampTransactions(),
            ).rejects.toThrow('Database error');
        });
    });
});
