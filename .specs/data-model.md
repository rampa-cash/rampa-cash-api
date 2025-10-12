# Data Model: Rampa Cash Remittances App

**Feature**: 001-title-rampa-cash  
**Date**: 2025-01-27  
**Status**: Complete

## Entity Overview
This document defines the core data entities for the Rampa Cash remittances app, following Domain-Driven Design principles and ensuring compliance with financial transaction requirements.

## Core Entities

### 1. User
**Purpose**: Represents an app user with authentication and profile information

**Attributes**:
- `id`: UUID (Primary Key)
- `email`: String (Unique, Required)
- `phone`: String (Optional, for contact discovery)
- `firstName`: String (Required, 1-50 characters)
- `lastName`: String (Required, 1-50 characters)
- `language`: Enum ['en', 'es'] (Required, defaults to 'en')
- `authProvider`: Enum ['google', 'apple', 'web3auth', 'phantom', 'solflare']
- `authProviderId`: String (Required, external provider ID)
- `isActive`: Boolean (Required, defaults to true)
- `status`: Enum ['active', 'suspended'] (Required, defaults to 'active')
- `createdAt`: Timestamp (Required)
- `updatedAt`: Timestamp (Required)
- `lastLoginAt`: Timestamp (Optional)

**Validation Rules**:
- Email must be valid format and unique
- Phone must be valid international format if provided
- FirstName and LastName must be 1-50 characters
- Language must be supported ('en' or 'es')

**State Transitions**:
- `ACTIVE` → `SUSPENDED` (if compliance issues)
- `SUSPENDED` → `ACTIVE` (after resolution)

### 2. Wallet
**Purpose**: Non-custodial wallet containing token balances and wallet metadata

**Attributes**:
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to User, Required)
- `address`: String (Required, Solana wallet address)
- `publicKey`: String (Required, Solana public key)
- `walletType`: Enum ['web3auth_mpc', 'phantom', 'solflare'] (Required)
- `isActive`: Boolean (Required, defaults to true)
- `status`: Enum ['active', 'suspended'] (Required, defaults to 'active')
- `createdAt`: Timestamp (Required)
- `updatedAt`: Timestamp (Required)

**Validation Rules**:
- Address must be valid Solana address format
- PublicKey must be valid Solana public key format
- Only one active wallet per user

**State Transitions**:
- `ACTIVE` → `SUSPENDED` (if security issues)
- `SUSPENDED` → `ACTIVE` (after resolution)

### 3. WalletBalance
**Purpose**: Tracks token balances for each wallet

**Attributes**:
- `id`: UUID (Primary Key)
- `walletId`: UUID (Foreign Key to Wallet, Required)
- `tokenType`: Enum ['USDC', 'EURC', 'SOL'] (Required)
- `balance`: Decimal(18,8) (Required, defaults to 0)
- `lastUpdated`: Timestamp (Required)
- `createdAt`: Timestamp (Required)
- `updatedAt`: Timestamp (Required)

**Validation Rules**:
- Balance must be >= 0
- TokenType must be supported
- Balance updates must be atomic

### 4. Transaction
**Purpose**: Record of money transfers between users

**Attributes**:
- `id`: UUID (Primary Key)
- `senderId`: UUID (Foreign Key to User, Required)
- `recipientId`: UUID (Foreign Key to User, Required)
- `senderWalletId`: UUID (Foreign Key to Wallet, Required)
- `recipientWalletId`: UUID (Foreign Key to Wallet, Required)
- `amount`: Decimal(18,8) (Required, must be > 0)
- `tokenType`: Enum ['USDC', 'EURC', 'SOL'] (Required)
- `status`: Enum ['pending', 'confirmed', 'failed', 'cancelled'] (Required)
- `solanaTransactionHash`: String (Optional, Solana transaction hash)
- `description`: String (Optional, user-provided description)
- `fee`: Decimal(18,8) (Required, transaction fee, defaults to 0)
- `createdAt`: Timestamp (Required)
- `confirmedAt`: Timestamp (Optional)
- `failedAt`: Timestamp (Optional)
- `failureReason`: String (Optional, reason for failure)

**Validation Rules**:
- Amount must be > 0
- Sender and recipient must be different users
- Sender must have sufficient balance
- TokenType must be supported
- Status transitions must be valid

**State Transitions**:
- `pending` → `confirmed` (when Solana transaction confirms)
- `pending` → `failed` (when transaction fails)
- `pending` → `cancelled` (when user cancels before confirmation)

### 5. Contact
**Purpose**: User's contact list for easy sending

**Attributes**:
- `id`: UUID (Primary Key)
- `ownerId`: UUID (Foreign Key to User, Required)
- `contactUserId`: UUID (Foreign Key to User, Optional, if contact is app user)
- `email`: String (Optional, for non-app users)
- `phone`: String (Optional, for non-app users)
- `displayName`: String (Required, 1-100 characters)
- `walletAddress`: String (Optional, if contact has wallet)
- `isAppUser`: Boolean (Required, defaults to false)
- `createdAt`: Timestamp (Required)
- `updatedAt`: Timestamp (Required)

**Validation Rules**:
- DisplayName must be 1-100 characters
- Either contactUserId or (email/phone) must be provided
- Email must be valid format if provided
- Phone must be valid international format if provided

### 6. VISA Card
**Purpose**: Physical or virtual card linked to user's crypto balance

**Attributes**:
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to User, Required)
- `cardNumber`: String (Required, masked for security)
- `cardType`: Enum ['physical', 'virtual'] (Required)
- `status`: Enum ['pending', 'active', 'suspended', 'cancelled'] (Required, defaults to 'pending')
- `balance`: Decimal(18,2) (Required, current available balance, defaults to 0)
- `dailyLimit`: Decimal(18,2) (Required, daily spending limit)
- `monthlyLimit`: Decimal(18,2) (Required, monthly spending limit)
- `createdAt`: Timestamp (Required)
- `activatedAt`: Timestamp (Optional)
- `expiresAt`: Timestamp (Required)

