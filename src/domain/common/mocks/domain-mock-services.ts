import { Injectable } from '@nestjs/common';
import { IUserService } from '../../user/interfaces/user-service.interface';
import { IWalletService } from '../../wallet/interfaces/wallet-service.interface';
import { IWalletBalanceService } from '../../wallet/interfaces/wallet-balance-service.interface';
import {
    TransactionHistoryFilters,
    TransactionService as ITransactionService,
} from '../../transaction/interfaces/transaction-service.interface';
// import { IOnRampService } from '../../onramp/interfaces/onramp-service.interface'; // Removed - interface deleted
import { IContactService } from '../../contact/interfaces/contact-service.interface';
import { IVISACardService } from '../../visa-card/interfaces/visa-card-service.interface';
import { User } from '../../user/entities/user.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { OnOffRamp } from '../../onramp/entities/onoff-ramp.entity';
import { Contact } from '../../contact/entities/contact.entity';
import {
    VISACard,
    CardStatus,
} from '../../visa-card/entities/visa-card.entity';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { CreateWalletDto } from '../../wallet/dto/wallet.dto';
import { CreateTransactionDto } from '../../transaction/dto/create-transaction.dto';
import { CreateOnRampDto } from '../../onramp/dto/create-onramp.dto';
import { CreateContactDto } from '../../contact/dto/create-contact.dto';
import { CreateVisaCardDto } from '../../visa-card/dto/create-visa-card.dto';
import { UpdateVisaCardDto } from '../../visa-card/dto/update-visa-card.dto';
import {
    UserStatus,
    UserVerificationStatus,
} from '../../user/entities/user.entity';
import { WalletType } from '../../wallet/entities/wallet.entity';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { RampStatus, RampType } from '../../onramp/entities/onoff-ramp.entity';
import { TokenType } from '../enums/token-type.enum';

