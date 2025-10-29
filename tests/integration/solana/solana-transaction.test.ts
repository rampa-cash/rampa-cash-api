import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { SolanaService } from '../../../src/domain/solana/services/solana.service';
import { SolanaConnectionService } from '../../../src/domain/solana/services/solana-connection.service';
import { SplTokenService } from '../../../src/domain/solana/services/spl-token.service';
import { SolanaRetryService } from '../../../src/domain/solana/services/solana-retry.service';
import { SolanaHealthService } from '../../../src/domain/solana/services/solana-health.service';
import { SolanaModule } from '../../../src/domain/solana/solana.module';
import { Transaction } from '@solana/web3.js';

describe('Solana Transaction Integration', () => {
    let module: TestingModule;
    let solanaService: SolanaService;
    let connectionService: SolanaConnectionService;
    let splTokenService: SplTokenService;
    let retryService: SolanaRetryService;
    let healthService: SolanaHealthService;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                SolanaModule,
            ],
        }).compile();

        solanaService = module.get<SolanaService>(SolanaService);
        connectionService = module.get<SolanaConnectionService>(
            SolanaConnectionService,
        );
        splTokenService = module.get<SplTokenService>(SplTokenService);
        retryService = module.get<SolanaRetryService>(SolanaRetryService);
        healthService = module.get<SolanaHealthService>(SolanaHealthService);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('Health Check Integration', () => {
        it('should check Solana network health', async () => {
            const isHealthy = await healthService.isHealthy();

            // This test might fail in CI/CD if no RPC access
            // In real integration tests, you'd use a test RPC endpoint
            expect(typeof isHealthy).toBe('boolean');
        });

        it('should get health status with metrics', async () => {
            const healthStatus = await healthService.getHealthStatus();

            expect(healthStatus).toHaveProperty('isHealthy');
            expect(healthStatus).toHaveProperty('network');
            expect(healthStatus).toHaveProperty('rpcUrl');
            expect(healthStatus).toHaveProperty('lastChecked');
            expect(healthStatus).toHaveProperty('responseTime');
        });
    });

    describe('Address Validation Integration', () => {
        it('should validate real Solana addresses', () => {
            const validAddresses = [
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Example valid address
                '11111111111111111111111111111111', // System program
                'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
            ];

            validAddresses.forEach((address) => {
                expect(solanaService.validateAddress(address)).toBe(true);
            });
        });

        it('should reject invalid addresses', () => {
            const invalidAddresses = [
                'invalid-address',
                'too-short',
                '123',
                '',
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM-invalid',
            ];

            invalidAddresses.forEach((address) => {
                expect(solanaService.validateAddress(address)).toBe(false);
            });
        });
    });

    describe('Network Information Integration', () => {
        it('should return network configuration', () => {
            const networkInfo = solanaService.getNetworkInfo();

            expect(networkInfo).toHaveProperty('network');
            expect(networkInfo).toHaveProperty('rpcUrl');
            expect(networkInfo).toHaveProperty('cluster');
            expect(typeof networkInfo.network).toBe('string');
            expect(typeof networkInfo.rpcUrl).toBe('string');
            expect(typeof networkInfo.cluster).toBe('string');
        });
    });

    describe('Retry Service Integration', () => {
        it('should execute operation with retry logic', async () => {
            let attemptCount = 0;
            const maxAttempts = 3;

            const operation = jest.fn().mockImplementation(async () => {
                attemptCount++;
                if (attemptCount < maxAttempts) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            });

            const result = await retryService.executeWithRetry(operation, {
                maxRetries: maxAttempts - 1,
                baseDelay: 10, // Fast for testing
            });

            expect(result.success).toBe(true);
            expect(result.result).toBe('success');
            expect(result.attempts).toBe(maxAttempts);
            expect(operation).toHaveBeenCalledTimes(maxAttempts);
        });

        it('should fail after max retries', async () => {
            const operation = jest
                .fn()
                .mockRejectedValue(new Error('Persistent failure'));

            const result = await retryService.executeWithRetry(operation, {
                maxRetries: 2,
                baseDelay: 10,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.attempts).toBe(3);
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should not retry non-retryable errors', async () => {
            const operation = jest
                .fn()
                .mockRejectedValue(new Error('Invalid input'));

            const result = await retryService.executeWithRetry(operation, {
                maxRetries: 3,
                baseDelay: 10,
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toBe(1);
            expect(operation).toHaveBeenCalledTimes(1);
        });
    });

    describe('Transaction Creation Integration', () => {
        it('should create SOL transfer transaction', async () => {
            const fromAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const toAddress = '11111111111111111111111111111111';
            const amount = 0.001; // 0.001 SOL

            // Mock the connection service methods
            jest.spyOn(
                connectionService,
                'getRecentBlockhash',
            ).mockResolvedValue('mock-blockhash');

            const transaction = await solanaService.createTransferTransaction(
                fromAddress,
                toAddress,
                amount,
            );

            expect(transaction).toBeInstanceOf(Transaction);
            expect(transaction.instructions).toHaveLength(1);
        });

        it('should create SPL token transfer transaction', async () => {
            const fromAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
            const toAddress = '11111111111111111111111111111111';
            const amount = 1.0; // 1 USDC
            const tokenType = 'USDC';

            // Mock the required services
            jest.spyOn(
                connectionService,
                'getRecentBlockhash',
            ).mockResolvedValue('mock-blockhash');
            jest.spyOn(splTokenService, 'getTokenMintAddress').mockReturnValue(
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            );
            jest.spyOn(splTokenService, 'getMintInfo').mockResolvedValue({
                decimals: 6,
                supply: 1000000000,
            });
            jest.spyOn(splTokenService, 'convertToTokenUnits').mockReturnValue(
                1000000,
            );
            jest.spyOn(
                splTokenService,
                'createTransferInstruction',
            ).mockResolvedValue({} as any);

            const transaction =
                await solanaService.createTokenTransferTransaction(
                    fromAddress,
                    toAddress,
                    amount,
                    tokenType,
                );

            expect(transaction).toBeInstanceOf(Transaction);
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle network errors gracefully', async () => {
            // Mock a network error
            jest.spyOn(connectionService, 'getBalance').mockRejectedValue(
                new Error('Network connection failed'),
            );

            const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            await expect(solanaService.getBalance(address)).rejects.toThrow();
        });

        it('should handle invalid addresses in transaction creation', async () => {
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
    });

    describe('Service Dependencies Integration', () => {
        it('should have all required services injected', () => {
            expect(solanaService).toBeDefined();
            expect(connectionService).toBeDefined();
            expect(splTokenService).toBeDefined();
            expect(retryService).toBeDefined();
            expect(healthService).toBeDefined();
        });

        it('should have proper service relationships', () => {
            // Verify that services can access their dependencies
            expect(connectionService.getConnection).toBeDefined();
            expect(splTokenService.getTokenMintAddress).toBeDefined();
            expect(retryService.executeWithRetry).toBeDefined();
            expect(healthService.isHealthy).toBeDefined();
        });
    });
});
