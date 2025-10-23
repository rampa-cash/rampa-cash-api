import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/user/entities/user.entity';
import { Wallet } from '../../domain/wallet/entities/wallet.entity';
import { Transaction } from '../../domain/transaction/entities/transaction.entity';
import { Contact } from '../../domain/contact/entities/contact.entity';

/**
 * Backup verification result interface
 */
export interface BackupVerificationResult {
    backupId: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Data backup service for migration safety
 * Creates backups before cleanup operations
 */
@Injectable()
export class DataBackupService {
    private readonly logger = new Logger(DataBackupService.name);

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
    ) {}

    /**
     * Create backup of all critical data before cleanup
     */
    async createBackup(): Promise<BackupResult> {
        const backupId = this.generateBackupId();
        const timestamp = new Date();

        try {
            this.logger.log(`Starting data backup: ${backupId}`);

            // Backup users
            const users = await this.userRepository.find();
            const userBackup = {
                count: users.length,
                data: users.map(user => ({
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    authProvider: user.authProvider,
                    authProviderId: user.authProviderId,
                    verificationStatus: user.verificationStatus,
                    kycStatus: user.kycStatus,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                })),
            };

            // Backup wallets
            const wallets = await this.walletRepository.find();
            const walletBackup = {
                count: wallets.length,
                data: wallets.map(wallet => ({
                    id: wallet.id,
                    userId: wallet.userId,
                    address: wallet.address,
                    publicKey: wallet.publicKey,
                    walletType: wallet.walletType,
                    externalWalletId: wallet.externalWalletId,
                    status: wallet.status,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt,
                })),
            };

            // Backup transactions
            const transactions = await this.transactionRepository.find();
            const transactionBackup = {
                count: transactions.length,
                data: transactions.map(transaction => ({
                    id: transaction.id,
                    senderId: transaction.senderId,
                    recipientId: transaction.recipientId,
                    amount: transaction.amount,
                    tokenType: transaction.tokenType,
                    status: transaction.status,
                    createdAt: transaction.createdAt,
                    confirmedAt: transaction.confirmedAt,
                })),
            };

            // Backup contacts
            const contacts = await this.contactRepository.find();
            const contactBackup = {
                count: contacts.length,
                data: contacts.map(contact => ({
                    id: contact.id,
                    ownerId: contact.ownerId,
                    contactUserId: contact.contactUserId,
                    email: contact.email,
                    phone: contact.phone,
                    displayName: contact.displayName,
                    walletAddress: contact.walletAddress,
                    isAppUser: contact.isAppUser,
                    createdAt: contact.createdAt,
                    updatedAt: contact.updatedAt,
                })),
            };

            const backupData = {
                backupId,
                timestamp,
                users: userBackup,
                wallets: walletBackup,
                transactions: transactionBackup,
                contacts: contactBackup,
                metadata: {
                    totalUsers: userBackup.count,
                    totalWallets: walletBackup.count,
                    totalTransactions: transactionBackup.count,
                    totalContacts: contactBackup.count,
                },
            };

            // Save backup to file system
            await this.saveBackupToFile(backupData);

            this.logger.log(`Data backup completed: ${backupId}`);

            return {
                backupId,
                success: true,
                timestamp,
                metadata: backupData.metadata,
            };

        } catch (error) {
            this.logger.error(`Data backup failed: ${error.message}`, error.stack);
            throw new Error(`Data backup failed: ${error.message}`);
        }
    }

    /**
     * Verify backup integrity
     */
    async verifyBackup(backupId: string): Promise<BackupVerificationResult> {
        try {
            this.logger.log(`Verifying backup: ${backupId}`);

            // Load backup data
            const backupData = await this.loadBackupFromFile(backupId);
            if (!backupData) {
                return {
                    backupId,
                    isValid: false,
                    errors: ['Backup file not found'],
                    warnings: [],
                };
            }

            // Verify data integrity
            const errors: string[] = [];
            const warnings: string[] = [];

            // Check user data integrity
            if (!backupData.users || !Array.isArray(backupData.users.data)) {
                errors.push('Invalid user data structure');
            }

            // Check wallet data integrity
            if (!backupData.wallets || !Array.isArray(backupData.wallets.data)) {
                errors.push('Invalid wallet data structure');
            }

            // Check transaction data integrity
            if (!backupData.transactions || !Array.isArray(backupData.transactions.data)) {
                errors.push('Invalid transaction data structure');
            }

            // Check contact data integrity
            if (!backupData.contacts || !Array.isArray(backupData.contacts.data)) {
                errors.push('Invalid contact data structure');
            }

            // Verify relationships
            const userIds = new Set(backupData.users.data.map((u: any) => u.id));
            const walletUserIds = new Set(backupData.wallets.data.map((w: any) => w.userId));
            
            for (const walletUserId of walletUserIds) {
                if (!userIds.has(walletUserId)) {
                    warnings.push(`Wallet references non-existent user: ${walletUserId}`);
                }
            }

            return {
                backupId,
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: backupData.metadata,
            };

        } catch (error) {
            this.logger.error(`Backup verification failed: ${error.message}`, error.stack);
            return {
                backupId,
                isValid: false,
                errors: [`Verification failed: ${error.message}`],
                warnings: [],
            };
        }
    }

    /**
     * Generate unique backup ID
     */
    private generateBackupId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `backup_${timestamp}_${random}`;
    }

    /**
     * Save backup to file system
     */
    private async saveBackupToFile(backupData: any): Promise<void> {
        const fs = require('fs').promises;
        const path = require('path');
        
        const backupDir = path.join(process.cwd(), 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        
        const filePath = path.join(backupDir, `${backupData.backupId}.json`);
        await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
    }

    /**
     * Load backup from file system
     */
    private async loadBackupFromFile(backupId: string): Promise<any> {
        const fs = require('fs').promises;
        const path = require('path');
        
        const filePath = path.join(process.cwd(), 'backups', `${backupId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }
}

/**
 * Backup result interface
 */
export interface BackupResult {
    backupId: string;
    success: boolean;
    timestamp: Date;
    metadata: {
        totalUsers: number;
        totalWallets: number;
        totalTransactions: number;
        totalContacts: number;
    };
}

/**
 * Backup verification result interface
 */
export interface BackupVerificationResult {
    backupId: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: any;
}
