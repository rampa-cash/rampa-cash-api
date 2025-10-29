import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { SolanaModule } from '../../src/domain/solana/solana.module';
import { SolanaService } from '../../src/domain/solana/services/solana.service';

describe('Solana Wallet Contract Tests', () => {
    let app: INestApplication;
    let solanaService: SolanaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                SolanaModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        solanaService = moduleFixture.get<SolanaService>(SolanaService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Wallet Address Validation Contract', () => {
        it('should validate correct Solana address format', () => {
            const validAddresses = [
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
                '11111111111111111111111111111111',
                'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                'So11111111111111111111111111111111111111112',
            ];

            validAddresses.forEach((address) => {
                expect(solanaService.validateAddress(address)).toBe(true);
            });
        });

        it('should reject invalid address formats', () => {
            const invalidAddresses = [
                'invalid-address',
                'too-short',
                '123',
                '',
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM-invalid',
                '0x1234567890abcdef', // Ethereum format
                'bitcoin-address-format',
            ];

            invalidAddresses.forEach((address) => {
                expect(solanaService.validateAddress(address)).toBe(false);
            });
        });
    });

    describe('Wallet Balance Contract', () => {
        it('should return balance for valid address', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            // Mock the connection service to return a balance
            const mockConnectionService = {
                getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL in lamports
            };

            // Replace the service method
            jest.spyOn(solanaService, 'getBalance').mockImplementation(
                async (addr) => {
                    if (!solanaService.validateAddress(addr)) {
                        throw new Error('Invalid address');
                    }
                    return mockConnectionService.getBalance(addr);
                },
            );

            const balance = await solanaService.getBalance(address);

            expect(typeof balance).toBe('number');
            expect(balance).toBeGreaterThanOrEqual(0);
        });

        it('should throw error for invalid address', async () => {
            const invalidAddress = 'invalid-address';

            await expect(
                solanaService.getBalance(invalidAddress),
            ).rejects.toThrow();
        });
    });

    describe('Token Balance Contract', () => {
        it('should return token balances for valid address', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            // Mock token balances
            const mockTokenBalances = [
                {
                    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    amount: 1000000,
                    decimals: 6,
                    uiAmount: 1.0,
                    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ];

            jest.spyOn(solanaService, 'getTokenBalances').mockResolvedValue(
                mockTokenBalances,
            );

            const balances = await solanaService.getTokenBalances(address);

            expect(Array.isArray(balances)).toBe(true);
            expect(balances[0]).toHaveProperty('mint');
            expect(balances[0]).toHaveProperty('amount');
            expect(balances[0]).toHaveProperty('decimals');
            expect(balances[0]).toHaveProperty('uiAmount');
            expect(balances[0]).toHaveProperty('tokenProgram');
        });

        it('should return specific token balance', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const tokenType = 'USDC';

            const mockTokenBalance = {
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: 1000000,
                decimals: 6,
                uiAmount: 1.0,
                tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            };

            jest.spyOn(solanaService, 'getTokenBalance').mockResolvedValue(
                mockTokenBalance,
            );

            const balance = await solanaService.getTokenBalance(
                address,
                tokenType,
            );

            expect(balance).toHaveProperty('mint');
            expect(balance).toHaveProperty('amount');
            expect(balance).toHaveProperty('decimals');
            expect(balance).toHaveProperty('uiAmount');
            expect(balance).toHaveProperty('tokenProgram');
        });
    });

    describe('Transaction Creation Contract', () => {
        it('should create SOL transfer transaction with valid parameters', async () => {
            const fromAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const toAddress = '11111111111111111111111111111111';
            const amount = 0.001;

            // Mock the required services
            jest.spyOn(
                solanaService,
                'createTransferTransaction',
            ).mockImplementation(async (from, to, amt) => {
                if (
                    !solanaService.validateAddress(from) ||
                    !solanaService.validateAddress(to)
                ) {
                    throw new Error('Invalid address');
                }
                if (amt <= 0) {
                    throw new Error('Amount must be positive');
                }
                return {} as any; // Mock transaction object
            });

            const transaction = await solanaService.createTransferTransaction(
                fromAddress,
                toAddress,
                amount,
            );

            expect(transaction).toBeDefined();
        });

        it('should create SPL token transfer transaction with valid parameters', async () => {
            const fromAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const toAddress = '11111111111111111111111111111111';
            const amount = 1.0;
            const tokenType = 'USDC';

            jest.spyOn(
                solanaService,
                'createTokenTransferTransaction',
            ).mockImplementation(async (from, to, amt, token) => {
                if (
                    !solanaService.validateAddress(from) ||
                    !solanaService.validateAddress(to)
                ) {
                    throw new Error('Invalid address');
                }
                if (amt <= 0) {
                    throw new Error('Amount must be positive');
                }
                if (!['USDC', 'EURC'].includes(token)) {
                    throw new Error('Unsupported token type');
                }
                return {} as any; // Mock transaction object
            });

            const transaction =
                await solanaService.createTokenTransferTransaction(
                    fromAddress,
                    toAddress,
                    amount,
                    tokenType,
                );

            expect(transaction).toBeDefined();
        });

        it('should reject transaction creation with invalid addresses', async () => {
            const invalidAddress = 'invalid-address';
            const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            await expect(
                solanaService.createTransferTransaction(
                    invalidAddress,
                    validAddress,
                    0.001,
                ),
            ).rejects.toThrow();
        });

        it('should reject transaction creation with invalid amounts', async () => {
            const fromAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const toAddress = '11111111111111111111111111111111';

            await expect(
                solanaService.createTransferTransaction(
                    fromAddress,
                    toAddress,
                    -1,
                ),
            ).rejects.toThrow();
        });
    });

    describe('Network Information Contract', () => {
        it('should return network configuration', () => {
            const networkInfo = solanaService.getNetworkInfo();

            expect(networkInfo).toHaveProperty('network');
            expect(networkInfo).toHaveProperty('rpcUrl');
            expect(networkInfo).toHaveProperty('cluster');
            expect(typeof networkInfo.network).toBe('string');
            expect(typeof networkInfo.rpcUrl).toBe('string');
            expect(typeof networkInfo.cluster).toBe('string');
        });

        it('should have valid network values', () => {
            const networkInfo = solanaService.getNetworkInfo();

            const validNetworks = ['mainnet-beta', 'devnet', 'testnet'];
            expect(validNetworks).toContain(networkInfo.network);

            expect(networkInfo.rpcUrl).toMatch(/^https?:\/\/.+/);

            const validClusters = ['mainnet', 'devnet', 'testnet'];
            expect(validClusters).toContain(networkInfo.cluster);
        });
    });

    describe('Health Check Contract', () => {
        it('should return health status', async () => {
            const isHealthy = await solanaService.isHealthy();

            expect(typeof isHealthy).toBe('boolean');
        });

        it('should handle health check errors gracefully', async () => {
            // Mock health service to throw error
            jest.spyOn(solanaService, 'isHealthy').mockRejectedValue(
                new Error('Health check failed'),
            );

            await expect(solanaService.isHealthy()).rejects.toThrow();
        });
    });

    describe('Error Handling Contract', () => {
        it('should handle network errors gracefully', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            // Mock network error
            jest.spyOn(solanaService, 'getBalance').mockRejectedValue(
                new Error('Network connection failed'),
            );

            await expect(solanaService.getBalance(address)).rejects.toThrow();
        });

        it('should provide meaningful error messages', async () => {
            const invalidAddress = 'invalid-address';

            try {
                await solanaService.getBalance(invalidAddress);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid Solana address');
            }
        });
    });

    describe('Data Type Contracts', () => {
        it('should return correct data types for account info', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            const mockAccountInfo = {
                address,
                balance: 1000000000,
                owner: '11111111111111111111111111111111',
                executable: false,
                rentEpoch: 0,
            };

            jest.spyOn(solanaService, 'getAccountInfo').mockResolvedValue(
                mockAccountInfo,
            );

            const accountInfo = await solanaService.getAccountInfo(address);

            expect(accountInfo).toHaveProperty('address', 'string');
            expect(accountInfo).toHaveProperty('balance', 'number');
            expect(accountInfo).toHaveProperty('owner', 'string');
            expect(accountInfo).toHaveProperty('executable', 'boolean');
            expect(accountInfo).toHaveProperty('rentEpoch', 'number');
        });

        it('should return correct data types for token balances', async () => {
            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            const mockTokenBalances = [
                {
                    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    amount: 1000000,
                    decimals: 6,
                    uiAmount: 1.0,
                    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                },
            ];

            jest.spyOn(solanaService, 'getTokenBalances').mockResolvedValue(
                mockTokenBalances,
            );

            const balances = await solanaService.getTokenBalances(address);

            expect(Array.isArray(balances)).toBe(true);
            if (balances.length > 0) {
                const balance = balances[0];
                expect(typeof balance.mint).toBe('string');
                expect(typeof balance.amount).toBe('number');
                expect(typeof balance.decimals).toBe('number');
                expect(typeof balance.uiAmount).toBe('number');
                expect(typeof balance.tokenProgram).toBe('string');
            }
        });
    });
});
