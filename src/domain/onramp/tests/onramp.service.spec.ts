import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnRampService } from '../services/onramp.service';
import { OnRampTransaction } from '../entities/onramp-transaction.entity';
import { OnRampProviderFactoryService } from '../services/onramp-provider-factory.service';
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance-service.interface';
import { EventBusService } from '../../common/services/event-bus.service';

describe('OnRampService', () => {
    let service: OnRampService;
    let onRampRepository: Repository<OnRampTransaction>;
    let providerFactory: OnRampProviderFactoryService;
    let walletService: IWalletService;
    let walletBalanceService: IWalletBalanceService;
    let eventBusService: EventBusService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OnRampService,
                {
                    provide: getRepositoryToken(OnRampTransaction),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: OnRampProviderFactoryService,
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
                        addBalance: jest.fn(),
                        getBalance: jest.fn(),
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

        service = module.get<OnRampService>(OnRampService);
        onRampRepository = module.get<Repository<OnRampTransaction>>(
            getRepositoryToken(OnRampTransaction),
        );
        providerFactory = module.get<OnRampProviderFactoryService>(
            OnRampProviderFactoryService,
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

    describe('createOnRampTransaction', () => {
        it('should create a new on-ramp transaction', async () => {
            const createOnRampDto = {
                userId: 'user-1',
                walletId: 'wallet-1',
                amount: '100.00',
                fiatCurrency: 'USD',
                tokenType: 'USDC',
                provider: 'transak',
            };

            const mockTransaction = {
                id: 'onramp-1',
                ...createOnRampDto,
                status: 'pending',
                createdAt: new Date(),
            };

            jest.spyOn(onRampRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            jest.spyOn(onRampRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );

            const result =
                await service.createOnRampTransaction(createOnRampDto);

            expect(result).toEqual(mockTransaction);
            expect(onRampRepository.create).toHaveBeenCalledWith(
                createOnRampDto,
            );
            expect(onRampRepository.save).toHaveBeenCalledWith(mockTransaction);
        });

        it('should validate user and wallet before creating transaction', async () => {
            const createOnRampDto = {
                userId: 'user-1',
                walletId: 'wallet-1',
                amount: '100.00',
                fiatCurrency: 'USD',
                tokenType: 'USDC',
                provider: 'transak',
            };

            const mockWallets = [{ walletId: 'wallet-1', userId: 'user-1' }];

            jest.spyOn(walletService, 'getUserWallets').mockResolvedValue(
                mockWallets as any,
            );
            jest.spyOn(onRampRepository, 'create').mockReturnValue({} as any);
            jest.spyOn(onRampRepository, 'save').mockResolvedValue({} as any);

            await service.createOnRampTransaction(createOnRampDto);

            expect(walletService.getUserWallets).toHaveBeenCalledWith('user-1');
        });

        it('should throw error for invalid wallet', async () => {
            const createOnRampDto = {
                userId: 'user-1',
                walletId: 'invalid-wallet',
                amount: '100.00',
                fiatCurrency: 'USD',
                tokenType: 'USDC',
                provider: 'transak',
            };

            jest.spyOn(walletService, 'getUserWallets').mockResolvedValue([]);

            await expect(
                service.createOnRampTransaction(createOnRampDto),
            ).rejects.toThrow();
        });
    });

    describe('updateOnRampStatus', () => {
        it('should update transaction status', async () => {
            const transactionId = 'onramp-1';
            const status = 'completed';
            const providerTransactionId = 'provider-tx-123';

            const mockTransaction = {
                id: transactionId,
                status: 'pending',
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: '100.00',
                tokenType: 'USDC',
            };

            jest.spyOn(onRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(onRampRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );

            const result = await service.updateOnRampStatus(
                transactionId,
                status,
                providerTransactionId,
            );

            expect(result).toEqual(mockTransaction);
            expect(onRampRepository.save).toHaveBeenCalledWith({
                ...mockTransaction,
                status,
                providerTransactionId,
            });
        });

        it('should credit wallet when transaction is completed', async () => {
            const transactionId = 'onramp-1';
            const status = 'completed';
            const providerTransactionId = 'provider-tx-123';

            const mockTransaction = {
                id: transactionId,
                status: 'pending',
                userId: 'user-1',
                walletId: 'wallet-1',
                tokenAmount: '100.00',
                tokenType: 'USDC',
                provider: 'transak',
            };

            jest.spyOn(onRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(onRampRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(walletBalanceService, 'addBalance').mockResolvedValue(
                {} as any,
            );

            await service.updateOnRampStatus(
                transactionId,
                status,
                providerTransactionId,
            );

            expect(walletBalanceService.addBalance).toHaveBeenCalledWith(
                'wallet-1',
                'USDC',
                100.0,
                'onramp',
                {
                    transactionId,
                    description: 'On-ramp transaction via transak',
                },
            );
        });
    });

    describe('getOnRampTransaction', () => {
        it('should return a specific transaction', async () => {
            const transactionId = 'onramp-1';
            const mockTransaction = {
                id: transactionId,
                userId: 'user-1',
                status: 'completed',
            };

            jest.spyOn(onRampRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );

            const result = await service.getOnRampTransaction(transactionId);

            expect(result).toEqual(mockTransaction);
            expect(onRampRepository.findOne).toHaveBeenCalledWith({
                where: { id: transactionId },
            });
        });

        it('should return null for non-existent transaction', async () => {
            const transactionId = 'non-existent';

            jest.spyOn(onRampRepository, 'findOne').mockResolvedValue(null);

            const result = await service.getOnRampTransaction(transactionId);

            expect(result).toBeNull();
        });
    });

    describe('getOnRampTransactionsForUser', () => {
        it('should return transactions for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                { id: 'onramp-1', userId, status: 'completed' },
                { id: 'onramp-2', userId, status: 'pending' },
            ];

            jest.spyOn(onRampRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getOnRampTransactionsForUser(userId);

            expect(result).toEqual(mockTransactions);
            expect(onRampRepository.find).toHaveBeenCalledWith({
                where: { userId },
                order: { createdAt: 'DESC' },
            });
        });

        it('should filter by status when provided', async () => {
            const userId = 'user-1';
            const status = 'completed';

            jest.spyOn(onRampRepository, 'find').mockResolvedValue([]);

            await service.getOnRampTransactionsForUser(userId, status);

            expect(onRampRepository.find).toHaveBeenCalledWith({
                where: { userId, status },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('processPendingOnRampTransactions', () => {
        it('should process pending transactions', async () => {
            const mockTransactions = [
                {
                    id: 'onramp-1',
                    status: 'pending',
                    provider: 'transak',
                    providerTransactionId: 'provider-tx-123',
                },
                {
                    id: 'onramp-2',
                    status: 'pending',
                    provider: 'moonpay',
                    providerTransactionId: 'provider-tx-456',
                },
            ];

            jest.spyOn(onRampRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );
            jest.spyOn(service, 'updateOnRampStatus').mockResolvedValue(
                {} as any,
            );

            await service.processPendingOnRampTransactions();

            expect(service.updateOnRampStatus).toHaveBeenCalledTimes(2);
        });

        it('should handle errors gracefully', async () => {
            jest.spyOn(onRampRepository, 'find').mockRejectedValue(
                new Error('Database error'),
            );

            await expect(
                service.processPendingOnRampTransactions(),
            ).rejects.toThrow('Database error');
        });
    });

    describe('getExchangeRate', () => {
        it('should return exchange rate for a currency pair', async () => {
            const fromCurrency = 'USD';
            const toCurrency = 'USDC';
            const mockRate = 1.0;

            jest.spyOn(service, 'getExchangeRate').mockResolvedValue(mockRate);

            const result = await service.getExchangeRate(
                fromCurrency,
                toCurrency,
            );

            expect(result).toBe(mockRate);
        });

        it('should handle API errors', async () => {
            const fromCurrency = 'USD';
            const toCurrency = 'INVALID';

            jest.spyOn(service, 'getExchangeRate').mockRejectedValue(
                new Error('Invalid currency'),
            );

            await expect(
                service.getExchangeRate(fromCurrency, toCurrency),
            ).rejects.toThrow('Invalid currency');
        });
    });
});