**Validation Rules**:
- CardNumber must be valid format
- DailyLimit and MonthlyLimit must be > 0
- ExpiresAt must be in the future
- Only one active card per user

**State Transitions**:
- `pending` → `active` (when card is activated)
- `active` → `suspended` (when card is temporarily disabled)
- `suspended` → `active` (when card is reactivated)
- `active` → `cancelled` (when card is permanently cancelled)
- `suspended` → `cancelled` (when suspended card is cancelled)

### 7. OnOffRamp
**Purpose**: Fiat currency conversion service records

**Attributes**:
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to User, Required)
- `walletId`: UUID (Foreign Key to Wallet, Required)
- `type`: Enum ['onramp', 'offramp'] (Required)
- `amount`: Decimal(18,8) (Required, must be > 0)
- `fiatAmount`: Decimal(18,2) (Required, must be > 0)
- `fiatCurrency`: String (Required, e.g., 'EUR', 'USD')
- `tokenType`: Enum ['USDC', 'EURC', 'SOL'] (Required)
- `status`: Enum ['pending', 'processing', 'completed', 'failed'] (Required, defaults to 'pending')
- `provider`: String (Required, e.g., 'stripe', 'sepa_provider')
- `providerTransactionId`: String (Optional, external provider ID)
- `exchangeRate`: Decimal(18,8) (Required, must be > 0)
- `fee`: Decimal(18,8) (Required, defaults to 0)
- `createdAt`: Timestamp (Required)
- `completedAt`: Timestamp (Optional)
- `failedAt`: Timestamp (Optional)
- `failureReason`: String (Optional)

**Validation Rules**:
- Amount must be > 0
- FiatAmount must be > 0
- ExchangeRate must be > 0
- Fee must be >= 0
- Type must be 'onramp' or 'offramp'

**State Transitions**:
- `pending` → `processing` (when provider starts processing)
- `processing` → `completed` (when conversion completes)
- `processing` → `failed` (when conversion fails)
- `pending` → `failed` (when immediate failure occurs)

### 8. Inquiry
**Purpose**: User inquiries and waitlist registrations

**Attributes**:
- `id`: SERIAL (Primary Key)
- `name`: String (Required)
- `email`: String (Required, Unique)
- `inquiry`: String (Optional, user inquiry text)
- `type`: Enum ['WAITLIST', 'GENERAL'] (Required, defaults to 'WAITLIST')
- `createdAt`: Timestamp (Required)
- `updatedAt`: Timestamp (Required)

**Validation Rules**:
- Email must be valid format and unique
- Name must be provided
- Type must be 'WAITLIST' or 'GENERAL'

## Relationships

### One-to-One
- User ↔ Wallet (1:1)
- User ↔ VISA Card (1:1, optional)

### One-to-Many
- User → WalletBalance (1:N)
- User → Transaction (1:N, as sender)
- User → Transaction (1:N, as recipient)
- User → Contact (1:N, as owner)
- User → Contact (1:N, as contact)
- User → OnOffRamp (1:N)
- Wallet → WalletBalance (1:N)
- Wallet → Transaction (1:N, as sender wallet)
- Wallet → Transaction (1:N, as recipient wallet)
- Wallet → OnOffRamp (1:N)

### Many-to-Many
- User ↔ User (through Contact)

## Database Constraints

### Primary Keys
- All entities have UUID primary keys
- No composite primary keys

### Foreign Keys
- All foreign key relationships are properly defined
- Cascade delete rules specified where appropriate

### Unique Constraints
- User.email (unique)
- User.phone (unique, partial)
- Wallet.address (unique)
- Contact.ownerId + Contact.contactUserId (unique)
- OnOffRamp.providerTransactionId (unique per provider)
- Inquiry.email (unique)

### Check Constraints
- WalletBalance.balance >= 0
- Transaction.amount > 0
- OnOffRamp.amount > 0
- OnOffRamp.fiatAmount > 0
- OnOffRamp.exchangeRate > 0
- All fee amounts >= 0

## Indexes

### Performance Indexes
- `users.email` (unique)
- `users.phone` (unique, partial)
- `wallets.address` (unique)
- `wallets.user_id` (foreign key)
- `transactions.sender_id` (for user transaction history)
- `transactions.recipient_id` (for user transaction history)
- `transactions.created_at` (for chronological queries)
- `contacts.owner_id` (for user contact list)
- `wallet_balances.wallet_id` (for balance queries)

### Composite Indexes
- `transactions(sender_id, created_at)` (for sender transaction history)
- `transactions(recipient_id, created_at)` (for recipient transaction history)
- `transactions(status, created_at)` (for pending transaction monitoring)
- `wallet_balances(wallet_id, token_type)` (for specific token balance)

## Audit Trail
All entities include:
- `createdAt`: Record creation timestamp
- `updatedAt`: Last modification timestamp
- `createdBy`: User who created the record (where applicable)
- `updatedBy`: User who last modified the record (where applicable)

## Data Retention
- **Transaction records**: 7 years (compliance requirement)
- **User data**: Until account deletion + 1 year
- **Audit logs**: 7 years
- **Failed transactions**: 1 year
- **Inquiry data**: 3 years (for marketing and support purposes)

## Security Considerations
- All sensitive data (private keys, card details, bank accounts) encrypted at rest
- PII data encrypted with AES-256
- Audit trail for all financial operations
- Soft delete for user data (compliance requirement)