/**
 * Mock User Service
 *
 * @description Mock implementation of IUserService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockUserService implements IUserService {
    private users: Map<string, User> = new Map();
    private nextId = 1;

    async create(createUserDto: CreateUserDto): Promise<User> {
        const user = new User();
        user.id = `user-${this.nextId++}`;
        user.email = createUserDto.email;
        user.firstName = createUserDto.firstName;
        user.lastName = createUserDto.lastName;
        user.phone = createUserDto.phone;
        user.authProvider = createUserDto.authProvider;
        user.authProviderId = createUserDto.authProviderId;
        user.language = createUserDto.language;
        user.verificationStatus =
            createUserDto.verificationStatus ||
            UserVerificationStatus.PENDING_VERIFICATION;
        user.status = createUserDto.status || UserStatus.PENDING_VERIFICATION;
        user.createdAt = new Date();
        user.updatedAt = new Date();

        this.users.set(user.id, user);
        return user;
    }

    async findOne(id: string): Promise<User> {
        const user = this.users.get(id);
        if (!user) {
            throw new Error(`User not found: ${id}`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    async findByAuthProvider(
        provider: string,
        providerId: string,
    ): Promise<User | null> {
        for (const user of this.users.values()) {
            if (
                user.authProvider === provider &&
                user.authProviderId === providerId
            ) {
                return user;
            }
        }
        return null;
    }

    async suspend(id: string): Promise<User> {
        const user = this.users.get(id);
        if (!user) {
            throw new Error(`User not found: ${id}`);
        }
        user.isActive = false;
        user.updatedAt = new Date();
        return user;
    }

    async activate(id: string): Promise<User> {
        const user = this.users.get(id);
        if (!user) {
            throw new Error(`User not found: ${id}`);
        }
        user.isActive = true;
        user.updatedAt = new Date();
        return user;
    }

    async updateLastLogin(id: string): Promise<void> {
        const user = this.users.get(id);
        if (!user) {
            throw new Error(`User not found: ${id}`);
        }
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();
    }

    async getUsersByStatus(status: string): Promise<User[]> {
        return Array.from(this.users.values()).filter(
            (user) => user.verificationStatus === status,
        );
    }

    async findByPhone(phone: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.phone === phone) {
                return user;
            }
        }
        return null;
    }

    async findByPhones(phones: string[]): Promise<User[]> {
        if (!phones?.length) {
            return [];
        }

        const normalized = Array.from(
            new Set(
                phones
                    .filter((phone) => typeof phone === 'string')
                    .map((phone) => phone.trim())
                    .filter(Boolean),
            ),
        );

        if (!normalized.length) {
            return [];
        }

        return Array.from(this.users.values()).filter(
            (user) =>
                !!user.phone &&
                normalized.some(
                    (phone) => phone.toLowerCase() === user.phone?.toLowerCase(),
                ),
        );
    }

    async update(id: string, updateData: Partial<User>): Promise<User> {
        const user = this.users.get(id);
        if (!user) {
            throw new Error(`User not found: ${id}`);
        }

        Object.assign(user, updateData);
        user.updatedAt = new Date();
        this.users.set(id, user);
        return user;
    }

    async remove(id: string): Promise<void> {
        this.users.delete(id);
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    // Helper methods for testing
    clear(): void {
        this.users.clear();
        this.nextId = 1;
    }

    getUsers(): User[] {
        return Array.from(this.users.values());
    }
}

/**
 * Mock Wallet Service
 *
 * @description Mock implementation of IWalletService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockWalletService {
    private wallets: Map<string, Wallet> = new Map();
    private nextId = 1;

    async create(
        userId: string,
        address: string,
        publicKey: string,
        walletAddresses?: {
            ed25519_app_key?: string;
            ed25519_threshold_key?: string;
            secp256k1_app_key?: string;
            secp256k1_threshold_key?: string;
        },
    ): Promise<Wallet> {
        const wallet = new Wallet();
        wallet.id = `wallet-${this.nextId++}`;
        wallet.userId = userId;
        wallet.address = address;
        wallet.publicKey = publicKey;
        wallet.walletType = WalletType.PARA;
        wallet.walletAddresses = walletAddresses;
        wallet.status = WalletStatus.ACTIVE;
        wallet.createdAt = new Date();
        wallet.updatedAt = new Date();

        this.wallets.set(wallet.id, wallet);
        return wallet;
    }

    async findOne(id: string): Promise<Wallet> {
        const wallet = this.wallets.get(id);
        if (!wallet) {
            throw new Error(`Wallet not found: ${id}`);
        }
        return wallet;
    }

    async findByAddress(address: string): Promise<Wallet | null> {
        for (const wallet of this.wallets.values()) {
            if (wallet.address === address) {
                return wallet;
            }
        }
        return null;
    }

    async findByUserId(userId: string): Promise<Wallet | null> {
        const userWallets = Array.from(this.wallets.values()).filter(
            (w) => w.userId === userId,
        );
        return userWallets.length > 0 ? userWallets[0] : null;
    }

    async findAllByUserId(userId: string): Promise<Wallet[]> {
        return Array.from(this.wallets.values()).filter(
            (w) => w.userId === userId,
        );
    }

    async findAll(): Promise<Wallet[]> {
        return Array.from(this.wallets.values());
    }

    async suspend(id: string): Promise<Wallet> {
        const wallet = this.wallets.get(id);
        if (!wallet) {
            throw new Error(`Wallet not found: ${id}`);
        }
        wallet.isActive = false;
        wallet.updatedAt = new Date();
        return wallet;
    }

    async activate(id: string): Promise<Wallet> {
        const wallet = this.wallets.get(id);
        if (!wallet) {
            throw new Error(`Wallet not found: ${id}`);
        }
        wallet.isActive = true;
        wallet.updatedAt = new Date();
        return wallet;
    }

    async updateWalletAddresses(
        id: string,
        walletAddresses: any,
    ): Promise<Wallet> {
        const wallet = this.wallets.get(id);
        if (!wallet) {
            throw new Error(`Wallet not found: ${id}`);
        }
        wallet.walletAddresses = walletAddresses;
        wallet.updatedAt = new Date();
        return wallet;
    }

    async findPrimaryByUserId(userId: string): Promise<Wallet | null> {
        const userWallets = Array.from(this.wallets.values()).filter(
            (w) => w.userId === userId,
        );
        return userWallets[0] || null; // For MVP: first wallet is primary
    }

    async setAsPrimary(walletId: string, userId: string): Promise<Wallet> {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet not found: ${walletId}`);
        }

        // For MVP: Each user has only one wallet, so it's always primary
        wallet.updatedAt = new Date();
        return wallet;
    }

    async deactivate(walletId: string, userId: string): Promise<Wallet> {
        const wallet = this.wallets.get(walletId);
        if (!wallet) {
            throw new Error(`Wallet not found: ${walletId}`);
        }
        wallet.isActive = false;
        wallet.updatedAt = new Date();
        return wallet;
    }

    async update(id: string, updateData: Partial<Wallet>): Promise<Wallet> {
        const wallet = this.wallets.get(id);
        if (!wallet) {
            throw new Error(`Wallet not found: ${id}`);
        }

        Object.assign(wallet, updateData);
        wallet.updatedAt = new Date();
        this.wallets.set(id, wallet);
        return wallet;
    }

    async remove(id: string): Promise<void> {
        this.wallets.delete(id);
    }

    // Helper methods for testing
    clear(): void {
        this.wallets.clear();
        this.nextId = 1;
    }

    getWallets(): Wallet[] {
        return Array.from(this.wallets.values());
    }
}

/**
 * Mock Wallet Balance Service
 *
 * @description Mock implementation of IWalletBalanceService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockWalletBalanceService implements IWalletBalanceService {
    private balances: Map<string, WalletBalance> = new Map();
    private nextId = 1;

    async create(
        walletId: string,
        tokenType: TokenType,
        balance: number,
    ): Promise<WalletBalance> {
        const walletBalance = new WalletBalance();
        walletBalance.id = `balance-${this.nextId++}`;
        walletBalance.walletId = walletId;
        walletBalance.tokenType = tokenType;
        walletBalance.balance = balance;
        walletBalance.lastUpdated = new Date();
        walletBalance.createdAt = new Date();
        walletBalance.updatedAt = new Date();

        this.balances.set(walletBalance.id, walletBalance);
        return walletBalance;
    }

    async findOne(id: string): Promise<WalletBalance | null> {
        return this.balances.get(id) || null;
    }

    async findByWalletId(walletId: string): Promise<WalletBalance[]> {
        return Array.from(this.balances.values()).filter(
            (b) => b.walletId === walletId,
        );
    }

    async findByWalletIdAndTokenType(
        walletId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance | null> {
        for (const balance of this.balances.values()) {
            if (
                balance.walletId === walletId &&
                balance.tokenType === tokenType
            ) {
                return balance;
            }
        }
        return null;
    }

    async getAllBalances(walletId: string): Promise<WalletBalance[]> {
        return this.findByWalletId(walletId);
    }

    async getBalance(walletId: string, tokenType: TokenType): Promise<number> {
        for (const balance of this.balances.values()) {
            if (
                balance.walletId === walletId &&
                balance.tokenType === tokenType
            ) {
                return parseFloat(balance.balance.toString());
            }
        }
        return 0;
    }

    async updateBalance(
        walletId: string,
        tokenType: TokenType,
        newBalance: number,
    ): Promise<WalletBalance> {
        const balance = await this.findByWalletIdAndTokenType(
            walletId,
            tokenType,
        );
        if (!balance) {
            return this.create(walletId, tokenType, newBalance);
        }

        balance.balance = newBalance;
        balance.lastUpdated = new Date();
        balance.updatedAt = new Date();
        this.balances.set(balance.id, balance);
        return balance;
    }

    async getBalanceFromDatabase(
        walletId: string,
        tokenType: TokenType,
    ): Promise<number> {
        return this.getBalance(walletId, tokenType);
    }

    async getAllBalancesFromDatabase(
        walletId: string,
    ): Promise<WalletBalance[]> {
        return this.getAllBalances(walletId);
    }

    async addBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        const currentBalance = await this.getBalance(walletId, tokenType);
        return this.setBalance(walletId, tokenType, currentBalance + amount);
    }

    async subtractBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        const currentBalance = await this.getBalance(walletId, tokenType);
        return this.setBalance(walletId, tokenType, currentBalance - amount);
    }

    async setBalance(
        walletId: string,
        tokenType: TokenType,
        amount: number,
    ): Promise<WalletBalance> {
        return this.updateBalance(walletId, tokenType, amount);
    }

    async initializeWalletBalances(walletId: string): Promise<void> {
        // Initialize with all supported token types
        const tokenTypes = Object.values(TokenType);
        for (const tokenType of tokenTypes) {
            await this.create(walletId, tokenType, 0);
        }
    }

    async syncBalanceWithBlockchain(
        walletId: string,
        tokenType: TokenType,
    ): Promise<WalletBalance> {
        // Mock blockchain sync - in real implementation, this would call Solana
        const mockBlockchainBalance = Math.random() * 1000;
        return this.updateBalanceFromBlockchain(
            walletId,
            tokenType,
            mockBlockchainBalance,
        );
    }

    async syncAllBalancesWithBlockchain(
        walletId: string,
    ): Promise<WalletBalance[]> {
        const tokenTypes = Object.values(TokenType);
        const results: WalletBalance[] = [];
        for (const tokenType of tokenTypes) {
            const balance = await this.syncBalanceWithBlockchain(
                walletId,
                tokenType,
            );
            results.push(balance);
        }
        return results;
    }

    async updateBalanceFromBlockchain(
        walletId: string,
        tokenType: TokenType,
        blockchainBalance: number,
    ): Promise<WalletBalance> {
        return this.updateBalance(walletId, tokenType, blockchainBalance);
    }

    // Helper methods for testing
    clear(): void {
        this.balances.clear();
        this.nextId = 1;
    }

    getBalances(): WalletBalance[] {
        return Array.from(this.balances.values());
    }
}

/**
 * Mock Transaction Service
 *
 * @description Mock implementation of ITransactionService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockTransactionService implements ITransactionService {
    private transactions: Map<string, Transaction> = new Map();
    private nextId = 1;

    async createTransaction(request: any): Promise<any> {
        const transaction = new Transaction();
        transaction.id = `tx-${this.nextId++}`;
        transaction.senderId = request.fromUserId;
        transaction.recipientId = request.toUserId;
        transaction.amount = request.amount.toString();
        transaction.tokenType = request.token;
        transaction.status = TransactionStatus.PENDING;
        transaction.description = request.description;
        transaction.createdAt = new Date();

        this.transactions.set(transaction.id, transaction);

        return {
            transactionId: transaction.id,
            status: 'pending',
            createdAt: transaction.createdAt,
        };
    }

    async getTransaction(
        transactionId: string,
        currentUserId?: string,
    ): Promise<any> {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) return null;

        const direction =
            currentUserId && transaction.recipientId === currentUserId
                ? 'incoming'
                : currentUserId && transaction.senderId === currentUserId
                  ? 'outgoing'
                  : undefined;

        return {
            transactionId: transaction.id,
            fromUserId: transaction.senderId,
            toUserId: transaction.recipientId,
            amount: BigInt(transaction.amount),
            token: transaction.tokenType,
            status: transaction.status,
            createdAt: transaction.createdAt,
            completedAt: (transaction as any).completedAt,
            direction,
            isIncoming: direction === 'incoming',
        };
    }

    async getTransactionHistory(
        userId: string,
        filters: TransactionHistoryFilters = {},
    ): Promise<any[]> {
        const { limit = 50, offset = 0, token } = filters;
        const userTransactions = Array.from(this.transactions.values()).filter(
            (t) => t.senderId === userId || t.recipientId === userId,
        );

        const filtered = token
            ? userTransactions.filter((t) => t.tokenType === token)
            : userTransactions;

        const slice = filtered.slice(offset, offset + limit);
        return Promise.all(
            slice.map((t) => this.getTransaction(t.id, userId)),
        );
    }

    async getSentTransactions(
        userId: string,
        limit?: number,
        offset?: number,
    ): Promise<any[]> {
        const sentTransactions = Array.from(this.transactions.values()).filter(
            (t) => t.senderId === userId,
        );

        return sentTransactions
            .slice(offset || 0, (offset || 0) + (limit || 50))
            .map((t) => this.getTransaction(t.id, userId));
    }

    async getReceivedTransactions(
        userId: string,
        limit?: number,
        offset?: number,
    ): Promise<any[]> {
        const receivedTransactions = Array.from(
            this.transactions.values(),
        ).filter((t) => t.recipientId === userId);

        return receivedTransactions
            .slice(offset || 0, (offset || 0) + (limit || 50))
            .map((t) => this.getTransaction(t.id, userId));
    }

    async updateTransactionStatus(
        transactionId: string,
        status: string,
        signature?: string,
        error?: string,
    ): Promise<void> {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            transaction.status = status as any;
            if (signature) transaction.solanaTransactionHash = signature;
            if (error) transaction.failureReason = error;
            if (status === 'completed' || status === 'failed') {
                (transaction as any).completedAt = new Date();
            }
        }
    }

    async validateTransaction(
        request: any,
    ): Promise<{ isValid: boolean; errors: string[] }> {
        return { isValid: true, errors: [] };
    }

    async checkBalance(
        userId: string,
        amount: bigint,
        token: string,
    ): Promise<{ hasBalance: boolean; currentBalance: bigint }> {
        return { hasBalance: true, currentBalance: BigInt(1000000) };
    }

    async processPendingTransactions(): Promise<void> {
        // Mock implementation
    }

    async create(
        createTransactionDto: CreateTransactionDto,
    ): Promise<Transaction> {
        const transaction = new Transaction();
        transaction.id = `tx-${this.nextId++}`;
        transaction.senderId = 'mock-sender-id'; // Mock sender ID
        transaction.recipientId = createTransactionDto.recipientId || '';
        transaction.senderWalletId = 'mock-sender-wallet-id'; // Mock sender wallet ID
        transaction.recipientWalletId = 'mock-recipient-wallet-id'; // Mock recipient wallet ID
        transaction.amount = createTransactionDto.amount;
        transaction.tokenType = createTransactionDto.tokenType;
        transaction.status = TransactionStatus.PENDING;
        transaction.createdAt = new Date();
        // transaction.updatedAt = new Date(); // Property doesn't exist in entity

        this.transactions.set(transaction.id, transaction);
        return transaction;
    }

    async findOne(id: string): Promise<Transaction> {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            throw new Error(`Transaction not found: ${id}`);
        }
        return transaction;
    }

    async findByUser(userId: string): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) => t.senderId === userId || t.recipientId === userId,
        );
    }

    async findAll(): Promise<Transaction[]> {
        return Array.from(this.transactions.values());
    }

    async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) => t.status === status,
        );
    }

    async cancelTransaction(id: string, userId: string): Promise<Transaction> {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            throw new Error(`Transaction not found: ${id}`);
        }
        if (transaction.senderId !== userId) {
            throw new Error(
                `User ${userId} is not authorized to cancel this transaction`,
            );
        }
        transaction.status = TransactionStatus.CANCELLED;
        // transaction.updatedAt = new Date(); // Property doesn't exist in entity
        return transaction;
    }

    async findConfirmedTransactions(): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) => t.status === TransactionStatus.CONFIRMED,
        );
    }

    async findFailedTransactions(): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) => t.status === TransactionStatus.FAILED,
        );
    }

    async findByWallet(walletId: string): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) =>
                t.senderWalletId === walletId ||
                t.recipientWalletId === walletId,
        );
    }

    async findPendingTransactions(): Promise<Transaction[]> {
        return Array.from(this.transactions.values()).filter(
            (t) => t.status === TransactionStatus.PENDING,
        );
    }

    async confirmTransaction(
        id: string,
        solanaTransactionHash: string,
    ): Promise<Transaction> {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            throw new Error(`Transaction not found: ${id}`);
        }

        transaction.status = TransactionStatus.CONFIRMED;
        transaction.solanaTransactionHash = solanaTransactionHash;
        // transaction.updatedAt = new Date(); // Property doesn't exist in entity
        this.transactions.set(id, transaction);
        return transaction;
    }

    async failTransaction(
        id: string,
        errorMessage: string,
    ): Promise<Transaction> {
        const transaction = this.transactions.get(id);
        if (!transaction) {
            throw new Error(`Transaction not found: ${id}`);
        }

        transaction.status = TransactionStatus.FAILED;
        // transaction.errorMessage = errorMessage; // Property doesn't exist in entity
        // transaction.updatedAt = new Date(); // Property doesn't exist in entity
        this.transactions.set(id, transaction);
        return transaction;
    }

    async getTransactionStats(userId: string): Promise<{
        totalSent: bigint;
        totalReceived: bigint;
        transactionCount: number;
        successRate: number;
    }> {
        const userTransactions = await this.findByUser(userId);

        // Calculate stats
        const sentTransactions = userTransactions.filter(
            (t) => t.senderId === userId,
        );
        const receivedTransactions = userTransactions.filter(
            (t) => t.recipientId === userId,
        );
        const completedTransactions = userTransactions.filter(
            (t) => t.status === ('completed' as any),
        );

        const totalSent = sentTransactions.reduce(
            (sum, t) => sum + BigInt(t.amount.toString()),
            BigInt(0),
        );
        const totalReceived = receivedTransactions.reduce(
            (sum, t) => sum + BigInt(t.amount.toString()),
            BigInt(0),
        );

        const successRate =
            userTransactions.length > 0
                ? (completedTransactions.length / userTransactions.length) * 100
                : 0;

        return {
            totalSent,
            totalReceived,
            transactionCount: userTransactions.length,
            successRate,
        };
    }

    // Helper methods for testing
    clear(): void {
        this.transactions.clear();
        this.nextId = 1;
    }

    getTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }
}

/**
 * Mock OnRamp Service - REMOVED
 *
 * @description This class was removed as we now use the new OnRampService implementation.
 * The new service provides proper database integration and follows the new architecture.
 */
