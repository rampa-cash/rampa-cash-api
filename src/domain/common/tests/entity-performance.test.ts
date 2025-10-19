import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Contact } from '../../contact/entities/contact.entity';
import { VISACard } from '../../visa-card/entities/visa-card.entity';
import { OnOffRamp } from '../../onramp/entities/onoff-ramp.entity';
import { BalanceHistory } from '../../wallet/entities/balance-history.entity';

describe('Entity Performance Tests', () => {
    let userRepo: Repository<User>;
    let walletRepo: Repository<Wallet>;
    let transactionRepo: Repository<Transaction>;
    let contactRepo: Repository<Contact>;
    let visaCardRepo: Repository<VISACard>;
    let onOffRampRepo: Repository<OnOffRamp>;
    let balanceHistoryRepo: Repository<BalanceHistory>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: getRepositoryToken(User),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(Wallet),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(Transaction),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(Contact),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(VISACard),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(OnOffRamp),
                    useClass: Repository,
                },
                {
                    provide: getRepositoryToken(BalanceHistory),
                    useClass: Repository,
                },
            ],
        }).compile();

        userRepo = module.get<Repository<User>>(getRepositoryToken(User));
        walletRepo = module.get<Repository<Wallet>>(getRepositoryToken(Wallet));
        transactionRepo = module.get<Repository<Transaction>>(
            getRepositoryToken(Transaction),
        );
        contactRepo = module.get<Repository<Contact>>(
            getRepositoryToken(Contact),
        );
        visaCardRepo = module.get<Repository<VISACard>>(
            getRepositoryToken(VISACard),
        );
        onOffRampRepo = module.get<Repository<OnOffRamp>>(
            getRepositoryToken(VISACard),
        );
        balanceHistoryRepo = module.get<Repository<BalanceHistory>>(
            getRepositoryToken(BalanceHistory),
        );
    });

    describe('Entity Creation Performance', () => {
        it('should create entities efficiently', async () => {
            const startTime = Date.now();

            // Create multiple entities
            const users = [];
            for (let i = 0; i < 100; i++) {
                const user = new User();
                user.email = `user${i}@example.com`;
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;
                users.push(user);
            }

            const wallets = [];
            for (let i = 0; i < 100; i++) {
                const wallet = new Wallet();
                wallet.userId = `user-${i}`;
                wallet.address = `address${i}`;
                wallet.publicKey = `publicKey${i}`;
                wallet.walletType = 'web3auth_mpc' as any;
                wallets.push(wallet);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should create 200 entities in less than 100ms
            expect(duration).toBeLessThan(100);
            expect(users).toHaveLength(100);
            expect(wallets).toHaveLength(100);
        });

        it('should handle large entity creation without memory issues', async () => {
            const startTime = Date.now();
            const initialMemory = process.memoryUsage().heapUsed;

            // Create a large number of entities
            const entities = [];
            for (let i = 0; i < 1000; i++) {
                const user = new User();
                user.email = `user${i}@example.com`;
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;
                entities.push(user);
            }

            const endTime = Date.now();
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Should complete in reasonable time
            expect(endTime - startTime).toBeLessThan(500);

            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

            expect(entities).toHaveLength(1000);
        });
    });

    describe('Entity Validation Performance', () => {
        it('should validate entities efficiently', async () => {
            const startTime = Date.now();

            // Create and validate multiple entities
            const users = [];
            for (let i = 0; i < 100; i++) {
                const user = new User();
                user.email = `user${i}@example.com`;
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;
                users.push(user);
            }

            // Validate all entities
            const validationPromises = users.map((user) => validate(user));
            await Promise.all(validationPromises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should validate 100 entities in less than 200ms
            expect(duration).toBeLessThan(200);
        });

        it('should handle validation errors efficiently', async () => {
            const startTime = Date.now();

            // Create entities with validation errors
            const invalidUsers = [];
            for (let i = 0; i < 50; i++) {
                const user = new User();
                user.email = 'invalid-email'; // Invalid email
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;
                invalidUsers.push(user);
            }

            // Validate all entities (should all fail)
            const validationPromises = invalidUsers.map((user) =>
                validate(user),
            );
            const results = await Promise.all(validationPromises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete validation quickly even with errors
            expect(duration).toBeLessThan(300);

            // All validations should fail
            expect(results.every((result: any) => result.length > 0)).toBe(
                true,
            );
        });
    });

    describe('Entity Relationship Performance', () => {
        it('should handle complex entity relationships efficiently', async () => {
            const startTime = Date.now();

            // Create a complex entity graph
            const user = new User();
            user.id = 'user-123';
            user.email = 'test@example.com';
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';

            // Create multiple wallets
            const wallets = [];
            for (let i = 0; i < 10; i++) {
                const wallet = new Wallet();
                wallet.id = `wallet-${i}`;
                wallet.userId = user.id;
                wallet.address = `address${i}`;
                wallet.publicKey = `publicKey${i}`;
                wallet.walletType = 'web3auth_mpc' as any;
                wallets.push(wallet);
            }

            // Create multiple transactions
            const transactions = [];
            for (let i = 0; i < 50; i++) {
                const transaction = new Transaction();
                transaction.id = `transaction-${i}`;
                transaction.senderId = user.id;
                transaction.recipientId = `user-${i}`;
                transaction.senderWalletId = wallets[0].id;
                transaction.recipientWalletId = `wallet-${i}`;
                transaction.amount = 100 + i;
                transaction.tokenType = 'USDC' as any;
                transaction.status = 'pending' as any;
                transactions.push(transaction);
            }

            // Create multiple contacts
            const contacts = [];
            for (let i = 0; i < 20; i++) {
                const contact = new Contact();
                contact.id = `contact-${i}`;
                contact.ownerId = user.id;
                contact.displayName = `Contact ${i}`;
                contact.email = `contact${i}@example.com`;
                contacts.push(contact);
            }

            // Set up relationships
            user.wallets = wallets;
            user.sentTransactions = transactions;
            user.ownedContacts = contacts;

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should create complex entity graph quickly
            expect(duration).toBeLessThan(100);
            expect(user.wallets).toHaveLength(10);
            expect(user.sentTransactions).toHaveLength(50);
            expect(user.ownedContacts).toHaveLength(20);
        });

        it('should handle deep entity relationships without performance degradation', async () => {
            const startTime = Date.now();

            // Create a deep entity hierarchy
            const users = [];
            for (let i = 0; i < 10; i++) {
                const user = new User();
                user.id = `user-${i}`;
                user.email = `user${i}@example.com`;
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;

                // Each user has multiple wallets
                const wallets = [];
                for (let j = 0; j < 5; j++) {
                    const wallet = new Wallet();
                    wallet.id = `wallet-${i}-${j}`;
                    wallet.userId = user.id;
                    wallet.address = `address${i}-${j}`;
                    wallet.publicKey = `publicKey${i}-${j}`;
                    wallet.walletType = 'web3auth_mpc' as any;

                    // Each wallet has multiple transactions
                    const transactions = [];
                    for (let k = 0; k < 10; k++) {
                        const transaction = new Transaction();
                        transaction.id = `transaction-${i}-${j}-${k}`;
                        transaction.senderId = user.id;
                        transaction.recipientId = `user-${(i + 1) % 10}`;
                        transaction.senderWalletId = wallet.id;
                        transaction.recipientWalletId = `wallet-${(i + 1) % 10}-0`;
                        transaction.amount = 100 + k;
                        transaction.tokenType = 'USDC' as any;
                        transaction.status = 'pending' as any;
                        transactions.push(transaction);
                    }

                    wallet.sentTransactions = transactions;
                    wallets.push(wallet);
                }

                user.wallets = wallets;
                users.push(user);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should create deep hierarchy quickly
            expect(duration).toBeLessThan(200);
            expect(users).toHaveLength(10);
            expect(users[0].wallets).toHaveLength(5);
            expect(users[0].wallets[0].sentTransactions).toHaveLength(10);
        });
    });

    describe('Entity Serialization Performance', () => {
        it('should serialize entities efficiently', async () => {
            const startTime = Date.now();

            // Create a complex entity
            const user = new User();
            user.id = 'user-123';
            user.email = 'test@example.com';
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';

            const wallet = new Wallet();
            wallet.id = 'wallet-123';
            wallet.userId = user.id;
            wallet.address = 'address123';
            wallet.publicKey = 'publicKey123';
            wallet.walletType = 'web3auth_mpc' as any;

            const transaction = new Transaction();
            transaction.id = 'transaction-123';
            transaction.senderId = user.id;
            transaction.recipientId = 'user-456';
            transaction.senderWalletId = wallet.id;
            transaction.recipientWalletId = 'wallet-456';
            transaction.amount = 100;
            transaction.tokenType = 'USDC' as any;
            transaction.status = 'pending' as any;

            // Set up relationships
            user.wallets = [wallet];
            user.sentTransactions = [transaction];
            wallet.sentTransactions = [transaction];

            // Serialize multiple times
            const serializations = [];
            for (let i = 0; i < 100; i++) {
                serializations.push(JSON.stringify(user));
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should serialize 100 times quickly
            expect(duration).toBeLessThan(100);
            expect(serializations).toHaveLength(100);
        });

        it('should handle large entity serialization efficiently', async () => {
            const startTime = Date.now();

            // Create a large entity with many relationships
            const user = new User();
            user.id = 'user-123';
            user.email = 'test@example.com';
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';

            // Create many wallets
            const wallets = [];
            for (let i = 0; i < 100; i++) {
                const wallet = new Wallet();
                wallet.id = `wallet-${i}`;
                wallet.userId = user.id;
                wallet.address = `address${i}`;
                wallet.publicKey = `publicKey${i}`;
                wallet.walletType = 'web3auth_mpc' as any;
                wallets.push(wallet);
            }

            // Create many transactions
            const transactions = [];
            for (let i = 0; i < 500; i++) {
                const transaction = new Transaction();
                transaction.id = `transaction-${i}`;
                transaction.senderId = user.id;
                transaction.recipientId = `user-${i % 10}`;
                transaction.senderWalletId = wallets[i % 100].id;
                transaction.recipientWalletId = `wallet-${i % 10}`;
                transaction.amount = 100 + i;
                transaction.tokenType = 'USDC' as any;
                transaction.status = 'pending' as any;
                transactions.push(transaction);
            }

            user.wallets = wallets;
            user.sentTransactions = transactions;

            // Serialize the large entity
            const serialized = JSON.stringify(user);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should serialize large entity quickly
            expect(duration).toBeLessThan(200);
            expect(serialized.length).toBeGreaterThan(0);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory when creating many entities', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Create many entities
            const entities = [];
            for (let i = 0; i < 1000; i++) {
                const user = new User();
                user.id = `user-${i}`;
                user.email = `user${i}@example.com`;
                user.authProvider = 'web3auth' as any;
                user.authProviderId = `web3auth-${i}`;
                entities.push(user);
            }

            // Clear references
            entities.length = 0;

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
        });
    });
});
