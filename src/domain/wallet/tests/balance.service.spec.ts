import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from '../services/balance.service';
import { IWalletService } from '../interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../interfaces/wallet-balance-service.interface';
import { IBlockchainService } from '../../solana/interfaces/blockchain-service.interface';
import { TokenType } from '../../common/enums/token-type.enum';

describe('BalanceService', () => {
    let service: BalanceService;
    let walletService: IWalletService;
    let walletBalanceService: IWalletBalanceService;
    let blockchainService: IBlockchainService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BalanceService,
                {
                    provide: IWalletService,
                    useValue: {
                        getWallet: jest.fn(),
                        getUserWallets: jest.fn(),
                    },
                },
                {
                    provide: IWalletBalanceService,
                    useValue: {
                        getBalance: jest.fn(),
                        updateBalance: jest.fn(),
                    },
                },
                {
                    provide: IBlockchainService,
                    useValue: {
                        getBalance: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<BalanceService>(BalanceService);
        walletService = module.get<IWalletService>(IWalletService);
        walletBalanceService = module.get<IWalletBalanceService>(
            IWalletBalanceService,
        );
        blockchainService = module.get<IBlockchainService>(IBlockchainService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('getWalletBalance', () => {
        it('should return wallet balance for specific token', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };
            const mockDbBalance = 1000000; // 1 USDC
            const mockBlockchainBalance = 1500000; // 1.5 USDC

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(walletBalanceService, 'getBalance').mockResolvedValue(
                mockDbBalance,
            );
            jest.spyOn(blockchainService, 'getBalance').mockResolvedValue(
                mockBlockchainBalance,
            );

            const result = await service.getWalletBalance(walletId, tokenType);

            expect(result).toMatchObject({
                walletId,
                tokenType,
                balance: mockBlockchainBalance,
                formattedBalance: '1.500000 USDC',
                isActive: true,
            });
            expect(jest.mocked(walletService.getWallet)).toHaveBeenCalledWith(
                walletId,
            );
            expect(
                jest.mocked(walletBalanceService.getBalance),
            ).toHaveBeenCalledWith(walletId, tokenType);
            expect(
                jest.mocked(blockchainService.getBalance),
            ).toHaveBeenCalledWith(mockWallet.address, tokenType);
        });

        it('should use database balance when blockchain balance is null', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };
            const mockDbBalance = 1000000;

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(walletBalanceService, 'getBalance').mockResolvedValue(
                mockDbBalance,
            );
            jest.spyOn(blockchainService, 'getBalance').mockResolvedValue(null);

            const result = await service.getWalletBalance(walletId, tokenType);

            expect(result.balance).toBe(mockDbBalance);
            expect(result.formattedBalance).toBe('1.000000 USDC');
        });

        it('should throw error for non-existent wallet', async () => {
            const walletId = 'non-existent';
            const tokenType = TokenType.USDC;

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(null);

            await expect(
                service.getWalletBalance(walletId, tokenType),
            ).rejects.toThrow('Wallet not found');
        });
    });

    describe('getWalletBalances', () => {
        it('should return all token balances for a wallet', async () => {
            const walletId = 'wallet-1';
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(service, 'getWalletBalance').mockResolvedValue({
                walletId,
                tokenType: TokenType.USDC,
                balance: 1000000,
                formattedBalance: '1.000000 USDC',
                lastUpdated: new Date(),
                isActive: true,
            } as any);

            const result = await service.getWalletBalances(walletId);

            expect(result).toHaveLength(3); // USDC, EURC, SOL
            expect(jest.mocked(service.getWalletBalance)).toHaveBeenCalledTimes(
                3,
            );
        });

        it('should handle errors gracefully for individual tokens', async () => {
            const walletId = 'wallet-1';
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(service, 'getWalletBalance')
                .mockResolvedValueOnce({
                    walletId,
                    tokenType: TokenType.USDC,
                    balance: 1000000,
                    formattedBalance: '1.000000 USDC',
                    lastUpdated: new Date(),
                    isActive: true,
                } as any)
                .mockRejectedValueOnce(new Error('Token not found'))
                .mockResolvedValueOnce({
                    walletId,
                    tokenType: TokenType.SOL,
                    balance: 1000000000,
                    formattedBalance: '1.000000000 SOL',
                    lastUpdated: new Date(),
                    isActive: true,
                } as any);

            const result = await service.getWalletBalances(walletId);

            expect(result).toHaveLength(2); // Only successful balances
        });
    });

    describe('getWalletBalanceSummary', () => {
        it('should return wallet balance summary', async () => {
            const walletId = 'wallet-1';
            const mockBalances = [
                {
                    walletId,
                    tokenType: TokenType.USDC,
                    balance: 1000000, // 1 USDC
                    formattedBalance: '1.000000 USDC',
                    lastUpdated: new Date(),
                    isActive: true,
                },
                {
                    walletId,
                    tokenType: TokenType.SOL,
                    balance: 1000000000, // 1 SOL
                    formattedBalance: '1.000000000 SOL',
                    lastUpdated: new Date(),
                    isActive: true,
                },
            ];

            jest.spyOn(service, 'getWalletBalances').mockResolvedValue(
                mockBalances as any,
            );

            const result = await service.getWalletBalanceSummary(walletId);

            expect(result).toMatchObject({
                walletId,
                totalBalance: 200, // 1 USDC + 1 SOL * 100 (mock price)
                totalFormattedBalance: '200.000000 USDC',
                tokenBalances: mockBalances,
            });
        });
    });

    describe('getUserWalletBalances', () => {
        it('should return balances for all user wallets', async () => {
            const userId = 'user-1';
            const mockWallets = [
                { walletId: 'wallet-1', userId },
                { walletId: 'wallet-2', userId },
            ];
            const mockSummary = {
                walletId: 'wallet-1',
                totalBalance: 100,
                totalFormattedBalance: '100.000000 USDC',
                tokenBalances: [],
                lastUpdated: new Date(),
            };

            jest.spyOn(walletService, 'getUserWallets').mockResolvedValue(
                mockWallets as any,
            );
            jest.spyOn(service, 'getWalletBalanceSummary').mockResolvedValue(
                mockSummary as any,
            );

            const result = await service.getUserWalletBalances(userId);

            expect(result).toHaveLength(2);
            expect(
                jest.mocked(service.getWalletBalanceSummary),
            ).toHaveBeenCalledTimes(2);
        });
    });

    describe('refreshWalletBalance', () => {
        it('should refresh wallet balance from blockchain', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };
            const mockBlockchainBalance = 2000000; // 2 USDC

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(blockchainService, 'getBalance').mockResolvedValue(
                mockBlockchainBalance,
            );
            jest.spyOn(walletBalanceService, 'updateBalance').mockResolvedValue(
                undefined,
            );
            jest.spyOn(service, 'getWalletBalance').mockResolvedValue({
                walletId,
                tokenType,
                balance: mockBlockchainBalance,
                formattedBalance: '2.000000 USDC',
                lastUpdated: new Date(),
                isActive: true,
            } as any);

            const result = await service.refreshWalletBalance(
                walletId,
                tokenType,
            );

            expect(
                jest.mocked(walletBalanceService.updateBalance),
            ).toHaveBeenCalledWith(walletId, tokenType, mockBlockchainBalance);
            expect(result.balance).toBe(mockBlockchainBalance);
        });

        it('should not update database when blockchain balance is null', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const mockWallet = {
                id: walletId,
                address: 'wallet-address-1',
                isActive: true,
            };

            jest.spyOn(walletService, 'getWallet').mockResolvedValue(
                mockWallet as any,
            );
            jest.spyOn(blockchainService, 'getBalance').mockResolvedValue(null);
            jest.spyOn(walletBalanceService, 'updateBalance').mockResolvedValue(
                undefined,
            );
            jest.spyOn(service, 'getWalletBalance').mockResolvedValue({
                walletId,
                tokenType,
                balance: 1000000,
                formattedBalance: '1.000000 USDC',
                lastUpdated: new Date(),
                isActive: true,
            } as any);

            await service.refreshWalletBalance(walletId, tokenType);

            expect(
                jest.mocked(walletBalanceService.updateBalance),
            ).not.toHaveBeenCalled();
        });
    });

    describe('getTotalUserBalance', () => {
        it('should return total balance across all user wallets', async () => {
            const userId = 'user-1';
            const mockSummaries = [
                {
                    walletId: 'wallet-1',
                    totalBalance: 100,
                    totalFormattedBalance: '100.000000 USDC',
                    tokenBalances: [],
                    lastUpdated: new Date(),
                },
                {
                    walletId: 'wallet-2',
                    totalBalance: 200,
                    totalFormattedBalance: '200.000000 USDC',
                    tokenBalances: [],
                    lastUpdated: new Date(),
                },
            ];

            jest.spyOn(service, 'getUserWalletBalances').mockResolvedValue(
                mockSummaries as any,
            );

            const result = await service.getTotalUserBalance(userId);

            expect(result).toMatchObject({
                totalBalance: 300,
                totalFormattedBalance: '300.000000 USDC',
                walletCount: 2,
            });
        });
    });

    describe('hasSufficientBalance', () => {
        it('should return true when wallet has sufficient balance', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const requiredAmount = 500000; // 0.5 USDC

            jest.spyOn(service, 'getWalletBalance').mockResolvedValue({
                walletId,
                tokenType,
                balance: 1000000, // 1 USDC
                formattedBalance: '1.000000 USDC',
                lastUpdated: new Date(),
                isActive: true,
            } as any);

            const result = await service.hasSufficientBalance(
                walletId,
                tokenType,
                requiredAmount,
            );

            expect(result).toBe(true);
        });

        it('should return false when wallet has insufficient balance', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;
            const requiredAmount = 2000000; // 2 USDC

            jest.spyOn(service, 'getWalletBalance').mockResolvedValue({
                walletId,
                tokenType,
                balance: 1000000, // 1 USDC
                formattedBalance: '1.000000 USDC',
                lastUpdated: new Date(),
                isActive: true,
            } as any);

            const result = await service.hasSufficientBalance(
                walletId,
                tokenType,
                requiredAmount,
            );

            expect(result).toBe(false);
        });
    });

    describe('getBalanceHistory', () => {
        it('should return balance history', async () => {
            const walletId = 'wallet-1';
            const tokenType = TokenType.USDC;

            const result = await service.getBalanceHistory(walletId, tokenType);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                timestamp: expect.any(Date),
                balance: 1000000,
                change: 0,
            });
        });
    });
});