@Injectable()
export class MockOnRampService {
    // This class is a stub - the actual implementation is in OnRampService
    constructor() {
        // Stub implementation
    }
}

/**
 * Mock Contact Service
 *
 * @description Mock implementation of IContactService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockContactService implements IContactService {
    private contacts: Map<string, Contact> = new Map();
    private nextId = 1;

    async create(createContactDto: CreateContactDto): Promise<Contact> {
        const contact = new Contact();
        contact.id = `contact-${this.nextId++}`;
        contact.ownerId = createContactDto.ownerId;
        contact.contactUserId = createContactDto.contactUserId;
        contact.email = createContactDto.email;
        contact.phone = createContactDto.phone;
        contact.displayName = createContactDto.displayName;
        contact.walletAddress = createContactDto.walletAddress;
        contact.isAppUser = createContactDto.isAppUser || false;
        contact.createdAt = new Date();
        contact.updatedAt = new Date();

        this.contacts.set(contact.id, contact);
        return contact;
    }

    async findOne(id: string): Promise<Contact> {
        const contact = this.contacts.get(id);
        if (!contact) {
            throw new Error(`Contact not found: ${id}`);
        }
        return contact;
    }

    async findByOwnerId(ownerId: string): Promise<Contact[]> {
        return Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId,
        );
    }

    async findAll(ownerId: string): Promise<Contact[]> {
        return Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId,
        );
    }

    async findByWalletAddress(
        ownerId: string,
        walletAddress: string,
    ): Promise<Contact | null> {
        for (const contact of this.contacts.values()) {
            if (
                contact.ownerId === ownerId &&
                contact.walletAddress === walletAddress
            ) {
                return contact;
            }
        }
        return null;
    }

    async searchContacts(
        ownerId: string,
        searchTerm: string,
    ): Promise<Contact[]> {
        return Array.from(this.contacts.values()).filter(
            (c) =>
                c.ownerId === ownerId &&
                (c.displayName
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.phone?.toLowerCase().includes(searchTerm.toLowerCase())),
        );
    }

    async getAppUserContacts(ownerId: string): Promise<Contact[]> {
        return Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId && c.isAppUser,
        );
    }

    async getNonAppUserContacts(ownerId: string): Promise<Contact[]> {
        return Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId && !c.isAppUser,
        );
    }

    async findByEmail(ownerId: string, email: string): Promise<Contact | null> {
        for (const contact of this.contacts.values()) {
            if (contact.ownerId === ownerId && contact.email === email) {
                return contact;
            }
        }
        return null;
    }

    async findByPhone(ownerId: string, phone: string): Promise<Contact | null> {
        for (const contact of this.contacts.values()) {
            if (contact.ownerId === ownerId && contact.phone === phone) {
                return contact;
            }
        }
        return null;
    }

    async validatePhoneNumbers(phoneNumbers: string[]): Promise<string[]> {
        if (!phoneNumbers?.length) {
            return [];
        }

        const normalized = Array.from(
            new Set(
                phoneNumbers
                    .filter((phone) => typeof phone === 'string')
                    .map((phone) => phone.trim())
                    .filter(Boolean),
            ),
        );

        if (!normalized.length) {
            return [];
        }

        const existingPhones = new Set(
            Array.from(this.contacts.values())
                .map((contact) => contact.phone)
                .filter(Boolean) as string[],
        );

        return normalized.filter((phone) =>
            Array.from(existingPhones).some(
                (stored) => stored.toLowerCase() === phone.toLowerCase(),
            ),
        );
    }

    async getUsersByPhoneNumbers(
        phoneNumbers: string[],
    ): Promise<
        Array<{
            id: string;
            name: string | null;
            phone: string | null;
            email: string | null;
            blockchainAddress: string | null;
            isVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
        }>
    > {
        if (!phoneNumbers?.length) {
            return [];
        }

        const normalized = Array.from(
            new Set(
                phoneNumbers
                    .filter((phone) => typeof phone === 'string')
                    .map((phone) => phone.trim())
                    .filter(Boolean),
            ),
        );

        if (!normalized.length) {
            return [];
        }

        const results: {
            id: string;
            name: string | null;
            phone: string | null;
            email: string | null;
            blockchainAddress: string | null;
            isVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[] = [];

        const contactsByPhone = new Map(
            Array.from(this.contacts.values())
                .filter((contact) => contact.phone)
                .map((contact) => [contact.phone!.toLowerCase(), contact]),
        );

        for (const phone of normalized) {
            const contact = contactsByPhone.get(phone.toLowerCase());
            if (!contact) {
                continue;
            }

            results.push({
                id: contact.contactUserId || contact.id,
                name:
                    contact.displayName ||
                    contact.email ||
                    contact.phone ||
                    null,
                phone: contact.phone || null,
                email: contact.email || null,
                blockchainAddress: contact.walletAddress || null,
                isVerified: !!contact.isAppUser,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
            });
        }

        return results;
    }

    async syncWithAppUsers(ownerId: string): Promise<Contact[]> {
        // Mock implementation - in real app, this would sync with user database
        const contacts = Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId,
        );
        contacts.forEach((contact) => {
            // Mock: if contact has email, mark as app user
            if (contact.email) {
                contact.isAppUser = true;
            }
        });
        return contacts;
    }

    async getContactStats(ownerId: string): Promise<{
        totalContacts: number;
        appUserContacts: number;
        nonAppUserContacts: number;
    }> {
        const contacts = Array.from(this.contacts.values()).filter(
            (c) => c.ownerId === ownerId,
        );
        const appUserContacts = contacts.filter((c) => c.isAppUser).length;
        const nonAppUserContacts = contacts.filter((c) => !c.isAppUser).length;

        return {
            totalContacts: contacts.length,
            appUserContacts,
            nonAppUserContacts,
        };
    }

    async update(id: string, updateData: Partial<Contact>): Promise<Contact> {
        const contact = this.contacts.get(id);
        if (!contact) {
            throw new Error(`Contact not found: ${id}`);
        }

        Object.assign(contact, updateData);
        contact.updatedAt = new Date();
        this.contacts.set(id, contact);
        return contact;
    }

    async remove(id: string): Promise<void> {
        this.contacts.delete(id);
    }

    // Helper methods for testing
    clear(): void {
        this.contacts.clear();
        this.nextId = 1;
    }

    getContacts(): Contact[] {
        return Array.from(this.contacts.values());
    }
}

/**
 * Mock VISA Card Service
 *
 * @description Mock implementation of IVISACardService for testing purposes.
 * Provides in-memory storage and basic CRUD operations.
 */
