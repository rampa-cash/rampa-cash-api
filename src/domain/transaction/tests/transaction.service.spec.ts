import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionService } from '../services/transaction.service';
import { Transaction } from '../entities/transaction.entity';
import { IBlockchainService } from '../../solana/interfaces/blockchain-service.interface';
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IUserService } from '../../user/interfaces/user-service.interface';

describe('TransactionService', () => {
    let service: TransactionService;
    let transactionRepository: Repository<Transaction>;
    let blockchainService: IBlockchainService;
    let walletService: IWalletService;
    let userService: IUserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionService,
                {
                    provide: getRepositoryToken(Transaction),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: IBlockchainService,
                    useValue: {
                        getBalance: jest.fn(),
                        createTransaction: jest.fn(),
                        broadcastTransaction: jest.fn(),
                        monitorTransaction: jest.fn(),
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
                    provide: IUserService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<TransactionService>(TransactionService);
        transactionRepository = module.get<Repository<Transaction>>(
            getRepositoryToken(Transaction),
        );
        blockchainService = module.get<IBlockchainService>(IBlockchainService);
        walletService = module.get<IWalletService>(IWalletService);
        userService = module.get<IUserService>(IUserService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('createTransaction', () => {
        it('should create a new transaction', async () => {
            const createTransactionDto = {
                senderId: 'user-1',
                recipientId: 'user-2',
                amount: '1000000',
                tokenType: 'USDC',
                externalAddress: 'external-address',
            };

            const mockTransaction = {
                id: 'tx-1',
                ...createTransactionDto,
                status: 'pending',
                createdAt: new Date(),
            };

            jest.spyOn(transactionRepository, 'create').mockReturnValue(
                mockTransaction as any,
            );
            jest.spyOn(transactionRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );

            const result =
                await service.createTransaction(createTransactionDto);

            expect(result).toEqual(mockTransaction);
            expect(transactionRepository.create).toHaveBeenCalledWith(
                createTransactionDto,
            );
            expect(transactionRepository.save).toHaveBeenCalledWith(
                mockTransaction,
            );
        });

        it('should handle validation errors', async () => {
            const invalidDto = {
                senderId: '',
                recipientId: 'user-2',
                amount: '-100',
                tokenType: 'INVALID',
            };

            await expect(
                service.createTransaction(invalidDto),
            ).rejects.toThrow();
        });
    });

    describe('getTransactionHistory', () => {
        it('should return transaction history for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                { id: 'tx-1', senderId: userId, status: 'completed' },
                { id: 'tx-2', recipientId: userId, status: 'completed' },
            ];

            jest.spyOn(transactionRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getTransactionHistory(userId);

            expect(result).toHaveLength(2);
            expect(transactionRepository.find).toHaveBeenCalledWith({
                where: [{ senderId: userId }, { recipientId: userId }],
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('getSentTransactions', () => {
        it('should return sent transactions for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                { id: 'tx-1', senderId: userId, status: 'completed' },
            ];

            jest.spyOn(transactionRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getSentTransactions(userId);

            expect(result).toHaveLength(1);
            expect(transactionRepository.find).toHaveBeenCalledWith({
                where: { senderId: userId },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('getReceivedTransactions', () => {
        it('should return received transactions for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                { id: 'tx-1', recipientId: userId, status: 'completed' },
            ];

            jest.spyOn(transactionRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getReceivedTransactions(userId);

            expect(result).toHaveLength(1);
            expect(transactionRepository.find).toHaveBeenCalledWith({
                where: { recipientId: userId },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('updateTransactionStatus', () => {
        it('should update transaction status', async () => {
            const transactionId = 'tx-1';
            const status = 'completed';
            const signature = 'signature-123';

            const mockTransaction = { id: transactionId, status: 'pending' };
            jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(
                mockTransaction as any,
            );
            jest.spyOn(transactionRepository, 'save').mockResolvedValue(
                mockTransaction as any,
            );

            const result = await service.updateTransactionStatus(
                transactionId,
                status,
                signature,
            );

            expect(result).toEqual(mockTransaction);
            expect(transactionRepository.save).toHaveBeenCalledWith({
                ...mockTransaction,
                status,
                solanaTransactionHash: signature,
                confirmedAt: expect.any(Date),
            });
        });
    });

    describe('getTransactionStats', () => {
        it('should return transaction statistics for a user', async () => {
            const userId = 'user-1';
            const mockTransactions = [
                {
                    id: 'tx-1',
                    senderId: userId,
                    amount: '1000000',
                    status: 'completed',
                },
                {
                    id: 'tx-2',
                    recipientId: userId,
                    amount: '500000',
                    status: 'completed',
                },
                {
                    id: 'tx-3',
                    senderId: userId,
                    amount: '200000',
                    status: 'failed',
                },
            ];

            jest.spyOn(transactionRepository, 'find').mockResolvedValue(
                mockTransactions as any,
            );

            const result = await service.getTransactionStats(userId);

            expect(result.totalSent).toBe(BigInt('1200000'));
            expect(result.totalReceived).toBe(BigInt('500000'));
            expect(result.successRate).toBe(66.67);
        });
    });
});
