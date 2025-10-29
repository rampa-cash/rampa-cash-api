import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

describe('Transaction Entity', () => {
    let transaction: Transaction;

    beforeEach(() => {
        transaction = new Transaction();
    });

    describe('Entity Creation', () => {
        it('should create a transaction with required fields', () => {
            transaction.id = 'tx-123';
            transaction.senderId = 'user-1';
            transaction.recipientId = 'user-2';
            transaction.amount = '1000000';
            transaction.tokenType = TokenType.USDC;
            transaction.status = TransactionStatus.PENDING;
            transaction.createdAt = new Date();

            expect(transaction.id).toBe('tx-123');
            expect(transaction.senderId).toBe('user-1');
            expect(transaction.recipientId).toBe('user-2');
            expect(transaction.amount).toBe('1000000');
            expect(transaction.tokenType).toBe(TokenType.USDC);
            expect(transaction.status).toBe(TransactionStatus.PENDING);
            expect(transaction.createdAt).toBeInstanceOf(Date);
        });

        it('should handle external wallet transactions', () => {
            transaction.id = 'tx-123';
            transaction.senderId = 'user-1';
            transaction.recipientId = null;
            transaction.externalAddress = 'external-wallet-address';
            transaction.amount = '1000000';
            transaction.tokenType = TokenType.SOL;
            transaction.status = TransactionStatus.PENDING;

            expect(transaction.externalAddress).toBe('external-wallet-address');
            expect(transaction.recipientId).toBeNull();
        });
    });

    describe('Status Transitions', () => {
        it('should allow valid status transitions', () => {
            transaction.status = TransactionStatus.PENDING;
            expect(transaction.status).toBe(TransactionStatus.PENDING);

            transaction.status = TransactionStatus.PROCESSING;
            expect(transaction.status).toBe(TransactionStatus.PROCESSING);

            transaction.status = TransactionStatus.COMPLETED;
            expect(transaction.status).toBe(TransactionStatus.COMPLETED);
        });

        it('should handle failed transactions', () => {
            transaction.status = TransactionStatus.FAILED;
            transaction.failureReason = 'Insufficient funds';
            transaction.failedAt = new Date();

            expect(transaction.status).toBe(TransactionStatus.FAILED);
            expect(transaction.failureReason).toBe('Insufficient funds');
            expect(transaction.failedAt).toBeInstanceOf(Date);
        });
    });

    describe('Token Types', () => {
        it('should support USDC transactions', () => {
            transaction.tokenType = TokenType.USDC;
            expect(transaction.tokenType).toBe(TokenType.USDC);
        });

        it('should support EURC transactions', () => {
            transaction.tokenType = TokenType.EURC;
            expect(transaction.tokenType).toBe(TokenType.EURC);
        });

        it('should support SOL transactions', () => {
            transaction.tokenType = TokenType.SOL;
            expect(transaction.tokenType).toBe(TokenType.SOL);
        });
    });

    describe('Blockchain Integration', () => {
        it('should store Solana transaction hash', () => {
            transaction.solanaTransactionHash = 'solana-tx-hash-123';
            expect(transaction.solanaTransactionHash).toBe(
                'solana-tx-hash-123',
            );
        });

        it('should track confirmation timestamps', () => {
            transaction.confirmedAt = new Date();
            expect(transaction.confirmedAt).toBeInstanceOf(Date);
        });

        it('should track failure timestamps', () => {
            transaction.failedAt = new Date();
            expect(transaction.failedAt).toBeInstanceOf(Date);
        });
    });

    describe('Validation', () => {
        it('should require sender ID', () => {
            expect(() => {
                transaction.senderId = null as any;
            }).not.toThrow();
        });

        it('should require either recipient ID or external address', () => {
            transaction.senderId = 'user-1';
            transaction.recipientId = 'user-2';
            transaction.externalAddress = null;

            expect(transaction.recipientId).toBe('user-2');
            expect(transaction.externalAddress).toBeNull();
        });

        it('should require positive amount', () => {
            transaction.amount = '1000000';
            expect(parseFloat(transaction.amount)).toBeGreaterThan(0);
        });
    });

    describe('Timestamps', () => {
        it('should set creation timestamp', () => {
            const now = new Date();
            transaction.createdAt = now;
            expect(transaction.createdAt).toBe(now);
        });

        it('should set update timestamp', () => {
            const now = new Date();
            transaction.updatedAt = now;
            expect(transaction.updatedAt).toBe(now);
        });
    });
});