@Injectable()
export class MockVISACardService implements IVISACardService {
    private visaCards: Map<string, VISACard> = new Map();
    private nextId = 1;

    async create(createVisaCardDto: CreateVisaCardDto): Promise<VISACard> {
        const visaCard = new VISACard();
        visaCard.id = `visa-${this.nextId++}`;
        visaCard.userId = createVisaCardDto.userId;
        visaCard.cardNumber = createVisaCardDto.cardNumber;
        visaCard.cardType = createVisaCardDto.cardType;
        visaCard.status = CardStatus.PENDING;
        visaCard.balance = 0;
        visaCard.dailyLimit = 1000;
        visaCard.monthlyLimit = 10000;
        visaCard.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        visaCard.createdAt = new Date();
        // visaCard.updatedAt = new Date(); // Property doesn't exist in entity

        this.visaCards.set(visaCard.id, visaCard);
        return visaCard;
    }

    async findOne(id: string): Promise<VISACard> {
        const visaCard = this.visaCards.get(id);
        if (!visaCard) {
            throw new Error(`VISACard not found: ${id}`);
        }
        return visaCard;
    }

    async findByUserId(userId: string): Promise<VISACard | null> {
        const userCards = Array.from(this.visaCards.values()).filter(
            (c) => c.userId === userId,
        );
        return userCards.length > 0 ? userCards[0] : null;
    }

