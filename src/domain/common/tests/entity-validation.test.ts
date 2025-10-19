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

describe('Entity Validation Tests', () => {
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

    describe('User Entity Validation', () => {
        it('should validate a valid user', async () => {
            const user = new User();
            user.email = 'test@example.com';
            user.firstName = 'John';
            user.lastName = 'Doe';
            user.language = 'en' as any;
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';
            user.isActive = true;
            user.verificationStatus = 'verified' as any;
            user.status = 'active' as any;

            const errors = await validate(user);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid email', async () => {
            const user = new User();
            user.email = 'invalid-email';
            user.authProvider = 'web3auth' as any;
            user.authProviderId = 'web3auth-123';

            const errors = await validate(user);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
        });

        it('should fail validation with missing required fields', async () => {
            const user = new User();

            const errors = await validate(user);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e) => e.property === 'authProvider')).toBe(
                true,
            );
            expect(errors.some((e) => e.property === 'authProviderId')).toBe(
                true,
            );
        });
    });

    describe('Wallet Entity Validation', () => {
        it('should validate a valid wallet', async () => {
            const wallet = new Wallet();
            wallet.userId = 'user-123';
            wallet.address =
                'SolanaAddress1234567890123456789012345678901234567890';
            wallet.publicKey =
                'PublicKey1234567890123456789012345678901234567890';
            wallet.walletType = 'web3auth_mpc' as any;
            wallet.isActive = true;
            wallet.status = 'active' as any;

            const errors = await validate(wallet);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid Solana address', async () => {
            const wallet = new Wallet();
            wallet.userId = 'user-123';
            wallet.address = 'invalid-address';
            wallet.publicKey =
                'PublicKey1234567890123456789012345678901234567890';
            wallet.walletType = 'web3auth_mpc' as any;

            const errors = await validate(wallet);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('address');
        });

        it('should fail validation with missing required fields', async () => {
            const wallet = new Wallet();

            const errors = await validate(wallet);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e) => e.property === 'userId')).toBe(true);
            expect(errors.some((e) => e.property === 'address')).toBe(true);
            expect(errors.some((e) => e.property === 'publicKey')).toBe(true);
            expect(errors.some((e) => e.property === 'walletType')).toBe(true);
        });
    });

    describe('Transaction Entity Validation', () => {
        it('should validate a valid transaction', async () => {
            const transaction = new Transaction();
            transaction.senderId = 'user-123';
            transaction.recipientId = 'user-456';
            transaction.senderWalletId = 'wallet-123';
            transaction.recipientWalletId = 'wallet-456';
            transaction.amount = 100.5;
            transaction.tokenType = 'USDC' as any;
            transaction.status = 'pending' as any;
            transaction.fee = 0.01;

            const errors = await validate(transaction);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with negative amount', async () => {
            const transaction = new Transaction();
            transaction.senderId = 'user-123';
            transaction.recipientId = 'user-456';
            transaction.senderWalletId = 'wallet-123';
            transaction.recipientWalletId = 'wallet-456';
            transaction.amount = -100.5;
            transaction.tokenType = 'USDC' as any;
            transaction.status = 'pending' as any;
            transaction.fee = 0.01;

            const errors = await validate(transaction);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('amount');
        });

        it('should fail validation with invalid token type', async () => {
            const transaction = new Transaction();
            transaction.senderId = 'user-123';
            transaction.recipientId = 'user-456';
            transaction.senderWalletId = 'wallet-123';
            transaction.recipientWalletId = 'wallet-456';
            transaction.amount = 100.5;
            transaction.tokenType = 'INVALID' as any;
            transaction.status = 'pending' as any;
            transaction.fee = 0.01;

            const errors = await validate(transaction);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('tokenType');
        });
    });

    describe('Contact Entity Validation', () => {
        it('should validate a valid contact', async () => {
            const contact = new Contact();
            contact.ownerId = 'user-123';
            contact.displayName = 'John Doe';
            contact.email = 'john@example.com';
            contact.phone = '+1234567890';
            contact.walletAddress =
                'SolanaAddress1234567890123456789012345678901234567890';
            contact.isAppUser = true;

            const errors = await validate(contact);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid email', async () => {
            const contact = new Contact();
            contact.ownerId = 'user-123';
            contact.displayName = 'John Doe';
            contact.email = 'invalid-email';

            const errors = await validate(contact);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('email');
        });

        it('should fail validation with invalid phone number', async () => {
            const contact = new Contact();
            contact.ownerId = 'user-123';
            contact.displayName = 'John Doe';
            contact.phone = 'invalid-phone';

            const errors = await validate(contact);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('phone');
        });
    });

    describe('VISA Card Entity Validation', () => {
        it('should validate a valid VISA card', async () => {
            const visaCard = new VISACard();
            visaCard.userId = 'user-123';
            visaCard.cardNumber = '4111111111111111'; // Valid test card number
            visaCard.cardType = 'virtual' as any;
            visaCard.status = 'active' as any;
            visaCard.balance = 1000.0;
            visaCard.dailyLimit = 500.0;
            visaCard.monthlyLimit = 5000.0;
            visaCard.expiresAt = new Date('2025-12-31');

            const errors = await validate(visaCard);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid card number', async () => {
            const visaCard = new VISACard();
            visaCard.userId = 'user-123';
            visaCard.cardNumber = '1234567890123456'; // Invalid card number
            visaCard.cardType = 'virtual' as any;
            visaCard.status = 'active' as any;
            visaCard.balance = 1000.0;
            visaCard.dailyLimit = 500.0;
            visaCard.monthlyLimit = 5000.0;
            visaCard.expiresAt = new Date('2025-12-31');

            const errors = await validate(visaCard);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('cardNumber');
        });

        it('should fail validation with negative balance', async () => {
            const visaCard = new VISACard();
            visaCard.userId = 'user-123';
            visaCard.cardNumber = '4111111111111111';
            visaCard.cardType = 'virtual' as any;
            visaCard.status = 'active' as any;
            visaCard.balance = -1000.0;
            visaCard.dailyLimit = 500.0;
            visaCard.monthlyLimit = 5000.0;
            visaCard.expiresAt = new Date('2025-12-31');

            const errors = await validate(visaCard);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('balance');
        });
    });

    describe('OnOffRamp Entity Validation', () => {
        it('should validate a valid onramp', async () => {
            const onOffRamp = new OnOffRamp();
            onOffRamp.userId = 'user-123';
            onOffRamp.walletId = 'wallet-123';
            onOffRamp.type = 'onramp' as any;
            onOffRamp.amount = 100.5;
            onOffRamp.fiatAmount = 100.0;
            onOffRamp.fiatCurrency = 'USD';
            onOffRamp.tokenType = 'USDC' as any;
            onOffRamp.status = 'pending' as any;
            onOffRamp.provider = 'provider-123';
            onOffRamp.exchangeRate = 1.0;
            onOffRamp.fee = 2.5;

            const errors = await validate(onOffRamp);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid fiat currency', async () => {
            const onOffRamp = new OnOffRamp();
            onOffRamp.userId = 'user-123';
            onOffRamp.walletId = 'wallet-123';
            onOffRamp.type = 'onramp' as any;
            onOffRamp.amount = 100.5;
            onOffRamp.fiatAmount = 100.0;
            onOffRamp.fiatCurrency = 'INVALID';
            onOffRamp.tokenType = 'USDC' as any;
            onOffRamp.status = 'pending' as any;
            onOffRamp.provider = 'provider-123';
            onOffRamp.exchangeRate = 1.0;
            onOffRamp.fee = 2.5;

            const errors = await validate(onOffRamp);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('fiatCurrency');
        });

        it('should fail validation with negative amount', async () => {
            const onOffRamp = new OnOffRamp();
            onOffRamp.userId = 'user-123';
            onOffRamp.walletId = 'wallet-123';
            onOffRamp.type = 'onramp' as any;
            onOffRamp.amount = -100.5;
            onOffRamp.fiatAmount = 100.0;
            onOffRamp.fiatCurrency = 'USD';
            onOffRamp.tokenType = 'USDC' as any;
            onOffRamp.status = 'pending' as any;
            onOffRamp.provider = 'provider-123';
            onOffRamp.exchangeRate = 1.0;
            onOffRamp.fee = 2.5;

            const errors = await validate(onOffRamp);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('amount');
        });
    });

    describe('BalanceHistory Entity Validation', () => {
        it('should validate a valid balance history record', async () => {
            const balanceHistory = new BalanceHistory();
            balanceHistory.walletId = 'wallet-123';
            balanceHistory.tokenType = 'USDC' as any;
            balanceHistory.previousBalance = 100.0;
            balanceHistory.newBalance = 150.0;
            balanceHistory.changeAmount = 50.0;
            balanceHistory.changeType = 'transfer_in' as any;

            const errors = await validate(balanceHistory);
            expect(errors).toHaveLength(0);
        });

        it('should fail validation with negative previous balance', async () => {
            const balanceHistory = new BalanceHistory();
            balanceHistory.walletId = 'wallet-123';
            balanceHistory.tokenType = 'USDC' as any;
            balanceHistory.previousBalance = -100.0;
            balanceHistory.newBalance = 150.0;
            balanceHistory.changeAmount = 50.0;
            balanceHistory.changeType = 'transfer_in' as any;

            const errors = await validate(balanceHistory);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('previousBalance');
        });

        it('should fail validation with invalid change type', async () => {
            const balanceHistory = new BalanceHistory();
            balanceHistory.walletId = 'wallet-123';
            balanceHistory.tokenType = 'USDC' as any;
            balanceHistory.previousBalance = 100.0;
            balanceHistory.newBalance = 150.0;
            balanceHistory.changeAmount = 50.0;
            balanceHistory.changeType = 'invalid_type' as any;

            const errors = await validate(balanceHistory);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('changeType');
        });
    });
});
