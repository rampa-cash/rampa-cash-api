import { Test, TestingModule } from '@nestjs/testing';
import { SolanaService } from '../services/solana.service';
import { SolanaConnectionService } from '../services/solana-connection.service';
import { SplTokenService } from '../services/spl-token.service';
import { SolanaRetryService } from '../services/solana-retry.service';

describe('SolanaService', () => {
    let service: SolanaService;
    let connectionService: SolanaConnectionService;
    let splTokenService: SplTokenService;
    let retryService: SolanaRetryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SolanaService,
                {
                    provide: SolanaConnectionService,
                    useValue: {
                        getConnection: jest.fn(),
                        getLatestBlockhash: jest.fn(),
                    },
                },
                {
                    provide: SplTokenService,
                    useValue: {
                        getTokenBalance: jest.fn(),
                        createTransferInstruction: jest.fn(),
                        getTokenAccounts: jest.fn(),
                    },
                },
                {
                    provide: SolanaRetryService,
                    useValue: {
                        executeWithRetry: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SolanaService>(SolanaService);
        connectionService = module.get<SolanaConnectionService>(
            SolanaConnectionService,
        );
        splTokenService = module.get<SplTokenService>(SplTokenService);
        retryService = module.get<SolanaRetryService>(SolanaRetryService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('getBalance', () => {
        it('should return SOL balance for a wallet', async () => {
            const mockBalance = 1000000000; // 1 SOL in lamports
            const mockConnection = {
                getBalance: jest.fn().mockResolvedValue(mockBalance),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );

            const result = await service.getBalance('wallet-address');

            expect(result).toBe(mockBalance);
            expect(mockConnection.getBalance).toHaveBeenCalledWith(
                'wallet-address',
            );
        });

        it('should handle connection errors', async () => {
            const mockConnection = {
                getBalance: jest
                    .fn()
                    .mockRejectedValue(new Error('Connection failed')),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );

            await expect(service.getBalance('invalid-address')).rejects.toThrow(
                'Connection failed',
            );
        });
    });

    describe('getTokenBalance', () => {
        it('should return token balance for USDC', async () => {
            const mockTokenBalance = {
                amount: '1000000',
                decimals: 6,
                uiAmount: 1.0,
            };

            jest.spyOn(splTokenService, 'getTokenBalance').mockResolvedValue(
                mockTokenBalance as any,
            );

            const result = await service.getTokenBalance(
                'wallet-address',
                'USDC',
            );

            expect(result).toEqual(mockTokenBalance);
            expect(splTokenService.getTokenBalance).toHaveBeenCalledWith(
                'wallet-address',
                'USDC',
            );
        });

        it('should return null for non-existent token account', async () => {
            jest.spyOn(splTokenService, 'getTokenBalance').mockResolvedValue(
                null,
            );

            const result = await service.getTokenBalance(
                'wallet-address',
                'NONEXISTENT',
            );

            expect(result).toBeNull();
        });
    });

    describe('getTokenAccounts', () => {
        it('should return token accounts for a wallet', async () => {
            const mockTokenAccounts = [
                {
                    address: 'token-account-1',
                    mint: 'USDC-mint',
                    amount: '1000000',
                },
                {
                    address: 'token-account-2',
                    mint: 'EURC-mint',
                    amount: '500000',
                },
            ];

            jest.spyOn(splTokenService, 'getTokenAccounts').mockResolvedValue(
                mockTokenAccounts as any,
            );

            const result = await service.getTokenAccounts('wallet-address');

            expect(result).toEqual(mockTokenAccounts);
            expect(splTokenService.getTokenAccounts).toHaveBeenCalledWith(
                'wallet-address',
            );
        });
    });

    describe('createTransaction', () => {
        it('should create a transaction with proper instructions', async () => {
            const mockTransaction = {
                add: jest.fn(),
                sign: jest.fn(),
                serialize: jest
                    .fn()
                    .mockReturnValue(Buffer.from('transaction-data')),
            };

            const mockConnection = {
                createTransaction: jest.fn().mockReturnValue(mockTransaction),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );
            jest.spyOn(
                connectionService,
                'getLatestBlockhash',
            ).mockResolvedValue({
                blockhash: 'blockhash-123',
                lastValidBlockHeight: 1000,
            });

            const result = await service.createTransaction({
                from: 'from-address',
                to: 'to-address',
                amount: '1000000',
                token: 'USDC',
            });

            expect(result).toBeDefined();
            expect(mockTransaction.add).toHaveBeenCalled();
        });
    });

    describe('sendTransaction', () => {
        it('should send a transaction and return signature', async () => {
            const mockSignature = 'signature-123';
            const mockConnection = {
                sendTransaction: jest.fn().mockResolvedValue(mockSignature),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );
            jest.spyOn(retryService, 'executeWithRetry').mockImplementation(
                async (fn) => fn(),
            );

            const result = await service.sendTransaction('transaction-data');

            expect(result).toBe(mockSignature);
            expect(mockConnection.sendTransaction).toHaveBeenCalledWith(
                'transaction-data',
            );
        });

        it('should handle retry logic for failed transactions', async () => {
            const mockConnection = {
                sendTransaction: jest
                    .fn()
                    .mockRejectedValueOnce(new Error('Network error'))
                    .mockResolvedValue('signature-123'),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );
            jest.spyOn(retryService, 'executeWithRetry').mockImplementation(
                async (fn) => fn(),
            );

            const result = await service.sendTransaction('transaction-data');

            expect(result).toBe('signature-123');
        });
    });

    describe('getTransactionStatus', () => {
        it('should return transaction status', async () => {
            const mockStatus = {
                signature: 'signature-123',
                status: 'confirmed',
                confirmations: 32,
                blockTime: 1234567890,
            };

            const mockConnection = {
                getSignatureStatus: jest.fn().mockResolvedValue({
                    value: {
                        confirmationStatus: 'confirmed',
                        confirmations: 32,
                        blockTime: 1234567890,
                    },
                }),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );

            const result = await service.getTransactionStatus('signature-123');

            expect(result).toMatchObject({
                signature: 'signature-123',
                status: 'confirmed',
                confirmations: 32,
                blockTime: 1234567890,
            });
        });

        it('should handle pending transactions', async () => {
            const mockConnection = {
                getSignatureStatus: jest.fn().mockResolvedValue({
                    value: {
                        confirmationStatus: 'processed',
                        confirmations: 0,
                        blockTime: null,
                    },
                }),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );

            const result = await service.getTransactionStatus('signature-123');

            expect(result.status).toBe('pending');
            expect(result.confirmations).toBe(0);
        });
    });

    describe('getRecentTransactions', () => {
        it('should return recent transactions for an address', async () => {
            const mockTransactions = [
                {
                    signature: 'signature-1',
                    blockTime: 1234567890,
                    slot: 1000,
                },
                {
                    signature: 'signature-2',
                    blockTime: 1234567891,
                    slot: 1001,
                },
            ];

            const mockConnection = {
                getSignaturesForAddress: jest
                    .fn()
                    .mockResolvedValue(mockTransactions),
            };

            jest.spyOn(connectionService, 'getConnection').mockReturnValue(
                mockConnection as any,
            );

            const result = await service.getRecentTransactions(
                'wallet-address',
                10,
            );

            expect(result).toEqual(mockTransactions);
            expect(mockConnection.getSignaturesForAddress).toHaveBeenCalledWith(
                'wallet-address',
                { limit: 10 },
            );
        });
    });

    describe('validateAddress', () => {
        it('should validate correct Solana addresses', async () => {
            const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

            const result = await service.validateAddress(validAddress);

            expect(result).toBe(true);
        });

        it('should reject invalid addresses', async () => {
            const invalidAddress = 'invalid-address';

            const result = await service.validateAddress(invalidAddress);

            expect(result).toBe(false);
        });
    });
});
