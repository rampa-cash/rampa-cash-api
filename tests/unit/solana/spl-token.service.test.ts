import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { SplTokenService } from '../../../src/domain/solana/services/spl-token.service';
import { SolanaConnectionService } from '../../../src/domain/solana/services/solana-connection.service';
import { SolanaConfig } from '../../../src/config/solana.config';

describe('SplTokenService', () => {
    let service: SplTokenService;
    let connectionService: jest.Mocked<SolanaConnectionService>;
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

    const mockConnection = {
        getParsedAccountInfo: jest.fn(),
        getParsedTokenAccountsByOwner: jest.fn(),
        getSignaturesForAddress: jest.fn(),
        getParsedTransactions: jest.fn(),
    };

    beforeEach(async () => {
        const mockConnectionService = {
            getConnection: jest.fn().mockReturnValue(mockConnection),
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue(mockConfig),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SplTokenService,
                {
                    provide: SolanaConnectionService,
                    useValue: mockConnectionService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<SplTokenService>(SplTokenService);
        connectionService = module.get(SolanaConnectionService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getTokenBalance', () => {
        it('should return token balance for existing token account', async () => {
            const walletAddress =
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            const tokenAccountAddress = 'TokenAccountAddress123';

            const mockAccountInfo = {
                value: {
                    data: {
                        parsed: {
                            info: {
                                tokenAmount: {
                                    amount: '1000000',
                                    decimals: 6,
                                    uiAmount: 1.0,
                                },
                            },
                        },
                    },
                    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            };

            // Mock Token.getAssociatedTokenAddress
            jest.spyOn(
                require('@solana/spl-token'),
                'Token',
                'get',
            ).mockReturnValue({
                getAssociatedTokenAddress: jest
                    .fn()
                    .mockResolvedValue(tokenAccountAddress),
            });

            mockConnection.getParsedAccountInfo.mockResolvedValue(
                mockAccountInfo,
            );

            const result = await service.getTokenBalance(
                walletAddress,
                mintAddress,
            );

            expect(result).toEqual({
                mint: mintAddress,
                amount: 1000000,
                decimals: 6,
                uiAmount: 1.0,
                tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                owner: walletAddress,
            });
        });

        it('should return null when token account does not exist', async () => {
            const walletAddress =
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            const tokenAccountAddress = 'TokenAccountAddress123';

            // Mock Token.getAssociatedTokenAddress
            jest.spyOn(
                require('@solana/spl-token'),
                'Token',
                'get',
            ).mockReturnValue({
                getAssociatedTokenAddress: jest
                    .fn()
                    .mockResolvedValue(tokenAccountAddress),
            });

            mockConnection.getParsedAccountInfo.mockResolvedValue({
                value: null,
            });

            const result = await service.getTokenBalance(
                walletAddress,
                mintAddress,
            );

            expect(result).toBeNull();
        });

        it('should handle errors and throw BadRequestException', async () => {
            const walletAddress =
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            // Mock Token.getAssociatedTokenAddress
            jest.spyOn(
                require('@solana/spl-token'),
                'Token',
                'get',
            ).mockReturnValue({
                getAssociatedTokenAddress: jest
                    .fn()
                    .mockRejectedValue(new Error('Network error')),
            });

            await expect(
                service.getTokenBalance(walletAddress, mintAddress),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getAllTokenBalances', () => {
        it('should return all token balances for wallet', async () => {
            const walletAddress =
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            const mockTokenAccounts = {
                value: [
                    {
                        pubkey: 'TokenAccount1',
                        account: {
                            data: {
                                parsed: {
                                    info: {
                                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                                        tokenAmount: {
                                            amount: '1000000',
                                            decimals: 6,
                                            uiAmount: 1.0,
                                        },
                                    },
                                },
                            },
                            owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                        },
                    },
                ],
            };

            mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue(
                mockTokenAccounts,
            );

            const result = await service.getAllTokenBalances(walletAddress);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: 1000000,
                decimals: 6,
                uiAmount: 1.0,
                tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                owner: walletAddress,
            });
        });

        it('should handle errors and throw BadRequestException', async () => {
            const walletAddress =
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            mockConnection.getParsedTokenAccountsByOwner.mockRejectedValue(
                new Error('Network error'),
            );

            await expect(
                service.getAllTokenBalances(walletAddress),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getTokenMintAddress', () => {
        it('should return USDC mint address', () => {
            const result = service.getTokenMintAddress('USDC');
            expect(result).toBe(mockConfig.tokenMints.USDC);
        });

        it('should return EURC mint address', () => {
            const result = service.getTokenMintAddress('EURC');
            expect(result).toBe(mockConfig.tokenMints.EURC);
        });

        it('should return SOL mint address', () => {
            const result = service.getTokenMintAddress('SOL');
            expect(result).toBe(mockConfig.tokenMints.SOL);
        });

        it('should throw BadRequestException for unsupported token type', () => {
            expect(() => service.getTokenMintAddress('INVALID' as any)).toThrow(
                BadRequestException,
            );
        });
    });

    describe('convertToTokenUnits', () => {
        it('should convert UI units to token units', () => {
            const result = service.convertToTokenUnits(1.5, 6);
            expect(result).toBe(1500000);
        });

        it('should handle zero amount', () => {
            const result = service.convertToTokenUnits(0, 6);
            expect(result).toBe(0);
        });

        it('should handle different decimal places', () => {
            const result = service.convertToTokenUnits(1.0, 9);
            expect(result).toBe(1000000000);
        });
    });

    describe('convertToUIUnits', () => {
        it('should convert token units to UI units', () => {
            const result = service.convertToUIUnits(1500000, 6);
            expect(result).toBe(1.5);
        });

        it('should handle zero amount', () => {
            const result = service.convertToUIUnits(0, 6);
            expect(result).toBe(0);
        });

        it('should handle different decimal places', () => {
            const result = service.convertToUIUnits(1000000000, 9);
            expect(result).toBe(1.0);
        });
    });

    describe('getMintInfo', () => {
        it('should return mint information', async () => {
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            const mockMintInfo = {
                value: {
                    data: {
                        parsed: {
                            info: {
                                decimals: 6,
                                supply: '1000000000000',
                            },
                        },
                    },
                },
            };

            mockConnection.getParsedAccountInfo.mockResolvedValue(mockMintInfo);

            const result = await service.getMintInfo(mintAddress);

            expect(result).toEqual({
                decimals: 6,
                supply: 1000000000000,
            });
        });

        it('should return null when mint not found', async () => {
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            mockConnection.getParsedAccountInfo.mockResolvedValue({
                value: null,
            });

            const result = await service.getMintInfo(mintAddress);

            expect(result).toBeNull();
        });

        it('should handle errors and throw BadRequestException', async () => {
            const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            mockConnection.getParsedAccountInfo.mockRejectedValue(
                new Error('Network error'),
            );

            await expect(service.getMintInfo(mintAddress)).rejects.toThrow(
                BadRequestException,
            );
        });
    });
});
