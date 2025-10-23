import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/user/entities/user.entity';
import { Wallet } from '../../domain/wallet/entities/wallet.entity';
import { Transaction } from '../../domain/transaction/entities/transaction.entity';
import { Contact } from '../../domain/contact/entities/contact.entity';

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    timestamp: Date;
    type: string;
}

/**
 * Data validation service for migration integrity
 * Validates data consistency before and after migrations
 */
@Injectable()
export class DataValidationService {
    private readonly logger = new Logger(DataValidationService.name);

    constructor(
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
     * Validate data integrity before migration
     */
    async validatePreMigration(): Promise<ValidationResult> {
        this.logger.log('Starting pre-migration data validation');

        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate user data
            const userValidation = await this.validateUsers();
            errors.push(...userValidation.errors);
            warnings.push(...userValidation.warnings);

            // Validate wallet data
            const walletValidation = await this.validateWallets();
            errors.push(...walletValidation.errors);
            warnings.push(...walletValidation.warnings);

            // Validate transaction data
            const transactionValidation = await this.validateTransactions();
            errors.push(...transactionValidation.errors);
            warnings.push(...transactionValidation.warnings);

            // Validate contact data
            const contactValidation = await this.validateContacts();
            errors.push(...contactValidation.errors);
            warnings.push(...contactValidation.warnings);

            // Validate relationships
            const relationshipValidation = await this.validateRelationships();
            errors.push(...relationshipValidation.errors);
            warnings.push(...relationshipValidation.warnings);

            const isValid = errors.length === 0;

            this.logger.log(`Pre-migration validation completed. Valid: ${isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}`);

            return {
                isValid,
                errors,
                warnings,
                timestamp: new Date(),
                type: 'pre-migration',
            };

        } catch (error) {
            this.logger.error(`Pre-migration validation failed: ${error.message}`, error.stack);
            return {
                isValid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: [],
                timestamp: new Date(),
                type: 'pre-migration',
            };
        }
    }