    async findAll(): Promise<VISACard[]> {
        return Array.from(this.visaCards.values());
    }

    async findByCardNumber(cardNumber: string): Promise<VISACard | null> {
        for (const card of this.visaCards.values()) {
            if (card.cardNumber === cardNumber) {
                return card;
            }
        }
        return null;
    }

    async findByStatus(status: CardStatus): Promise<VISACard[]> {
        return Array.from(this.visaCards.values()).filter(
            (c) => c.status === status,
        );
    }

    async activate(id: string): Promise<VISACard> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }
        card.status = CardStatus.ACTIVE;
        card.activatedAt = new Date();
        // card.updatedAt = new Date(); // Property doesn't exist in entity
        return card;
    }

    async suspend(id: string): Promise<VISACard> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }
        card.status = CardStatus.SUSPENDED;
        // card.updatedAt = new Date(); // Property doesn't exist in entity
        return card;
    }

    async reactivate(id: string): Promise<VISACard> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }
        card.status = CardStatus.ACTIVE;
        // card.updatedAt = new Date(); // Property doesn't exist in entity
        return card;
    }

    async cancel(id: string): Promise<VISACard> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }
        card.status = CardStatus.CANCELLED;
        // card.updatedAt = new Date(); // Property doesn't exist in entity
        return card;
    }

    async updateBalance(id: string, amount: number): Promise<VISACard> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }
        card.balance += amount;
        // card.updatedAt = new Date(); // Property doesn't exist in entity
        return card;
    }

    async checkSpendingLimits(
        id: string,
        amount: number,
    ): Promise<{
        canSpend: boolean;
        dailyRemaining: number;
        monthlyRemaining: number;
    }> {
        const card = this.visaCards.get(id);
        if (!card) {
            throw new Error(`VISA Card not found: ${id}`);
        }

        // Mock implementation - in real app, this would check daily/monthly spending
        const dailyRemaining = card.dailyLimit - amount;
        const monthlyRemaining = card.monthlyLimit - amount;
        const canSpend =
            dailyRemaining >= 0 &&
            monthlyRemaining >= 0 &&
            card.balance >= amount;

        return {
            canSpend,
            dailyRemaining: Math.max(0, dailyRemaining),
            monthlyRemaining: Math.max(0, monthlyRemaining),
        };
    }

    async getExpiredCards(): Promise<VISACard[]> {
        const now = new Date();
        return Array.from(this.visaCards.values()).filter(
            (c) => c.expiresAt && c.expiresAt < now,
        );
    }

    async getCardStats(userId?: string): Promise<{
        totalCards: number;
        activeCards: number;
        suspendedCards: number;
        cancelledCards: number;
        expiredCards: number;
    }> {
        let cards = Array.from(this.visaCards.values());
        if (userId) {
            cards = cards.filter((c) => c.userId === userId);
        }

        const now = new Date();
        const activeCards = cards.filter(
            (c) => c.status === CardStatus.ACTIVE,
        ).length;
        const suspendedCards = cards.filter(
            (c) => c.status === CardStatus.SUSPENDED,
        ).length;
        const cancelledCards = cards.filter(
            (c) => c.status === CardStatus.CANCELLED,
        ).length;
        const expiredCards = cards.filter(
            (c) => c.expiresAt && c.expiresAt < now,
        ).length;

        return {
            totalCards: cards.length,
            activeCards,
            suspendedCards,
            cancelledCards,
            expiredCards,
        };
    }

    async update(
        id: string,
        updateVisaCardDto: UpdateVisaCardDto,
    ): Promise<VISACard> {
        const visaCard = this.visaCards.get(id);
        if (!visaCard) {
            throw new Error(`VISA Card not found: ${id}`);
        }

        Object.assign(visaCard, updateVisaCardDto);
        // visaCard.updatedAt = new Date(); // Property doesn't exist in entity
        this.visaCards.set(id, visaCard);
        return visaCard;
    }

    async remove(id: string): Promise<void> {
        this.visaCards.delete(id);
    }

    // Helper methods for testing
    clear(): void {
        this.visaCards.clear();
        this.nextId = 1;
    }

    getVISACards(): VISACard[] {
        return Array.from(this.visaCards.values());
    }
}

