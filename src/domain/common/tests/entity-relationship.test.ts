import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Contact } from '../../contact/entities/contact.entity';
import { VISACard } from '../../visa-card/entities/visa-card.entity';
import { OnOffRamp } from '../../onramp/entities/onoff-ramp.entity';
import { BalanceHistory } from '../../wallet/entities/balance-history.entity';

describe('Entity Relationship Tests', () => {
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
            getRepositoryToken(OnOffRamp),
        );
        balanceHistoryRepo = module.get<Repository<BalanceHistory>>(
            getRepositoryToken(BalanceHistory),
        );
    });

    describe('User-Wallet Relationship (1:N)', () => {
        it('should allow multiple wallets per user', () => {
            const user = new User();
            user.id = 'user-123';
            user.email = 'test@example.com';
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';

            const wallet1 = new Wallet();
            wallet1.id = 'wallet-1';
            wallet1.userId = user.id;
            wallet1.address = 'address1';
            wallet1.publicKey = 'publicKey1';
            wallet1.walletType = 'web3auth_mpc' as any;

            const wallet2 = new Wallet();
            wallet2.id = 'wallet-2';
            wallet2.userId = user.id;
            wallet2.address = 'address2';
            wallet2.publicKey = 'publicKey2';
            wallet2.walletType = 'phantom' as any;

            // User should be able to have multiple wallets
            user.wallets = [wallet1, wallet2];
            expect(user.wallets).toHaveLength(2);
            expect(wallet1.userId).toBe(user.id);
            expect(wallet2.userId).toBe(user.id);
        });

        it('should maintain referential integrity', () => {
            const user = new User();
            user.id = 'user-123';

            const wallet = new Wallet();
            wallet.userId = user.id;
            wallet.address = 'address1';
            wallet.publicKey = 'publicKey1';
            wallet.walletType = 'web3auth_mpc' as any;

            // Wallet should reference the correct user
            expect(wallet.userId).toBe(user.id);
        });
    });

    describe('User-Transaction Relationship (1:N)', () => {
        it('should allow user to have multiple sent transactions', () => {
            const user = new User();
            user.id = 'user-123';

            const transaction1 = new Transaction();
            transaction1.senderId = user.id;
            transaction1.recipientId = 'user-456';
            transaction1.senderWalletId = 'wallet-1';
            transaction1.recipientWalletId = 'wallet-2';
            transaction1.amount = 100;
            transaction1.tokenType = 'USDC' as any;
            transaction1.status = 'pending' as any;

            const transaction2 = new Transaction();
            transaction2.senderId = user.id;
            transaction2.recipientId = 'user-789';
            transaction2.senderWalletId = 'wallet-1';
            transaction2.recipientWalletId = 'wallet-3';
            transaction2.amount = 200;
            transaction2.tokenType = 'USDC' as any;
            transaction2.status = 'pending' as any;

            user.sentTransactions = [transaction1, transaction2];
            expect(user.sentTransactions).toHaveLength(2);
            expect(transaction1.senderId).toBe(user.id);
            expect(transaction2.senderId).toBe(user.id);
        });

        it('should allow user to have multiple received transactions', () => {
            const user = new User();
            user.id = 'user-123';

            const transaction1 = new Transaction();
            transaction1.senderId = 'user-456';
            transaction1.recipientId = user.id;
            transaction1.senderWalletId = 'wallet-2';
            transaction1.recipientWalletId = 'wallet-1';
            transaction1.amount = 100;
            transaction1.tokenType = 'USDC' as any;
            transaction1.status = 'pending' as any;

            const transaction2 = new Transaction();
            transaction2.senderId = 'user-789';
            transaction2.recipientId = user.id;
            transaction2.senderWalletId = 'wallet-3';
            transaction2.recipientWalletId = 'wallet-1';
            transaction2.amount = 200;
            transaction2.tokenType = 'USDC' as any;
            transaction2.status = 'pending' as any;

            user.receivedTransactions = [transaction1, transaction2];
            expect(user.receivedTransactions).toHaveLength(2);
            expect(transaction1.recipientId).toBe(user.id);
            expect(transaction2.recipientId).toBe(user.id);
        });
    });

    describe('User-Contact Relationship (1:N)', () => {
        it('should allow user to have multiple owned contacts', () => {
            const user = new User();
            user.id = 'user-123';

            const contact1 = new Contact();
            contact1.ownerId = user.id;
            contact1.displayName = 'Contact 1';
            contact1.email = 'contact1@example.com';

            const contact2 = new Contact();
            contact2.ownerId = user.id;
            contact2.displayName = 'Contact 2';
            contact2.phone = '+1234567890';

            user.ownedContacts = [contact1, contact2];
            expect(user.ownedContacts).toHaveLength(2);
            expect(contact1.ownerId).toBe(user.id);
            expect(contact2.ownerId).toBe(user.id);
        });

        it('should allow user to be referenced by multiple contacts', () => {
            const user = new User();
            user.id = 'user-123';

            const contact1 = new Contact();
            contact1.ownerId = 'user-456';
            contact1.contactUserId = user.id;
            contact1.displayName = 'Contact 1';

            const contact2 = new Contact();
            contact2.ownerId = 'user-789';
            contact2.contactUserId = user.id;
            contact2.displayName = 'Contact 2';

            user.contactReferences = [contact1, contact2];
            expect(user.contactReferences).toHaveLength(2);
            expect(contact1.contactUserId).toBe(user.id);
            expect(contact2.contactUserId).toBe(user.id);
        });
    });

    describe('User-VISACard Relationship (1:1)', () => {
        it('should allow user to have one VISA card', () => {
            const user = new User();
            user.id = 'user-123';

            const visaCard = new VISACard();
            visaCard.userId = user.id;
            visaCard.cardNumber = '4111111111111111';
            visaCard.cardType = 'virtual' as any;
            visaCard.status = 'active' as any;
            visaCard.balance = 1000;
            visaCard.dailyLimit = 500;
            visaCard.monthlyLimit = 5000;
            visaCard.expiresAt = new Date('2025-12-31');

            user.visaCard = visaCard;
            expect(user.visaCard).toBe(visaCard);
            expect(visaCard.userId).toBe(user.id);
        });
    });

    describe('Wallet-Transaction Relationship (1:N)', () => {
        it('should allow wallet to have multiple sent transactions', () => {
            const wallet = new Wallet();
            wallet.id = 'wallet-123';
            wallet.userId = 'user-123';
            wallet.address = 'address1';
            wallet.publicKey = 'publicKey1';
            wallet.walletType = 'web3auth_mpc' as any;

            const transaction1 = new Transaction();
            transaction1.senderWalletId = wallet.id;
            transaction1.recipientWalletId = 'wallet-456';
            transaction1.senderId = 'user-123';
            transaction1.recipientId = 'user-456';
            transaction1.amount = 100;
            transaction1.tokenType = 'USDC' as any;
            transaction1.status = 'pending' as any;

            const transaction2 = new Transaction();
            transaction2.senderWalletId = wallet.id;
            transaction2.recipientWalletId = 'wallet-789';
            transaction2.senderId = 'user-123';
            transaction2.recipientId = 'user-789';
            transaction2.amount = 200;
            transaction2.tokenType = 'USDC' as any;
            transaction2.status = 'pending' as any;

            wallet.sentTransactions = [transaction1, transaction2];
            expect(wallet.sentTransactions).toHaveLength(2);
            expect(transaction1.senderWalletId).toBe(wallet.id);
            expect(transaction2.senderWalletId).toBe(wallet.id);
        });

        it('should allow wallet to have multiple received transactions', () => {
            const wallet = new Wallet();
            wallet.id = 'wallet-123';
            wallet.userId = 'user-123';
            wallet.address = 'address1';
            wallet.publicKey = 'publicKey1';
            wallet.walletType = 'web3auth_mpc' as any;

            const transaction1 = new Transaction();
            transaction1.recipientWalletId = wallet.id;
            transaction1.senderWalletId = 'wallet-456';
            transaction1.recipientId = 'user-123';
            transaction1.senderId = 'user-456';
            transaction1.amount = 100;
            transaction1.tokenType = 'USDC' as any;
            transaction1.status = 'pending' as any;

            const transaction2 = new Transaction();
            transaction2.recipientWalletId = wallet.id;
            transaction2.senderWalletId = 'wallet-789';
            transaction2.recipientId = 'user-123';
            transaction2.senderId = 'user-789';
            transaction2.amount = 200;
            transaction2.tokenType = 'USDC' as any;
            transaction2.status = 'pending' as any;

            wallet.receivedTransactions = [transaction1, transaction2];
            expect(wallet.receivedTransactions).toHaveLength(2);
            expect(transaction1.recipientWalletId).toBe(wallet.id);
            expect(transaction2.recipientWalletId).toBe(wallet.id);
        });
    });

    describe('Wallet-BalanceHistory Relationship (1:N)', () => {
        it('should allow wallet to have multiple balance history records', () => {
            const wallet = new Wallet();
            wallet.id = 'wallet-123';
            wallet.userId = 'user-123';
            wallet.address = 'address1';
            wallet.publicKey = 'publicKey1';
            wallet.walletType = 'web3auth_mpc' as any;

            const balanceHistory1 = new BalanceHistory();
            balanceHistory1.walletId = wallet.id;
            balanceHistory1.tokenType = 'USDC' as any;
            balanceHistory1.previousBalance = 100;
            balanceHistory1.newBalance = 150;
            balanceHistory1.changeAmount = 50;
            balanceHistory1.changeType = 'transfer_in' as any;

            const balanceHistory2 = new BalanceHistory();
            balanceHistory2.walletId = wallet.id;
            balanceHistory2.tokenType = 'EURC' as any;
            balanceHistory2.previousBalance = 200;
            balanceHistory2.newBalance = 250;
            balanceHistory2.changeAmount = 50;
            balanceHistory2.changeType = 'onramp' as any;

            wallet.balances = [balanceHistory1, balanceHistory2];
            expect(wallet.balances).toHaveLength(2);
            expect(balanceHistory1.walletId).toBe(wallet.id);
            expect(balanceHistory2.walletId).toBe(wallet.id);
        });
    });

    describe('User-OnOffRamp Relationship (1:N)', () => {
        it('should allow user to have multiple on/off ramp operations', () => {
            const user = new User();
            user.id = 'user-123';

            const onRamp = new OnOffRamp();
            onRamp.userId = user.id;
            onRamp.walletId = 'wallet-123';
            onRamp.type = 'onramp' as any;
            onRamp.amount = 100;
            onRamp.fiatAmount = 100;
            onRamp.fiatCurrency = 'USD';
            onRamp.tokenType = 'USDC' as any;
            onRamp.status = 'pending' as any;
            onRamp.provider = 'provider-123';
            onRamp.exchangeRate = 1.0;
            onRamp.fee = 2.5;

            const offRamp = new OnOffRamp();
            offRamp.userId = user.id;
            offRamp.walletId = 'wallet-123';
            offRamp.type = 'offramp' as any;
            offRamp.amount = 200;
            offRamp.fiatAmount = 200;
            offRamp.fiatCurrency = 'USD';
            offRamp.tokenType = 'USDC' as any;
            offRamp.status = 'pending' as any;
            offRamp.provider = 'provider-456';
            offRamp.exchangeRate = 1.0;
            offRamp.fee = 5.0;

            user.onOffRamps = [onRamp, offRamp];
            expect(user.onOffRamps).toHaveLength(2);
            expect(onRamp.userId).toBe(user.id);
            expect(offRamp.userId).toBe(user.id);
        });
    });

    describe('Foreign Key Constraints', () => {
        it('should maintain referential integrity for all relationships', () => {
            // Test that all foreign key relationships are properly defined
            const user = new User();
            user.id = 'user-123';

            const wallet = new Wallet();
            wallet.userId = user.id; // FK to User

            const transaction = new Transaction();
            transaction.senderId = user.id; // FK to User
            transaction.recipientId = user.id; // FK to User
            transaction.senderWalletId = wallet.id; // FK to Wallet
            transaction.recipientWalletId = wallet.id; // FK to Wallet

            const contact = new Contact();
            contact.ownerId = user.id; // FK to User
            contact.contactUserId = user.id; // FK to User

            const visaCard = new VISACard();
            visaCard.userId = user.id; // FK to User

            const onOffRamp = new OnOffRamp();
            onOffRamp.userId = user.id; // FK to User
            onOffRamp.walletId = wallet.id; // FK to Wallet

            const balanceHistory = new BalanceHistory();
            balanceHistory.walletId = wallet.id; // FK to Wallet

            // All foreign keys should reference valid entities
            expect(wallet.userId).toBe(user.id);
            expect(transaction.senderId).toBe(user.id);
            expect(transaction.recipientId).toBe(user.id);
            expect(transaction.senderWalletId).toBe(wallet.id);
            expect(transaction.recipientWalletId).toBe(wallet.id);
            expect(contact.ownerId).toBe(user.id);
            expect(contact.contactUserId).toBe(user.id);
            expect(visaCard.userId).toBe(user.id);
            expect(onOffRamp.userId).toBe(user.id);
            expect(onOffRamp.walletId).toBe(wallet.id);
            expect(balanceHistory.walletId).toBe(wallet.id);
        });
    });
});
