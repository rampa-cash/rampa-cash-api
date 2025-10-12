import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { SolanaService } from '../../../src/domain/solana/services/solana.service';
import { SolanaConnectionService } from '../../../src/domain/solana/services/solana-connection.service';
import { SplTokenService } from '../../../src/domain/solana/services/spl-token.service';
import { SolanaRetryService } from '../../../src/domain/solana/services/solana-retry.service';
import { SolanaHealthService } from '../../../src/domain/solana/services/solana-health.service';
import { SolanaConfig } from '../../../src/config/solana.config';

describe('SolanaService', () => {
    let service: SolanaService;
    let connectionService: jest.Mocked<SolanaConnectionService>;
    let splTokenService: jest.Mocked<SplTokenService>;
    let retryService: jest.Mocked<SolanaRetryService>;
    let healthService: jest.Mocked<SolanaHealthService>;
    let configService: jest.Mocked<ConfigService>;

    const mockConfig: SolanaConfig = {
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
        commitment: 'confirmed',
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        tokenMints: {
            USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            EURC: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp',
            SOL: 'So11111111111111111111111111111111111111112',
        },
    };

    beforeEach(async () => {
        const mockConnectionService = {
            getAccountInfo: jest.fn(),
            getBalance: jest.fn(),
            getRecentBlockhash: jest.fn(),
            sendTransaction: jest.fn(),
            getTransaction: jest.fn(),
            confirmTransaction: jest.fn(),
            isHealthy: jest.fn(),
            getNetworkInfo: jest.fn(),
        };

        const mockSplTokenService = {
            getAllTokenBalances: jest.fn(),
            getTokenBalance: jest.fn(),
            getTokenMintAddress: jest.fn(),
            getMintInfo: jest.fn(),
            convertToTokenUnits: jest.fn(),
            createTransferInstruction: jest.fn(),
        };

        const mockRetryService = {
            executeWithRetry: jest.fn(),
            executeTransactionWithRetry: jest.fn(),
            getRetryStats: jest.fn(),
        };

        const mockHealthService = {
            getHealthStatus: jest.fn(),
            getNetworkMetrics: jest.fn(),
            isHealthy: jest.fn(),
            testRpcMethod: jest.fn(),
            testWalletConnectivity: jest.fn(),
            getHealthSummary: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue(mockConfig),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SolanaService,
                {
                    provide: SolanaConnectionService,
                    useValue: mockConnectionService,
                },
                {
                    provide: SplTokenService,
                    useValue: mockSplTokenService,
                },
                {
                    provide: SolanaRetryService,
                    useValue: mockRetryService,
                },
                {
                    provide: SolanaHealthService,
                    useValue: mockHealthService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<SolanaService>(SolanaService);
        connectionService = module.get(SolanaConnectionService);
        splTokenService = module.get(SplTokenService);
        retryService = module.get(SolanaRetryService);
        healthService = module.get(SolanaHealthService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAccountInfo', () => {
        it('should return account info for valid address', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mockAccountInfo = {
                address,
                balance: 1000000000,
                owner: '11111111111111111111111111111111',
                executable: false,
                rentEpoch: 0,
            };

            connectionService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            const result = await service.getAccountInfo(address);

            expect(result).toEqual(mockAccountInfo);
            expect(connectionService.getAccountInfo).toHaveBeenCalledWith(
                address,
            );
        });

        it('should throw BadRequestException for invalid address', async () => {
            const invalidAddress = 'invalid-address';

            await expect(
                service.getAccountInfo(invalidAddress),
            ).rejects.toThrow(BadRequestException);
            expect(connectionService.getAccountInfo).not.toHaveBeenCalled();
        });

        it('should return null when account not found', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            connectionService.getAccountInfo.mockResolvedValue(null);

            const result = await service.getAccountInfo(address);

            expect(result).toBeNull();
        });

        it('should handle connection errors', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const error = new Error('Connection failed');
            connectionService.getAccountInfo.mockRejectedValue(error);

            await expect(service.getAccountInfo(address)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('getBalance', () => {
        it('should return balance for valid address', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const balance = 1000000000;

            connectionService.getBalance.mockResolvedValue(balance);

            const result = await service.getBalance(address);

            expect(result).toBe(balance);
            expect(connectionService.getBalance).toHaveBeenCalledWith(address);
        });

        it('should throw BadRequestException for invalid address', async () => {
            const invalidAddress = 'invalid-address';

            await expect(service.getBalance(invalidAddress)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('getTokenBalances', () => {
        it('should return token balances for valid address', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mockTokenBalances = [
                {
                    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    amount: 1000000,
                    decimals: 6,
                    uiAmount: 1.0,
                    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                    owner: address,
                },
            ];

            splTokenService.getAllTokenBalances.mockResolvedValue(
                mockTokenBalances,
            );

            const result = await service.getTokenBalances(address);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                mint: mockTokenBalances[0].mint,
                amount: mockTokenBalances[0].amount,
                decimals: mockTokenBalances[0].decimals,
                uiAmount: mockTokenBalances[0].uiAmount,
                tokenProgram: mockTokenBalances[0].tokenProgram,
            });
            expect(splTokenService.getAllTokenBalances).toHaveBeenCalledWith(
                address,
            );
        });

        it('should throw BadRequestException for invalid address', async () => {
            const invalidAddress = 'invalid-address';

            await expect(
                service.getTokenBalances(invalidAddress),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getTokenBalance', () => {
        it('should return SOL balance for SOL token type', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const balance = 1000000000;

            connectionService.getBalance.mockResolvedValue(balance);

            const result = await service.getTokenBalance(address, 'SOL');

            expect(result).toEqual({
                mint: mockConfig.tokenMints.SOL,
                amount: balance,
                decimals: 9,
                uiAmount: balance / 1000000000,
                tokenProgram: '11111111111111111111111111111111',
            });
        });

        it('should return token balance for SPL token type', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mockTokenBalance = {
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: 1000000,
                decimals: 6,
                uiAmount: 1.0,
                tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                owner: address,
            };

            splTokenService.getTokenMintAddress.mockReturnValue(
                mockConfig.tokenMints.USDC,
            );
            splTokenService.getTokenBalance.mockResolvedValue(mockTokenBalance);

            const result = await service.getTokenBalance(address, 'USDC');

            expect(result).toEqual({
                mint: mockTokenBalance.mint,
                amount: mockTokenBalance.amount,
                decimals: mockTokenBalance.decimals,
                uiAmount: mockTokenBalance.uiAmount,
                tokenProgram: mockTokenBalance.tokenProgram,
            });
        });

        it('should return null when token balance not found', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            splTokenService.getTokenMintAddress.mockReturnValue(
                mockConfig.tokenMints.USDC,
            );
            splTokenService.getTokenBalance.mockResolvedValue(null);

            const result = await service.getTokenBalance(address, 'USDC');

            expect(result).toBeNull();
        });
    });

    describe('validateAddress', () => {
        it('should return true for valid address', () => {
            const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            const result = service.validateAddress(validAddress);

            expect(result).toBe(true);
        });

        it('should return false for invalid address', () => {
            const invalidAddress = 'invalid-address';

            const result = service.validateAddress(invalidAddress);

            expect(result).toBe(false);
        });
    });

    describe('getNetworkInfo', () => {
        it('should return network information', () => {
            const mockNetworkInfo = {
                network: 'devnet',
                rpcUrl: 'https://api.devnet.solana.com',
                commitment: 'confirmed',
            };

            connectionService.getNetworkInfo.mockReturnValue(mockNetworkInfo);

            const result = service.getNetworkInfo();

            expect(result).toEqual({
                network: 'devnet',
                rpcUrl: 'https://api.devnet.solana.com',
                commitment: 'confirmed',
                cluster: 'devnet',
            });
        });

        it('should map mainnet-beta to mainnet cluster', () => {
            const mockNetworkInfo = {
                network: 'mainnet-beta',
                rpcUrl: 'https://api.mainnet-beta.solana.com',
                commitment: 'confirmed',
            };

            connectionService.getNetworkInfo.mockReturnValue(mockNetworkInfo);

            const result = service.getNetworkInfo();

            expect(result.cluster).toBe('mainnet');
        });
    });

    describe('isHealthy', () => {
        it('should return health status from health service', async () => {
            healthService.isHealthy.mockResolvedValue(true);

            const result = await service.isHealthy();

            expect(result).toBe(true);
            expect(healthService.isHealthy).toHaveBeenCalled();
        });

        it('should return false when health service throws error', async () => {
            healthService.isHealthy.mockRejectedValue(
                new Error('Health check failed'),
            );

            const result = await service.isHealthy();

            expect(result).toBe(false);
        });
    });
});