/**
 * Mock Service Factory
 *
 * @description Factory for creating mock services for testing.
 * Provides a centralized way to create and configure mock services.
 */
export class MockServiceFactory {
    static createUserService(): MockUserService {
        return new MockUserService();
    }

    static createWalletService(): MockWalletService {
        return new MockWalletService();
    }

    static createWalletBalanceService(): MockWalletBalanceService {
        return new MockWalletBalanceService();
    }

    static createTransactionService(): MockTransactionService {
        return new MockTransactionService();
    }

    // static createOnRampService(): MockOnRampService {
    //     return new MockOnRampService();
    // } // Removed - using new OnRampService implementation

    static createContactService(): MockContactService {
        return new MockContactService();
    }

    static createVISACardService(): MockVISACardService {
        return new MockVISACardService();
    }

    static createAllServices(): {
        userService: MockUserService;
        walletService: MockWalletService;
        walletBalanceService: MockWalletBalanceService;
        transactionService: MockTransactionService;
        contactService: MockContactService;
        visaCardService: MockVISACardService;
    } {
        return {
            userService: this.createUserService(),
            walletService: this.createWalletService(),
            walletBalanceService: this.createWalletBalanceService(),
            transactionService: this.createTransactionService(),
            contactService: this.createContactService(),
            visaCardService: this.createVISACardService(),
        };
    }

    static clearAllServices(services: any): void {
        Object.values(services).forEach((service: any) => {
            if (service && typeof service.clear === 'function') {
                service.clear();
            }
        });
    }
}
