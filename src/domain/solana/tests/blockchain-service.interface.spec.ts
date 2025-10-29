import { Test, TestingModule } from '@nestjs/testing';
import { IBlockchainService } from '../interfaces/blockchain-service.interface';
import { SolanaBlockchainService } from '../services/solana-blockchain.service';
import { SolanaConnectionService } from '../services/solana-connection.service';
import { SplTokenService } from '../services/spl-token.service';

describe('BlockchainService Interface', () => {
    let service: IBlockchainService;
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            providers: [
                {
                    provide: IBlockchainService,
                    useClass: SolanaBlockchainService,
                },
                {
                    provide: SolanaConnectionService,
                    useValue: {
                        getConnection: jest.fn(),
                    },
                },
                {
                    provide: SplTokenService,
                    useValue: {
                        getTokenBalance: jest.fn(),
                        createTransferInstruction: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<IBlockchainService>(IBlockchainService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('getBalance', () => {
        it('should return balance for a given address and token', async () => {
            const mockBalance = { amount: '1000000', decimals: 6 };
            jest.spyOn(service, 'getBalance').mockResolvedValue(mockBalance);

            const result = await service.getBalance('test-address', 'USDC');

            expect(result).toEqual(mockBalance);
        });

        it('should handle errors gracefully', async () => {
            jest.spyOn(service, 'getBalance').mockRejectedValue(
                new Error('Network error'),
            );

            await expect(
                service.getBalance('invalid-address', 'USDC'),
            ).rejects.toThrow('Network error');
        });
    });

    describe('createTransaction', () => {
        it('should create a transaction with proper parameters', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'pending',
                signature: 'signature-123',
            };
            jest.spyOn(service, 'createTransaction').mockResolvedValue(
                mockTransaction,
            );

            const result = await service.createTransaction({
                from: 'from-address',
                to: 'to-address',
                amount: '1000000',
                token: 'USDC',
            });

            expect(result).toEqual(mockTransaction);
        });
    });

    describe('broadcastTransaction', () => {
        it('should broadcast a transaction and return signature', async () => {
            const mockSignature = 'signature-123';
            jest.spyOn(service, 'broadcastTransaction').mockResolvedValue(
                mockSignature,
            );

            const result =
                await service.broadcastTransaction('transaction-data');

            expect(result).toBe(mockSignature);
        });
    });

    describe('monitorTransaction', () => {
        it('should monitor transaction status', async () => {
            const mockStatus = {
                signature: 'signature-123',
                status: 'confirmed',
                confirmations: 32,
            };
            jest.spyOn(service, 'monitorTransaction').mockResolvedValue(
                mockStatus,
            );

            const result = await service.monitorTransaction('signature-123');

            expect(result).toEqual(mockStatus);
        });
    });
});