    /**
     * Validate data integrity after migration
     */
    async validatePostMigration(): Promise<ValidationResult> {
        this.logger.log('Starting post-migration data validation');

        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate user data
            const userValidation = await this.validateUsers();
            errors.push(...userValidation.errors);
            warnings.push(...userValidation.warnings);

            // Validate wallet data
            const walletValidation = await this.validateWallets();
            errors.push(...walletValidation.errors);
            warnings.push(...walletValidation.warnings);

            // Validate transaction data
            const transactionValidation = await this.validateTransactions();
            errors.push(...transactionValidation.errors);
            warnings.push(...transactionValidation.warnings);

            // Validate contact data
            const contactValidation = await this.validateContacts();
            errors.push(...contactValidation.errors);
            warnings.push(...contactValidation.warnings);

            // Validate relationships
            const relationshipValidation = await this.validateRelationships();
            errors.push(...relationshipValidation.errors);
            warnings.push(...relationshipValidation.warnings);

            const isValid = errors.length === 0;

            this.logger.log(`Post-migration validation completed. Valid: ${isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}`);

            return {
                isValid,
                errors,
                warnings,
                timestamp: new Date(),
                type: 'post-migration',
            };

        } catch (error) {
            this.logger.error(`Post-migration validation failed: ${error.message}`, error.stack);
            return {
                isValid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: [],
                timestamp: new Date(),
                type: 'post-migration',
            };
        }
    }

    /**
     * Validate user data
     */
    private async validateUsers(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const users = await this.userRepository.find();

            for (const user of users) {
                // Check required fields
                if (!user.id) {
                    errors.push(`User missing ID`);
                }

                if (!user.authProvider) {
                    errors.push(`User ${user.id} missing auth provider`);
                }

                if (!user.authProviderId) {
                    errors.push(`User ${user.id} missing auth provider ID`);
                }

                // Check email or phone requirement
                if (!user.email && !user.phone) {
                    errors.push(`User ${user.id} must have either email or phone`);
                }

                // Check KYC status
                if (user.kycStatus === 'pending_verification' && (user.email || user.phone)) {
                    warnings.push(`User ${user.id} has contact info but KYC is pending`);
                }
            }

            return { 
                isValid: errors.length === 0, 
                errors, 
                warnings,
                timestamp: new Date(),
                type: 'user-validation'
            };

        } catch (error) {
            return { 
                isValid: false, 
                errors: [`User validation failed: ${error.message}`], 
                warnings: [],
                timestamp: new Date(),
                type: 'user-validation'
            };
        }
    }

    /**
     * Validate wallet data
     */
    private async validateWallets(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const wallets = await this.walletRepository.find();

            for (const wallet of wallets) {
                // Check required fields
                if (!wallet.id) {
                    errors.push(`Wallet missing ID`);
                }

                if (!wallet.userId) {
                    errors.push(`Wallet ${wallet.id} missing user ID`);
                }

                if (!wallet.address) {
                    errors.push(`Wallet ${wallet.id} missing address`);
                }

                if (!wallet.publicKey) {
                    errors.push(`Wallet ${wallet.id} missing public key`);
                }

                // Check Para wallet ID for new wallets
                if (wallet.walletType === 'para' && !wallet.externalWalletId) {
                    warnings.push(`Wallet ${wallet.id} is Para MPC but missing Para wallet ID`);
                }
            }

            return { 
                isValid: errors.length === 0, 
                errors, 
                warnings,
                timestamp: new Date(),
                type: 'wallet-validation'
            };

        } catch (error) {
            return { 
                isValid: false, 
                errors: [`Wallet validation failed: ${error.message}`], 
                warnings: [],
                timestamp: new Date(),
                type: 'wallet-validation'
            };
        }
    }

    /**
     * Validate transaction data
     */
    private async validateTransactions(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const transactions = await this.transactionRepository.find();

            for (const transaction of transactions) {
                // Check required fields
                if (!transaction.id) {
                    errors.push(`Transaction missing ID`);
                }

                if (!transaction.senderId) {
                    errors.push(`Transaction ${transaction.id} missing sender ID`);
                }

                if (!transaction.recipientId) {
                    errors.push(`Transaction ${transaction.id} missing recipient ID`);
                }

                if (!transaction.amount || transaction.amount <= 0) {
                    errors.push(`Transaction ${transaction.id} has invalid amount`);
                }

                if (!transaction.tokenType) {
                    errors.push(`Transaction ${transaction.id} missing token type`);
                }
            }

            return { 
                isValid: errors.length === 0, 
                errors, 
                warnings,
                timestamp: new Date(),
                type: 'transaction-validation'
            };

        } catch (error) {
            return { 
                isValid: false, 
                errors: [`Transaction validation failed: ${error.message}`], 
                warnings: [],
                timestamp: new Date(),
                type: 'transaction-validation'
            };
        }
    }

    /**
     * Validate contact data
     */
    private async validateContacts(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const contacts = await this.contactRepository.find();

            for (const contact of contacts) {
                // Check required fields
                if (!contact.id) {
                    errors.push(`Contact missing ID`);
                }

                if (!contact.ownerId) {
                    errors.push(`Contact ${contact.id} missing owner ID`);
                }

                if (!contact.contactUserId) {
                    errors.push(`Contact ${contact.id} missing contact user ID`);
                }

                // Check self-reference
                if (contact.ownerId === contact.contactUserId) {
                    errors.push(`Contact ${contact.id} cannot reference self`);
                }
            }

            return { 
                isValid: errors.length === 0, 
                errors, 
                warnings,
                timestamp: new Date(),
                type: 'contact-validation'
            };

        } catch (error) {
            return { 
                isValid: false, 
                errors: [`Contact validation failed: ${error.message}`], 
                warnings: [],
                timestamp: new Date(),
                type: 'contact-validation'
            };
        }
    }

    /**
     * Validate relationships between entities
     */
    private async validateRelationships(): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Get all entities
            const users = await this.userRepository.find();
            const wallets = await this.walletRepository.find();
            const transactions = await this.transactionRepository.find();
            const contacts = await this.contactRepository.find();

            // Create ID sets for validation
            const userIds = new Set(users.map(u => u.id));
            const walletIds = new Set(wallets.map(w => w.id));

            // Validate wallet-user relationships
            for (const wallet of wallets) {
                if (!userIds.has(wallet.userId)) {
                    errors.push(`Wallet ${wallet.id} references non-existent user ${wallet.userId}`);
                }
            }

            // Validate transaction-user relationships
            for (const transaction of transactions) {
                if (!userIds.has(transaction.senderId)) {
                    errors.push(`Transaction ${transaction.id} references non-existent sender ${transaction.senderId}`);
                }
                if (!userIds.has(transaction.recipientId)) {
                    errors.push(`Transaction ${transaction.id} references non-existent recipient ${transaction.recipientId}`);
                }
            }

            // Validate contact-user relationships
            for (const contact of contacts) {
                if (!userIds.has(contact.ownerId)) {
                    errors.push(`Contact ${contact.id} references non-existent owner ${contact.ownerId}`);
                }
                if (contact.contactUserId && !userIds.has(contact.contactUserId)) {
                    errors.push(`Contact ${contact.id} references non-existent contact user ${contact.contactUserId}`);
                }
            }

            return { 
                isValid: errors.length === 0, 
                errors, 
                warnings,
                timestamp: new Date(),
                type: 'relationship-validation'
            };

        } catch (error) {
            return { 
                isValid: false, 
                errors: [`Relationship validation failed: ${error.message}`], 
                warnings: [],
                timestamp: new Date(),
                type: 'relationship-validation'
            };
        }
    }
}

