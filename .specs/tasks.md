# Tasks: Rampa Cash Remittances App

**Input**: Design documents from `/specs/001-title-rampa-cash/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: tech stack (NestJS, Next.js, Kotlin, Swift), libraries (Web3Auth, Solana)
2. Load design documents:
   → data-model.md: 7 entities (User, Wallet, Transaction, Contact, VISA Card, OnOffRamp)
   → contracts/openapi.yaml: 15+ API endpoints
   → research.md: Technical decisions for Web3Auth, Solana, DDD
3. Generate tasks by platform:
   → Backend: API, database, services, authentication
   → Frontend: Web app (Next.js), mobile apps (Kotlin/Swift)
4. Apply TDD principles: Tests before implementation
5. Mark parallel tasks [P] for independent execution
6. Create clear separation between backend and frontend/mobile
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Clear separation between Backend and Frontend/Mobile sections

---

# 🏗️ BACKEND TASKS

## Phase 3.1: Backend Setup
- [x] T001 Create backend project structure with NestJS
- [x] T002 Initialize PostgreSQL database with migrations
- [x] T003 [P] Configure TypeScript, ESLint, and Prettier
- [x] T004 [P] Setup Jest testing framework with Supertest
- [x] T005 [P] Configure environment variables and secrets management
- [x] T006 [P] Create Docker containers for development environment (PostgreSQL, Redis, backend, frontend)

## Phase 3.2: Backend Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T007 [P] Contract test POST /auth/signup in backend/tests/contract/test_auth_signup.test.ts
- [x] T008 [P] Contract test POST /auth/login in backend/tests/contract/test_auth_login.test.ts
- [x] T009 [P] Contract test GET /wallet/balance in backend/tests/contract/test_wallet_balance.test.ts
- [x] T010 [P] Contract test POST /wallet/connect in backend/tests/contract/test_wallet_connect.test.ts
- [x] T011 [P] Contract test GET /transactions in backend/tests/contract/test_transactions_get.test.ts
- [x] T012 [P] Contract test POST /transactions in backend/tests/contract/test_transactions_post.test.ts
- [x] T013 [P] Contract test GET /contacts in backend/tests/contract/test_contacts_get.test.ts
- [x] T014 [P] Contract test POST /contacts in backend/tests/contract/test_contacts_post.test.ts
- [x] T015 [P] Contract test POST /onramp/initiate in backend/tests/contract/test_onramp_initiate.test.ts
- [x] T016 [P] Contract test POST /offramp/initiate in backend/tests/contract/test_offramp_initiate.test.ts
- [x] T017 [P] Contract test GET /visa-card in backend/tests/contract/test_visa_card_get.test.ts
- [x] T018 [P] Contract test POST /visa-card in backend/tests/contract/test_visa_card_post.test.ts

### Integration Tests
- [x] T019 [P] Integration test user registration flow in backend/tests/integration/test_user_registration.test.ts
- [x] T020 [P] Integration test wallet creation flow in backend/tests/integration/test_wallet_creation.test.ts
- [x] T021 [P] Integration test transaction flow in backend/tests/integration/test_transaction_flow.test.ts
- [x] T022 [P] Integration test contact management flow in backend/tests/integration/test_contact_management.test.ts
- [x] T023 [P] Integration test on/off ramp flow in backend/tests/integration/test_ramp_flow.test.ts

## Phase 3.3: Backend Core Implementation (ONLY after tests are failing)

### Database Models
- [x] T024 [P] User entity in src/domain/user/entities/user.entity.ts
- [x] T025 [P] Wallet entity in src/domain/wallet/entities/wallet.entity.ts
- [x] T026 [P] WalletBalance entity in src/domain/wallet/entities/wallet-balance.entity.ts
- [x] T027 [P] Transaction entity in src/domain/transaction/entities/transaction.entity.ts
- [x] T028 [P] Contact entity in src/domain/contact/entities/contact.entity.ts
- [x] T029 [P] VISACard entity in src/domain/visa-card/entities/visa-card.entity.ts
- [x] T030 [P] OnOffRamp entity in src/domain/onramp/entities/onoff-ramp.entity.ts

### Domain Services
- [x] T031 [P] UserService in src/domain/user/services/user.service.ts
- [x] T032 [P] WalletService in src/domain/wallet/services/wallet.service.ts
- [x] T033 [P] TransactionService in src/domain/transaction/services/transaction.service.ts
- [x] T034 [P] ContactService in src/domain/contact/services/contact.service.ts
- [x] T035 [P] OnRampService in src/domain/onramp/services/onramp.service.ts
- [x] T036 [P] OffRampService in src/domain/onramp/services/offramp.service.ts
- [x] T037 [P] VISACardService in src/domain/visa-card/services/visa-card.service.ts

### API Controllers
- [x] T038 AuthController in src/domain/auth/controllers/auth.controller.ts
- [x] T039 WalletController in src/domain/wallet/controllers/wallet.controller.ts
- [x] T040 TransactionController in src/domain/transaction/controllers/transaction.controller.ts
- [x] T041 ContactController in src/domain/contact/controllers/contact.controller.ts
- [x] T042 OnRampController in src/domain/onramp/controllers/onramp.controller.ts
- [x] T043 OffRampController in src/domain/onramp/controllers/offramp.controller.ts
- [x] T044 VISACardController in src/domain/visa-card/controllers/visa-card.controller.ts

### Authentication & Security
- [x] T045 JWT authentication guard in src/domain/guards/jwt-auth.guard.ts
- [x] T046 Web3Auth integration service in src/domain/auth/services/web3auth.service.ts
- [x] T047 Rate limiting middleware in src/domain/middleware/rate-limit.middleware.ts
- [x] T048 Input validation pipes in src/domain/pipes/validation.pipe.ts
- [x] T049 Audit logging interceptor in src/domain/interceptors/audit-logging.interceptor.ts

## Phase 3.3.1: Web3Auth Migration (CRITICAL PATH) ✅ COMPLETED & CLEANED
**Remove unused auth endpoints and implement simplified Web3Auth JWT authentication**

### Web3Auth Migration Overview
This migration implements a **full Web3Auth JWT authentication system** where:

1. **Frontend Flow**: User logs in via Web3Auth (Google, Apple, etc.) → Web3Auth returns JWT → Frontend calls `/auth/web3auth/validate` → API returns our JWT token
2. **Backend Flow**: All API endpoints use our JWT tokens (existing JWT guard) → No Web3Auth complexity in business logic
3. **Benefits**: Web3Auth handles all auth complexity (login, registration, password recovery) → Clean, secure, maintainable

### Migration Strategy
- **Remove**: All traditional auth endpoints (signup, login, refresh, verify-email, etc.)
- **Add**: Web3Auth validation endpoint and configuration endpoint
- **Keep**: Essential endpoints (/auth/me, /auth/logout) that work with JWT tokens
- **Result**: Single authentication flow with Web3Auth user experience

### Remove Unused Auth Endpoints
- [x] T103 [P] Remove /auth/signup endpoint (Web3Auth handles registration)
- [x] T104 [P] Remove /auth/login endpoint (Web3Auth handles login)
- [x] T105 [P] Remove /auth/refresh endpoint (Web3Auth handles token refresh)
- [x] T106 [P] Remove /auth/verify-email endpoint (Web3Auth handles verification)
- [x] T107 [P] Remove /auth/resend-verification endpoint (Web3Auth handles this)
- [x] T108 [P] Remove /auth/forgot-password endpoint (Web3Auth handles password recovery)
- [x] T109 [P] Remove /auth/reset-password endpoint (Web3Auth handles password reset)

### Web3Auth JWT Validation Infrastructure
- [x] T110 [P] Web3Auth JWT validation service in src/domain/auth/services/web3auth-validation.service.ts
- [x] T111 [P] Web3Auth middleware in src/domain/auth/middleware/web3auth.middleware.ts
- [x] T112 [P] User extraction from Web3Auth JWT in src/domain/auth/utils/jwt-extractor.ts
- [x] T113 [P] Web3Auth public key configuration in src/config/web3auth.config.ts
- [x] T114 [P] Web3Auth error handling in src/domain/auth/filters/web3auth-exception.filter.ts

### Web3Auth Passport Strategy
- [x] T115 [P] Web3Auth Passport strategy in src/domain/auth/strategies/web3auth.strategy.ts
- [x] T116 [P] Web3Auth guard in src/domain/auth/guards/web3auth.guard.ts

### Web3Auth API Endpoints
- [x] T117 [P] Web3Auth controller in src/domain/auth/controllers/web3auth.controller.ts
- [x] T118 [P] POST /auth/web3auth/validate endpoint (validate Web3Auth tokens)

### Keep Essential Auth Endpoints
- [x] T120 [P] Keep /auth/me endpoint (works with JWT tokens)
- [x] T121 [P] Keep /auth/logout endpoint (works with JWT tokens)

### OpenAPI Specification Update
- [x] T122 [P] Update OpenAPI specification with Web3Auth endpoints and simplified authentication flow

## Phase 3.4: Backend Integration
- [x] T050 Database connection and migrations in src/config/database.config.ts and src/migrations/
- [x] T051 Solana service integration in src/domain/solana/services/solana.service.ts
- [x] T052 On/off ramp provider abstraction in src/domain/onramp/providers/ramp-provider.interface.ts
- [x] T053 Error handling and logging in src/common/filters/http-exception.filter.ts
- [x] T054 CORS and security headers in src/main.ts
- [x] T055 Health check endpoint in src/health/health.controller.ts

## Phase 3.4.1: Solana Blockchain Integration (CRITICAL PATH) ⚠️ MISSING
**Essential Solana operations using @solana/web3.js package**

### Solana Package Installation
- [x] T123 [P] Install @solana/web3.js package for core blockchain operations
- [x] T124 [P] Install @solana/spl-token package for SPL token operations
- [x] T125 [P] Install @solana/wallet-adapter-base for wallet integration
- [x] T126 [P] Update package.json with Solana dependencies

### Solana Service Implementation
- [x] T127 [P] Replace mock SolanaService with real @solana/web3.js implementation
- [x] T128 [P] Implement Connection class for RPC communication in src/domain/solana/services/solana-connection.service.ts
- [x] T129 [P] Implement PublicKey validation and address utilities in src/domain/solana/utils/address.utils.ts
- [x] T130 [P] Implement transaction serialization and deserialization in src/domain/solana/utils/transaction.utils.ts

### Solana Transaction Operations
- [x] T131 [P] Implement SOL transfer transactions in src/domain/solana/services/solana-transaction.service.ts
- [x] T132 [P] Implement SPL token transfer transactions (USDC, EURC) in src/domain/solana/services/spl-token.service.ts
- [x] T133 [P] Implement transaction confirmation and status checking
- [x] T134 [P] Implement transaction fee estimation and recent blockhash fetching
- [x] T135 [P] Implement transaction retry logic and error handling

### Solana Wallet Operations
- [x] T136 [P] Implement wallet address validation using @solana/web3.js PublicKey
- [x] T137 [P] Implement wallet balance checking for SOL and SPL tokens
- [x] T138 [P] Implement wallet account info fetching
- [x] T139 [P] Implement wallet transaction history retrieval
- [x] T140 [P] Implement wallet token account discovery

### Solana Configuration and Network Management
- [x] T141 [P] Implement Solana network configuration in src/config/solana.config.ts
- [x] T142 [P] Implement RPC endpoint management and failover logic
- [x] T143 [P] Implement commitment level configuration (processed, confirmed, finalized)
- [x] T144 [P] Implement network-specific token mint addresses (USDC, EURC)

### Solana Error Handling and Monitoring
- [x] T145 [P] Implement comprehensive Solana error handling in src/domain/solana/filters/solana-exception.filter.ts
- [x] T146 [P] Implement transaction retry logic with exponential backoff
- [x] T147 [P] Implement Solana network health monitoring
- [x] T148 [P] Implement transaction timeout handling

### Solana Testing
- [x] T149 [P] Unit tests for SolanaService in test/unit/solana.service.test.ts
- [x] T150 [P] Unit tests for SPL token operations in test/unit/spl-token.service.test.ts
- [x] T151 [P] Integration tests for Solana transactions in test/integration/solana-transaction.test.ts
- [x] T152 [P] Contract tests for Solana wallet operations in test/contract/test_solana_wallet.test.ts

## Phase 3.4.2: Web3Auth User Verification System (CRITICAL PATH) ⚠️ NEW
**Implement incomplete user profiles with verification status and profile completion flow**

### User Entity Updates
- [x] T153 [P] Add UserVerificationStatus enum (PENDING_VERIFICATION, VERIFIED, REJECTED) in src/domain/user/entities/user.entity.ts
- [x] T154 [P] Make email, firstName, lastName nullable in User entity for incomplete profiles
- [x] T155 [P] Add verificationStatus field to User entity
- [x] T156 [P] Add verificationCompletedAt field to User entity
- [x] T157 [P] Update UserStatus enum to include PENDING_VERIFICATION status

### Web3Auth User Creation Logic Updates
- [x] T158 [P] Update Web3AuthUser interface to support optional fields in src/domain/auth/services/web3auth-validation.service.ts
- [x] T159 [P] Implement login method detection from aggregateVerifier in Web3AuthValidationService
- [x] T160 [P] Update validateAndCreateUser to create incomplete users based on login method
- [x] T161 [P] Create createIncompleteUser method for phone/email login with missing info
- [x] T162 [P] Create createCompleteUser method for Google login with full info
- [x] T163 [P] Update user creation to set appropriate verification status

### User Verification Service
- [x] T164 [P] Create UserVerificationService in src/domain/user/services/user-verification.service.ts
- [x] T165 [P] Implement completeProfile method for missing information completion
- [x] T166 [P] Implement verifyUser method to activate verified users
- [x] T167 [P] Implement getMissingFields method to identify incomplete profile fields
- [x] T168 [P] Add validation for profile completion requirements

### User Verification Controller
- [x] T169 [P] Create UserVerificationController in src/domain/user/controllers/user-verification.controller.ts
- [x] T170 [P] Implement POST /user/complete-profile endpoint
- [x] T171 [P] Implement GET /user/verification-status endpoint
- [x] T172 [P] Implement POST /user/verify endpoint for admin verification
- [x] T173 [P] Add proper validation and error handling for verification endpoints

### Operation Restrictions
- [x] T174 [P] Create UserVerificationGuard in src/domain/user/guards/user-verification.guard.ts
- [x] T175 [P] Update TransactionController to require user verification for transactions
- [x] T176 [P] Update WalletController to require user verification for wallet operations
- [ ] T177 [P] Update OnRampController to require user verification for ramp operations
- [ ] T178 [P] Add verification status checks to all financial operations

### Profile Completion DTOs
- [x] T179 [P] Create CompleteProfileDto in src/domain/user/dto/complete-profile.dto.ts
- [x] T180 [P] Create VerificationStatusDto in src/domain/user/dto/verification-status.dto.ts
- [x] T181 [P] Create MissingFieldsDto in src/domain/user/dto/missing-fields.dto.ts
- [x] T182 [P] Add proper validation decorators for profile completion

## Phase 3.4.3: Transaction Architecture Analysis & Implementation (CRITICAL PATH) ⚠️ NEW
**Fix transaction architecture, implement missing services, and create proper separation of concerns**

### Current Architecture Analysis
**CRITICAL ISSUES IDENTIFIED:**

#### 1. **Broken Transfer Flow**
- ❌ `/wallet/transfer` is incomplete - only returns mock response
- ❌ No address resolution (wallet address → user ID + wallet ID)
- ❌ No ATA (Associated Token Account) management
- ❌ No integration with TransactionService
- ❌ No actual Solana blockchain operations

#### 2. **Mixed Domain Responsibilities**
- ❌ WalletService handles both wallet management AND balance operations
- ❌ TransactionService depends on WalletService for balance checks
- ❌ No clear separation between wallet operations and transaction operations
- ❌ Missing dedicated transfer service

#### 3. **Missing Critical Services**
- ❌ AddressResolutionService (wallet address → user/wallet lookup)
- ❌ TokenAccountService (ATA creation and management)
- ❌ SolanaTransferService (actual blockchain operations)
- ❌ TransferOrchestrationService (coordinates the full transfer flow)

### Domain Architecture Redesign

#### Current (Broken) Architecture:
```
WalletController.transfer() → Mock response
TransactionController.create() → Database only
WalletService → Balance management + Wallet CRUD
TransactionService → Database + Balance checks
```

#### Target (Fixed) Architecture:
```
WalletController.transfer() → TransferOrchestrationService
TransferOrchestrationService → AddressResolutionService + TokenAccountService + SolanaTransferService + TransactionService
WalletService → Wallet CRUD only
TransactionService → Transaction CRUD + Status management
SolanaTransferService → Blockchain operations only
```

### Phase 3.4.3.1: Missing Core Services Implementation (CRITICAL PATH)

#### Address Resolution Service ✅ COMPLETED
- [x] T212 [P] Create AddressResolutionService in src/domain/wallet/services/address-resolution.service.ts
- [x] T213 [P] Implement resolveWalletAddress method (address → user + wallet)
- [x] T214 [P] Implement resolveUserByAddress method (address → user)
- [x] T215 [P] Add address validation and error handling
- [x] T216 [P] Export AddressResolutionService from WalletModule

#### Token Account Management Service ✅ COMPLETED
- [x] T217 [P] Create TokenAccountService in src/domain/solana/services/token-account.service.ts
- [x] T218 [P] Implement ensureTokenAccountExists method (create ATA if needed)
- [x] T219 [P] Implement getTokenAccountAddress method (derive ATA address)
- [x] T220 [P] Implement createTokenAccount method (create ATA on blockchain)
- [x] T221 [P] Add token account validation and error handling

#### Solana Transfer Service ✅ COMPLETED
- [x] T222 [P] Create SolanaTransferService in src/domain/solana/services/solana-transfer.service.ts
- [x] T223 [P] Implement transferSOL method (native SOL transfers)
- [x] T224 [P] Implement transferSPLToken method (USDC, EURC transfers)
- [x] T225 [P] Implement createTransferTransaction method (transaction creation)
- [x] T226 [P] Implement signAndSendTransaction method (transaction execution)
- [x] T227 [P] Add transaction confirmation and status checking

#### Transfer Orchestration Service ✅ COMPLETED
- [x] T228 [P] Create TransferOrchestrationService in src/domain/transfer/services/transfer-orchestration.service.ts
- [x] T229 [P] Implement initiateTransfer method (main transfer flow)
- [x] T230 [P] Implement validateTransfer method (pre-transfer validation)
- [x] T231 [P] Implement executeTransfer method (blockchain execution)
- [x] T232 [P] Implement confirmTransfer method (transaction confirmation)
- [x] T233 [P] Add comprehensive error handling and rollback logic

### Phase 3.4.3.2: Domain Separation & Refactoring (CRITICAL PATH)

#### Wallet Domain Cleanup ✅ COMPLETED
- [x] T234 [P] Remove balance management from WalletService (move to dedicated service)
- [x] T235 [P] Create WalletBalanceService in src/domain/wallet/services/wallet-balance.service.ts
- [x] T236 [P] Move all balance operations from WalletService to WalletBalanceService
- [x] T237 [P] Update WalletService to focus only on wallet CRUD operations
- [x] T238 [P] Update WalletModule to export WalletBalanceService

#### Transaction Domain Enhancement ✅ COMPLETED
- [x] T239 [P] Remove balance checking from TransactionService (move to orchestration)
- [x] T240 [P] Update TransactionService to focus on transaction CRUD and status management
- [x] T241 [P] Add transaction confirmation methods to TransactionService
- [x] T242 [P] Add transaction status update methods to TransactionService
- [x] T243 [P] Update TransactionModule to import new services

#### Transfer Domain Creation ✅ COMPLETED
- [x] T244 [P] Create TransferModule in src/domain/transfer/transfer.module.ts
- [x] T245 [P] Create TransferController in src/domain/transfer/controllers/transfer.controller.ts
- [x] T246 [P] Move /wallet/transfer endpoint to TransferController
- [x] T247 [P] Create TransferDto in src/domain/transfer/dto/transfer.dto.ts
- [x] T248 [P] Add proper validation and error handling to transfer endpoints

### Phase 3.4.3.3: Integration & Implementation (CRITICAL PATH)

#### Fix Wallet Transfer Endpoint ✅ COMPLETED
- [x] T249 [P] Update /wallet/transfer to use TransferOrchestrationService
- [x] T250 [P] Implement proper address resolution in transfer flow
- [x] T251 [P] Add ATA creation for recipient if needed
- [x] T252 [P] Integrate with SolanaTransferService for blockchain operations
- [x] T253 [P] Add proper error handling and user feedback

#### Update Transaction Flow
- [x] T254 [P] Update TransactionService to work with TransferOrchestrationService
- [x] T255 [P] Implement transaction confirmation flow
- [x] T256 [P] Add transaction status updates from blockchain
- [x] T257 [P] Implement transaction retry logic for failed transactions
- [x] T258 [P] Add transaction fee calculation and management

#### Balance Management Integration
- [x] T259 [P] Update WalletBalanceService to sync with blockchain
- [x] T260 [P] Implement real-time balance updates after transfers
- [x] T261 [P] Add balance validation before transfers
- [ ] T262 [P] Implement balance caching and refresh logic
- [ ] T263 [P] Add balance history tracking

### Phase 3.4.3.4: Solana Module Integration (UPDATED)

#### App Module Integration
- [x] T183 [P] Import SolanaModule in src/app.module.ts ✅ COMPLETED
- [x] T264 [P] Import TransferModule in src/app.module.ts
- [x] T265 [P] Import WalletModule in src/app.module.ts (includes AddressResolutionService)
- [x] T266 [P] Update main.ts to include Solana exception filter

#### Service Integration
- [x] T186 [P] Import SolanaModule in src/domain/wallet/wallet.module.ts ✅ COMPLETED
- [x] T187 [P] Inject SolanaService into WalletService constructor ✅ COMPLETED
- [x] T188 [P] Update WalletService to use SolanaService for blockchain operations ✅ COMPLETED
- [x] T189 [P] Replace mock blockchain calls with real Solana operations in WalletService ✅ COMPLETED
- [x] T190 [P] Update WalletController to use real Solana balance checking ✅ COMPLETED

#### Transaction Module Integration ✅ COMPLETED
- [x] T191 [P] Import SolanaModule in src/domain/transaction/transaction.module.ts
- [x] T192 [P] Inject SolanaService into TransactionService constructor (not needed - blockchain ops handled by orchestration)
- [x] T267 [P] Import TransferOrchestrationService in TransactionModule (not needed - orchestration uses transaction service)
- [x] T268 [P] Update TransactionService to work with new architecture
- [x] T269 [P] Update TransactionController to use real Solana transaction operations (not needed - blockchain ops handled by orchestration)

### Phase 3.4.3.5: Error Handling & Configuration (CRITICAL PATH)

#### Error Handling Integration
- [x] T200 [P] Add SolanaExceptionFilter to global exception filters in main.ts
- [x] T201 [P] Update existing controllers to handle Solana-specific errors
- [x] T202 [P] Add Solana error handling to WalletController endpoints
- [x] T203 [P] Add Solana error handling to TransactionController endpoints
- [x] T270 [P] Add TransferOrchestrationService error handling
- [x] T271 [P] Add AddressResolutionService error handling (in WalletModule)
- [x] T272 [P] Add TokenAccountService error handling

#### Configuration Integration ✅ COMPLETED
- [x] T204 [P] Add Solana environment variables to .env.example
- [x] T205 [P] Update docker-compose.yml with Solana RPC configuration (not needed - uses env vars)
- [x] T206 [P] Add Solana configuration validation in ConfigService
- [x] T207 [P] Update health check to include Solana network health
- [x] T273 [P] Add transfer service configuration (uses existing Solana config)
- [x] T274 [P] Add address resolution configuration (uses existing Solana config)

### Phase 3.4.3.6: Web3Auth Wallet Creation Improvements (CRITICAL PATH)
**Fix Web3Auth wallet creation flow for better reliability and validation**

#### Atomic User + Wallet Creation
- [x] T282 [P] Implement database transaction for atomic user + wallet creation in Web3AuthValidationService
- [x] T283 [P] Add rollback logic if wallet creation fails after user creation
- [x] T284 [P] Update createWeb3AuthWallet to be part of user creation transaction
- [x] T285 [P] Add proper error handling and logging for wallet creation failures
- [x] T286 [P] Ensure both user and wallet are created or both fail

#### Solana Address Validation
- [x] T287 [P] Add Solana address validation to createWeb3AuthWallet method
- [x] T288 [P] Implement validateSolanaAddress utility function using @solana/web3.js PublicKey
- [x] T289 [P] Add address validation before storing wallet addresses in database
- [x] T290 [P] Add proper error messages for invalid Solana addresses
- [x] T291 [P] Validate all wallet addresses (ed25519, secp256k1) before storage

#### Address Uniqueness Checking
- [x] T292 [P] Add global address uniqueness check before wallet creation
- [x] T293 [P] Implement isAddressUnique method in WalletService
- [x] T294 [P] Add address conflict detection and error handling
- [x] T295 [P] Prevent duplicate wallet addresses across different users
- [x] T296 [P] Add proper error messages for address conflicts

#### Smart Wallet Update Logic
- [x] T297 [P] Implement addressesChanged method to detect actual address changes
- [x] T298 [P] Update updateWeb3AuthWallet to only update when addresses actually change
- [x] T299 [P] Add address comparison logic for existing vs new addresses
- [x] T300 [P] Optimize wallet update process to avoid unnecessary database writes
- [x] T301 [P] Add logging for wallet address updates

#### Enhanced Error Handling
- [x] T302 [P] Improve error handling in Web3AuthValidationService.validateAndCreateUser
- [x] T303 [P] Add specific error types for wallet creation failures
- [x] T304 [P] Implement retry logic for transient wallet creation failures
- [x] T305 [P] Add comprehensive logging for Web3Auth flow debugging
- [x] T306 [P] Add user-friendly error messages for frontend

### Phase 3.4.3.7: Domain Architecture Improvements (MEDIUM PRIORITY) ✅ COMPLETED
**Improve domain separation and endpoint organization based on analysis**

#### Transfer Domain Creation (HIGH PRIORITY) ✅ COMPLETED
- [x] T307 [P] Create TransferModule in src/domain/transfer/transfer.module.ts
- [x] T308 [P] Create TransferController in src/domain/transfer/controllers/transfer.controller.ts
- [x] T309 [P] Move POST /wallet/transfer to POST /transfer in TransferController
- [x] T310 [P] Create TransferDto in src/domain/transfer/dto/transfer.dto.ts
- [x] T311 [P] Add proper validation and error handling to transfer endpoints
- [x] T312 [P] Update WalletController to remove transfer endpoint
- [x] T313 [P] Add redirect from /wallet/transfer to /transfer for backward compatibility

#### Balance Domain Separation (MEDIUM PRIORITY) ✅ COMPLETED
- [x] T314 [P] Evaluate if balance operations should move to dedicated BalanceController
- [x] T315 [P] Create BalanceController in src/domain/balance/controllers/balance.controller.ts (if needed) - CANCELLED (not needed)
- [x] T316 [P] Create BalanceService in src/domain/balance/services/balance.service.ts (if needed) - CANCELLED (not needed)
- [x] T317 [P] Move GET /wallet/balance and GET /wallet/balances to BalanceController (if needed) - CANCELLED (not needed)
- [x] T318 [P] Update WalletController to focus only on wallet CRUD operations
- [x] T319 [P] Add proper domain separation between wallet and balance operations

#### Endpoint Organization Review ✅ COMPLETED
- [x] T320 [P] Review all wallet domain endpoints for correct domain placement
- [x] T321 [P] Review all transaction domain endpoints for correct domain placement
- [x] T322 [P] Identify any other endpoints that might be in wrong domains
- [x] T323 [P] Create endpoint migration plan for any necessary moves
- [x] T324 [P] Update API documentation to reflect correct endpoint organization

### Phase 3.4.3.8: Data Model Improvements (CRITICAL PATH)
**Fix data model flaws and inconsistencies identified in entity analysis**

#### Environment-Based Token Configuration (HIGH PRIORITY) ✅ COMPLETED
- [x] T344 [P] Move token mint addresses from hardcoded enum to environment configuration
- [x] T345 [P] Create TokenConfigService to manage environment-specific mint addresses
- [x] T346 [P] Update all services to use TokenConfigService instead of hardcoded addresses
- [x] T347 [P] Add support for different networks (mainnet, devnet, testnet)
- [x] T348 [P] Create comprehensive .env.example with network-specific configurations
- [x] T349 [P] Update SolanaModule to include TokenConfigService

#### Shared Enums Creation (HIGH PRIORITY) ✅ COMPLETED
- [x] T332 [P] Create shared TokenType enum in src/domain/common/enums/token-type.enum.ts
- [x] T333 [P] Create shared TransactionStatus enum in src/domain/common/enums/transaction-status.enum.ts
- [x] T334 [P] Create shared WalletStatus enum in src/domain/common/enums/wallet-status.enum.ts
- [x] T335 [P] Update all entities to use shared enums instead of duplicate definitions
- [x] T336 [P] Remove duplicate enum definitions from individual entity files
- [x] T337 [P] Update all imports to use shared enums

#### Database Constraints & Indexes (HIGH PRIORITY) ✅ COMPLETED
- [x] T338 [P] Add composite unique constraint to WalletBalance entity (walletId, tokenType)
- [x] T339 [P] Add foreign key constraints to Transaction entity for wallet relationships
- [x] T340 [P] Add database indexes for frequently queried fields (userId, walletId, status, createdAt)
- [x] T341 [P] Add unique constraint validation for wallet addresses across all users
- [x] T342 [P] Add proper foreign key constraints to all entity relationships
- [x] T343 [P] Create database migration for all constraint and index changes

#### Decimal Precision Standardization (MEDIUM PRIORITY)
- [ ] T344 [P] Create common decimal column decorators for consistent precision
- [ ] T345 [P] Standardize decimal precision across all entities (18,8 for crypto, 18,2 for fiat)
- [ ] T346 [P] Update WalletBalance entity to use standardized decimal precision
- [ ] T347 [P] Update Transaction entity to use standardized decimal precision
- [ ] T348 [P] Update OnOffRamp entity to use standardized decimal precision
- [ ] T349 [P] Update VISACard entity to use standardized decimal precision

#### Entity Validation Improvements (MEDIUM PRIORITY)
- [ ] T350 [P] Add Solana address validation decorator for wallet addresses
- [ ] T351 [P] Add custom phone number validation (less restrictive than @IsPhoneNumber)
- [ ] T352 [P] Add proper email validation for contact entities
- [ ] T353 [P] Add amount validation decorators (positive numbers, minimum values)
- [ ] T354 [P] Add string length validation for all text fields
- [ ] T355 [P] Add enum validation for all status and type fields

#### User-Wallet Relationship Clarification (LOW PRIORITY)
- [ ] T356 [P] Document User-Wallet relationship as One-to-Many (supports multiple wallets)
- [ ] T357 [P] Update User entity relationship documentation
- [ ] T358 [P] Update Wallet entity relationship documentation
- [ ] T359 [P] Add business logic validation for multiple wallets per user
- [ ] T360 [P] Update API documentation to reflect multiple wallet support
- [ ] T361 [P] Add wallet management endpoints for multiple wallet support

#### Date Handling Standardization (LOW PRIORITY)
- [ ] T362 [P] Standardize all entities to use CreateDateColumn/UpdateDateColumn
- [ ] T363 [P] Remove manual timestamp handling from Inquiry entity
- [ ] T364 [P] Add timezone handling for all date fields
- [ ] T365 [P] Update all entities to use consistent date column patterns
- [ ] T366 [P] Add proper date validation decorators

#### Entity Documentation & Testing (LOW PRIORITY)
- [ ] T367 [P] Add comprehensive JSDoc comments to all entities
- [ ] T368 [P] Create entity validation tests for all constraints
- [ ] T369 [P] Create entity relationship tests
- [ ] T370 [P] Add entity migration tests
- [ ] T371 [P] Create entity performance tests for indexes
- [ ] T372 [P] Update entity relationship diagrams

### Phase 3.4.3.9: Database Architecture Analysis & Improvements (CRITICAL PATH)
**Improve database architecture based on comprehensive analysis of current design**

#### Database Architecture Validation (HIGH PRIORITY)
- [ ] T377 [P] Document current database architecture design decisions and rationale
- [ ] T378 [P] Create database architecture diagram showing entity relationships
- [ ] T379 [P] Validate WalletBalance entity design pattern (separate entity vs embedded)
- [ ] T380 [P] Document address storage strategy (primary address + JSONB for Web3Auth)
- [ ] T381 [P] Validate multi-token support architecture with separate balance records
- [ ] T382 [P] Document performance implications of current design choices

#### Balance Management Architecture Improvements (HIGH PRIORITY)
- [ ] T383 [P] Create BalanceHistory entity for tracking balance changes over time
- [ ] T384 [P] Implement balance caching strategy for frequently accessed balances
- [ ] T385 [P] Add balance refresh triggers for real-time updates after transactions
- [ ] T386 [P] Create balance aggregation views for dashboard performance
- [ ] T387 [P] Implement balance validation service to ensure data consistency
- [ ] T388 [P] Add balance audit trail for compliance and debugging

#### Address Management Improvements (MEDIUM PRIORITY)
- [ ] T389 [P] Create AddressValidationService for comprehensive address validation
- [ ] T390 [P] Implement address normalization for consistent storage
- [ ] T391 [P] Add address type detection (Solana, Ethereum, etc.) for future expansion
- [ ] T392 [P] Create address resolution cache for performance optimization
- [ ] T393 [P] Implement address change tracking for audit purposes
- [ ] T394 [P] Add address verification status tracking

#### Multi-Wallet Support Architecture (MEDIUM PRIORITY)
- [ ] T395 [P] Design multiple wallet support architecture for future expansion
- [ ] T396 [P] Create WalletType-specific fields and validation
- [ ] T397 [P] Implement wallet priority system (primary, secondary, etc.)
- [ ] T398 [P] Add wallet metadata storage for different wallet types
- [ ] T399 [P] Create wallet switching logic and user preferences
- [ ] T400 [P] Implement wallet backup and recovery mechanisms

#### Performance Optimization (MEDIUM PRIORITY)
- [ ] T401 [P] Add database indexes for common query patterns
- [ ] T402 [P] Implement query optimization for balance retrieval
- [ ] T403 [P] Create materialized views for complex aggregations
- [ ] T404 [P] Add database connection pooling configuration
- [ ] T405 [P] Implement query result caching for static data
- [x] T406 [P] Add database monitoring and performance metrics

#### Data Consistency & Integrity (MEDIUM PRIORITY)
- [ ] T407 [P] Implement database triggers for balance consistency
- [ ] T408 [P] Add foreign key constraints with proper cascade rules
- [ ] T409 [P] Create data validation stored procedures
- [ ] T410 [P] Implement soft delete patterns for audit trails
- [ ] T411 [P] Add data archiving strategy for old transactions
- [ ] T412 [P] Create data integrity monitoring and alerts

#### Migration & Schema Management (LOW PRIORITY)
- [ ] T413 [P] Create comprehensive database migration strategy
- [ ] T414 [P] Implement schema versioning and rollback procedures
- [ ] T415 [P] Add database seeding for development and testing
- [ ] T416 [P] Create database backup and restore procedures
- [ ] T417 [P] Implement database monitoring and health checks
- [ ] T418 [P] Add database documentation and maintenance guides

### Phase 3.4.3.10: Domain Architecture & Communication Improvements (CRITICAL PATH)
**Improve inter-domain communication patterns and domain separation based on architecture analysis**

#### Domain Interface Introduction (HIGH PRIORITY)
- [x] T419 [P] Create IWalletService interface in src/domain/wallet/interfaces/wallet-service.interface.ts
- [x] T420 [P] Create IUserService interface in src/domain/user/interfaces/user-service.interface.ts
- [x] T421 [P] Create ITransactionService interface in src/domain/transaction/interfaces/transaction-service.interface.ts
- [x] T422 [P] Create IContactService interface in src/domain/contact/interfaces/contact-service.interface.ts
- [x] T423 [P] Create IOnRampService interface in src/domain/onramp/interfaces/onramp-service.interface.ts
- [x] T424 [P] Create IVISACardService interface in src/domain/visa-card/interfaces/visa-card-service.interface.ts
- [x] T425 [P] Update all services to implement their respective interfaces
- [x] T426 [P] Update all service injections to use interfaces instead of concrete classes

#### Domain Service Separation (HIGH PRIORITY)
- [x] T427 [P] Create WalletBalanceService in src/domain/wallet/services/wallet-balance.service.ts
- [x] T428 [P] Move balance management methods from WalletService to WalletBalanceService
- [x] T429 [P] Create IWalletBalanceService interface for balance operations
- [x] T430 [P] Update WalletService to focus only on wallet CRUD operations
- [x] T431 [P] Update all services that depend on balance operations to use WalletBalanceService
- [x] T432 [P] Create WalletBalanceModule and export WalletBalanceService

#### Domain Event System (MEDIUM PRIORITY) ✅ COMPLETED
- [x] T433 [P] Create DomainEvent base class in src/domain/common/events/domain-event.base.ts
- [x] T434 [P] Create OnRampCreatedEvent in src/domain/onramp/events/onramp-created.event.ts
- [x] T435 [P] Create TransactionCreatedEvent in src/domain/transaction/events/transaction-created.event.ts
- [x] T436 [P] Create WalletBalanceUpdatedEvent in src/domain/wallet/events/wallet-balance-updated.event.ts
- [x] T437 [P] Create EventBus service in src/domain/common/services/event-bus.service.ts
- [x] T438 [P] Implement event publishing in OnRampService and TransactionService
- [x] T439 [P] Implement event handlers in WalletBalanceService for balance updates
- [x] T440 [P] Add EventBusModule to AppModule

#### Application Services Layer (MEDIUM PRIORITY) ✅ COMPLETED
- [x] T441 [P] Create OnRampApplicationService in src/domain/onramp/services/onramp-application.service.ts
- [x] T442 [P] Create TransactionApplicationService in src/domain/transaction/services/transaction-application.service.ts
- [x] T443 [P] Create WalletApplicationService in src/domain/wallet/services/wallet-application.service.ts
- [x] T444 [P] Move orchestration logic from controllers to application services
- [x] T445 [P] Update controllers to use application services instead of domain services
- [x] T446 [P] Create ApplicationServiceModule and export all application services

#### Domain Boundary Enforcement (MEDIUM PRIORITY) ✅ COMPLETED
- [x] T447 [P] Create domain boundary validation decorator in src/domain/common/decorators/domain-boundary.decorator.ts
- [x] T448 [P] Add domain boundary validation to all service methods
- [x] T449 [P] Create domain access control service for cross-domain operations
- [x] T450 [P] Implement domain context for tracking domain operations
- [x] T451 [P] Add domain boundary tests to ensure proper separation

#### Dependency Injection Improvements (LOW PRIORITY)
- [x] T452 [P] Create domain service factory for complex service creation
- [x] T453 [P] Implement service locator pattern for dynamic service resolution
- [x] T454 [P] Add service dependency validation at startup
- [x] T455 [P] Create service health checks for all domain services
- [x] T456 [P] Add service metrics and monitoring

#### Domain Documentation & Testing (LOW PRIORITY)
- [x] T457 [P] Create domain architecture documentation
- [x] T458 [P] Create domain communication flow diagrams
- [x] T459 [P] Add domain integration tests for all service interactions
- [x] T460 [P] Create domain mock services for testing
- [x] T461 [P] Add domain performance tests for service communication

### Phase 3.4.3.9: API Documentation Updates

#### OpenAPI Specification Updates
- [ ] T208 [P] Update OpenAPI specification with Solana endpoints
- [ ] T209 [P] Add Solana error response schemas to API documentation
- [ ] T210 [P] Update wallet endpoints documentation with real Solana operations
- [ ] T211 [P] Update transaction endpoints documentation with real Solana operations
- [ ] T275 [P] Add transfer endpoints documentation
- [ ] T276 [P] Add address resolution endpoints documentation
- [ ] T277 [P] Update error responses for all transfer-related endpoints
- [ ] T325 [P] Add Web3Auth wallet creation error responses
- [ ] T326 [P] Update transfer endpoint documentation with new /transfer path
- [ ] T327 [P] Add balance endpoint documentation (if moved to BalanceController)
- [ ] T373 [P] Add data model validation error responses
- [ ] T374 [P] Update entity documentation with new constraints and validation

#### Postman Collection Updates
- [ ] T278 [P] Update Postman collection with fixed transfer endpoints
- [ ] T279 [P] Add transfer flow examples with proper request/response
- [ ] T280 [P] Add address resolution examples
- [ ] T281 [P] Add error handling examples for transfer operations
- [ ] T328 [P] Add Web3Auth wallet creation flow examples
- [ ] T329 [P] Update transfer endpoint examples with new /transfer path
- [ ] T330 [P] Add balance endpoint examples (if moved to BalanceController)
- [ ] T331 [P] Add error handling examples for Web3Auth flow
- [ ] T375 [P] Add data model validation error examples
- [ ] T376 [P] Add multiple wallet management examples

---

# 🚀 TRANSACTION IMPLEMENTATION PRIORITIES

## Phase 1: Critical Foundation Services (MUST COMPLETE FIRST)
**These services are the foundation for all transfer operations**

### Step 1: Web3Auth Wallet Creation Improvements (T282-T306)
**Priority: CRITICAL - Fix wallet creation reliability and validation**
```typescript
// Web3Auth improvements:
- Atomic user + wallet creation (database transaction)
- Solana address validation before storage
- Address uniqueness checking across users
- Smart wallet update logic (only when addresses change)
- Enhanced error handling and rollback
```

### Step 2: Address Resolution Service (T212-T216)
**Priority: CRITICAL - Without this, transfers cannot work**
```typescript
// AddressResolutionService responsibilities:
- Resolve wallet address → user ID + wallet ID
- Validate Solana addresses
- Handle address lookup errors
- Cache address resolution results
```

### Step 3: Token Account Management (T217-T221)
**Priority: CRITICAL - Required for SPL token transfers**
```typescript
// TokenAccountService responsibilities:
- Create Associated Token Accounts (ATA) for recipients
- Derive ATA addresses for any wallet + token combination
- Validate token account existence
- Handle ATA creation errors
```

### Step 4: Solana Transfer Service (T222-T227)
**Priority: CRITICAL - Core blockchain operations**
```typescript
// SolanaTransferService responsibilities:
- Execute SOL transfers on blockchain
- Execute SPL token transfers (USDC, EURC)
- Create and sign transactions
- Handle transaction confirmation
- Manage transaction fees
```

## Phase 2: Transfer Orchestration (HIGH PRIORITY)
**Coordinates all services for complete transfer flow**

### Step 4: Transfer Orchestration Service (T228-T233)
**Priority: HIGH - Main transfer coordination**
```typescript
// TransferOrchestrationService responsibilities:
- Coordinate address resolution + ATA creation + blockchain transfer
- Validate transfers before execution
- Handle rollback on failures
- Manage transaction status updates
- Provide comprehensive error handling
```

## Phase 3: Domain Separation & Refactoring (MEDIUM PRIORITY)
**Clean up existing architecture and separate concerns**

### Step 5: Wallet Domain Cleanup (T234-T238)
**Priority: MEDIUM - Clean separation of concerns**
- Move balance management out of WalletService
- Create dedicated WalletBalanceService
- Focus WalletService on wallet CRUD only

### Step 6: Transaction Domain Enhancement (T239-T243)
**Priority: MEDIUM - Improve transaction management**
- Remove balance checking from TransactionService
- Focus on transaction CRUD and status management
- Add confirmation and status update methods

### Step 7: Transfer Domain Creation (T244-T248)
**Priority: MEDIUM - Dedicated transfer domain**
- Create TransferModule and TransferController
- Move /wallet/transfer to proper transfer domain
- Add proper validation and error handling

## Phase 4: Integration & Implementation (HIGH PRIORITY)
**Connect all services and fix the transfer flow**

### Step 8: Fix Wallet Transfer Endpoint (T249-T253)
**Priority: HIGH - Make transfers actually work**
- Update /wallet/transfer to use TransferOrchestrationService
- Implement complete transfer flow
- Add proper error handling and user feedback

### Step 9: Update Transaction Flow (T254-T258)
**Priority: HIGH - Integrate with new architecture**
- Update TransactionService to work with orchestration
- Implement transaction confirmation flow
- Add retry logic and fee management

### Step 10: Balance Management Integration (T259-T263)
**Priority: MEDIUM - Real-time balance updates**
- Sync balances with blockchain
- Implement real-time updates after transfers
- Add balance validation and caching

## Phase 5: Error Handling & Configuration (LOWER PRIORITY)
**Production readiness and error handling**

### Step 11: Error Handling Integration (T200-T203, T270-T272)
**Priority: MEDIUM - Comprehensive error handling**
- Add Solana-specific error handling
- Update all controllers with proper error responses
- Add service-specific error handling

### Step 12: Configuration Integration (T204-T207, T273-T274)
**Priority: LOW - Production configuration**
- Add environment variables
- Update Docker configuration
- Add health checks

## Phase 6: Documentation Updates (LOWER PRIORITY)
**API documentation and testing**

### Step 13: API Documentation Updates (T208-T211, T275-T281)
**Priority: LOW - Documentation and testing**
- Update OpenAPI specifications
- Update Postman collections
- Add comprehensive examples

---

## 🎯 IMPLEMENTATION STRATEGY

### **Start with Phase 1 (Critical Foundation)**
1. **T332-T337**: Shared Enums Creation - Fix duplicate enum definitions (CRITICAL)
2. **T338-T343**: Database Constraints & Indexes - Add missing constraints and indexes (CRITICAL)
3. **T377-T382**: Database Architecture Validation - Document and validate current design (CRITICAL)
4. **T419-T426**: Domain Interface Introduction - Create interfaces for all domain services (CRITICAL)
5. **T427-T432**: Domain Service Separation - Split WalletService and create WalletBalanceService (CRITICAL)
6. **T282-T306**: Web3Auth Wallet Creation Improvements - Fix reliability and validation
7. **T212-T216**: AddressResolutionService - Without this, transfers cannot work
8. **T217-T221**: TokenAccountService - Required for SPL tokens
9. **T222-T227**: SolanaTransferService - Core blockchain operations

### **Then Phase 2 (Transfer Orchestration)**
7. **T228-T233**: TransferOrchestrationService - Coordinates everything

### **Then Phase 4 (Integration)**
8. **T249-T253**: Fix /wallet/transfer endpoint - Make it actually work
9. **T254-T258**: Update transaction flow - Integrate with new architecture

### **Then Phase 3 (Domain Cleanup)**
10. **T307-T313**: Transfer Domain Creation - Move /wallet/transfer to /transfer
11. **T234-T248**: Domain separation and refactoring - Clean up architecture
12. **T314-T324**: Endpoint Organization Review - Ensure correct domain placement

### **Then Phase 5 (Data Model Polish)**
13. **T344-T349**: Decimal Precision Standardization - Standardize decimal precision
14. **T350-T355**: Entity Validation Improvements - Add proper validation
15. **T356-T361**: User-Wallet Relationship Clarification - Document multiple wallet support

### **Finally Phase 6 (Documentation)**
16. **T325-T331**: API Documentation Updates - Update specs and Postman collections
17. **T367-T372**: Entity Documentation & Testing - Add comprehensive documentation

## 🔧 IMPLEMENTATION NOTES

### **Critical Dependencies**
- **T332-T337** must complete first (Shared enums needed for all entities)
- **T338-T343** must complete before any service implementation (Database constraints needed)
- **T282-T306** should complete early (Web3Auth improvements for reliable wallet creation)
- **T212-T216** must complete before **T228-T233** (AddressResolutionService needed for orchestration)
- **T217-T221** must complete before **T228-T233** (TokenAccountService needed for SPL tokens)
- **T222-T227** must complete before **T228-T233** (SolanaTransferService needed for blockchain ops)
- **T228-T233** must complete before **T249-T253** (OrchestrationService needed for transfer endpoint)
- **T307-T313** should complete before **T249-T253** (Transfer domain needed for proper endpoint)
- **T344-T349** can run in parallel with service implementation (Decimal precision standardization)
- **T350-T355** can run in parallel with service implementation (Entity validation improvements)

### **Parallel Execution Opportunities**
- **T332-T337** can run in parallel with **T338-T343** (different types of fixes)
- **T377-T382** can run in parallel with **T332-T343** (architecture validation vs implementation fixes)
- **T419-T426** can run in parallel with **T332-T343** and **T377-T382** (interface creation vs data fixes)
- **T427-T432** can run in parallel with **T419-T426** (service separation vs interface implementation)
- **T282-T306** can run in parallel with **T212-T216**, **T217-T221**, **T222-T227** (different domains)
- **T212-T216** and **T217-T221** can run in parallel (different services)
- **T222-T227** can run in parallel with **T212-T216** and **T217-T221**
- **T433-T440** can run in parallel with service implementation (domain event system)
- **T441-T446** can run in parallel with service implementation (application services layer)
- **T383-T388** can run in parallel with service implementation (balance management improvements)
- **T389-T394** can run in parallel with service implementation (address management improvements)
- **T234-T238** and **T239-T243** can run in parallel (different domains)
- **T244-T248** can run in parallel with **T234-T243**
- **T307-T313** can run in parallel with **T234-T248** (different domains)
- **T314-T324** can run in parallel with **T234-T248** and **T307-T313** (different focus areas)
- **T344-T349** can run in parallel with service implementation (decimal precision)
- **T350-T355** can run in parallel with service implementation (validation improvements)
- **T356-T361** can run in parallel with other tasks (documentation only)
- **T395-T400** can run in parallel with other tasks (future multi-wallet support)
- **T401-T406** can run in parallel with service implementation (performance optimization)
- **T407-T412** can run in parallel with service implementation (data consistency)
- **T447-T451** can run in parallel with service implementation (domain boundary enforcement)
- **T452-T456** can run in parallel with other tasks (dependency injection improvements)
- **T457-T461** can run in parallel with other tasks (domain documentation & testing)

### **Testing Strategy**
- Test each service individually before integration
- Test data model constraints and validation before service implementation
- Test shared enums work correctly across all entities
- Test database constraints prevent invalid data
- Test database architecture design patterns and performance
- Test balance management with multiple tokens and frequent updates
- Test address storage and retrieval with Web3Auth multi-key addresses
- Test multi-wallet support architecture and data consistency
- Test domain interfaces work correctly with all implementations
- Test domain service separation (WalletService vs WalletBalanceService)
- Test domain event system with event publishing and handling
- Test application services orchestrate domain services correctly
- Test domain boundary enforcement prevents unauthorized cross-domain access
- Test Web3Auth wallet creation with various login methods (Google, Apple, Phone)
- Test address resolution with known wallet addresses
- Test ATA creation with test tokens
- Test Solana transfers on devnet first
- Test full transfer flow end-to-end
- Test atomic user + wallet creation (both succeed or both fail)
- Test address validation with valid and invalid Solana addresses
- Test address uniqueness checking across different users
- Test multiple wallet support for users
- Test decimal precision consistency across all entities
- Test entity validation with valid and invalid data
- Test database performance with large datasets
- Test data integrity and consistency across all operations
- Test domain communication patterns and service interactions
- Test domain event flow and event handling
- Test application service orchestration and error handling

## Phase 3.5: Backend Polish
- [ ] T056 [P] Unit tests for all services in backend/tests/unit/
- [ ] T057 Performance tests for API endpoints (<200ms)
- [ ] T058 [P] API documentation with Swagger
- [ ] T059 Database query optimization and indexing
- [ ] T060 Security audit and penetration testing
- [ ] T061 Load testing for 1000+ concurrent users

---

# 🌐 FRONTEND TASKS (Web App)

## Phase 3.1: Frontend Setup
- [x] T062 Create Next.js project structure
- [x] T063 [P] Configure TypeScript, ESLint, and Prettier
- [x] T064 [P] Setup React Testing Library and Jest
- [x] T065 [P] Configure Tailwind CSS for styling
- [x] T066 [P] Setup internationalization (i18n) for English/Spanish

## Phase 3.2: Frontend Tests First (TDD)
- [x] T067 [P] Component test for LoginPage in frontend/tests/components/LoginPage.test.tsx
- [x] T068 [P] Component test for Dashboard in frontend/tests/components/Dashboard.test.tsx
- [x] T069 [P] Component test for SendMoney in frontend/tests/components/SendMoney.test.tsx
- [x] T070 [P] Component test for TransactionHistory in frontend/tests/components/TransactionHistory.test.tsx
- [x] T071 [P] Component test for ContactList in frontend/tests/components/ContactList.test.tsx
- [x] T072 [P] Integration test for user registration flow in frontend/tests/integration/registration.test.tsx
- [x] T073 [P] Integration test for transaction flow in frontend/tests/integration/transaction.test.tsx

## Phase 3.3: Frontend Core Implementation

### Pages and Components
- [x] T074 [P] LoginPage component in features/authentication/components/LoginPage.tsx
- [x] T075 [P] SignupPage component in features/authentication/components/SignupPage.tsx
- [x] T076 [P] Dashboard component in features/dashboard/components/Dashboard.tsx (page: pages/dashboard/index.tsx)
- [x] T077 [P] SendMoney component in features/transactions/components/SendMoney.tsx
- [x] T078 [P] TransactionHistory component in features/transactions/components/TransactionHistory.tsx
- [x] T079 [P] ContactList component in features/contacts/components/ContactList.tsx
- [x] T080 [P] WalletBalance component in features/wallet/components/WalletBalance.tsx
- [x] T081 [P] OnRamp component in features/ramp/components/OnRamp.tsx
- [x] T082 [P] OffRamp component in features/ramp/components/OffRamp.tsx
- [x] T083 [P] VISACard component in features/visa-card/components/VISACard.tsx

### Services and Hooks
- [x] T084 [P] AuthService in features/auth/services/auth.service.ts
- [x] T085 [P] WalletService in features/wallet/services/wallet.service.ts
- [x] T086 [P] TransactionService in features/transactions/services/transaction.service.ts
- [x] T087 [P] ContactService in features/contacts/services/contact.service.ts
- [x] T088 [P] useAuth hook in features/auth/hooks/useAuth.ts
- [x] T089 [P] useWallet hook in features/wallet/hooks/useWallet.ts
- [x] T090 [P] useTransactions hook in features/transactions/hooks/useTransactions.ts

### Web3Auth Integration (Simplified)
- [x] T091 Web3Auth configuration in features/auth/config/web3auth.config.ts ✅ DONE
- [ ] T092 Web3Auth SDK initialization in features/auth/services/web3auth.service.ts
- [ ] T093 useWeb3Auth hook in features/auth/hooks/useWeb3Auth.ts
- [ ] T094 API token exchange service in features/auth/services/token-exchange.service.ts
- [ ] T095 API client with our JWT token injection in features/auth/services/api-client.ts
- [ ] T096 Route protection with our JWT tokens in features/auth/guards/AuthGuard.tsx
- [ ] T097 Web3Auth error handling in features/auth/utils/web3auth-error-handler.ts

### User Verification System (NEW)
- [ ] T098 [P] Create ProfileCompletionScreen in features/profile/components/ProfileCompletionScreen.tsx
- [ ] T099 [P] Create VerificationStatusBanner in features/profile/components/VerificationStatusBanner.tsx
- [ ] T100 [P] Create useUserVerification hook in features/profile/hooks/useUserVerification.ts
- [ ] T101 [P] Create UserVerificationService in features/profile/services/user-verification.service.ts
- [ ] T102 [P] Update AuthGuard to handle incomplete user profiles
- [ ] T103 [P] Create ProfileCompletionGuard for restricted operations
- [ ] T104 [P] Add verification status checks to all financial operations

## Phase 3.4: Frontend Web3Auth Implementation (CRITICAL PATH)
**Frontend team must follow these steps in order to integrate with our Web3Auth API**

### Step 1: Install Web3Auth Dependencies
- [ ] T098 [P] Install Web3Auth SDK packages (`@web3auth/modal`, `@web3auth/base`, `@web3auth/solana-provider`)
- [ ] T099 [P] Install JWT handling packages (`jsonwebtoken`, `jwt-decode`)

### Step 2: Web3Auth SDK Setup
- [ ] T100 [P] Web3Auth SDK initialization in features/auth/services/web3auth.service.ts
- [ ] T101 [P] Web3Auth login/logout functions in features/auth/services/web3auth-auth.service.ts

### Step 3: Token Exchange Implementation
- [ ] T102 [P] API token exchange service in features/auth/services/token-exchange.service.ts
- [ ] T103 [P] JWT token storage and management in features/auth/services/jwt-storage.service.ts
- [ ] T104 [P] Token refresh logic in features/auth/services/token-refresh.service.ts

### Step 4: API Client Integration
- [ ] T105 [P] API client with JWT token injection in features/auth/services/api-client.ts
- [ ] T106 [P] Request/response interceptors in features/auth/services/api-interceptors.ts
- [ ] T107 [P] Error handling for API calls in features/auth/services/api-error-handler.ts

### Step 5: React Hooks and Context
- [ ] T108 [P] useWeb3Auth hook in features/auth/hooks/useWeb3Auth.ts
- [ ] T109 [P] Web3Auth context provider in features/auth/contexts/Web3AuthContext.tsx
- [ ] T110 [P] useAuth hook integration in features/auth/hooks/useAuth.ts

### Step 6: Route Protection
- [ ] T111 [P] AuthGuard component in features/auth/guards/AuthGuard.tsx
- [ ] T112 [P] Protected route wrapper in features/auth/components/ProtectedRoute.tsx
- [ ] T113 [P] Login redirect logic in features/auth/utils/auth-redirect.ts

## Phase 3.5: Frontend Integration
- [ ] T114 Redux store setup in frontend/src/store/index.ts
- [ ] T115 API client configuration in frontend/src/services/api.client.ts
- [ ] T116 Error boundary components in frontend/src/components/ErrorBoundary.tsx
- [ ] T117 Loading states and skeletons in frontend/src/components/LoadingStates.tsx
- [ ] T118 Responsive design implementation
- [ ] T119 Session management (5-minute timeout)

### Advanced Web3Auth Features
- [ ] T120 Multi-wallet support in features/wallet/hooks/useMultiWallet.ts
- [ ] T121 Wallet switching logic in features/wallet/services/wallet-switcher.service.ts
- [ ] T122 Solana transaction signing in features/wallet/utils/solana-transactions.ts
- [ ] T123 Web3Auth session management in features/auth/services/session.service.ts
- [ ] T124 Web3Auth token refresh logic in features/auth/services/token-refresh.service.ts

## Phase 3.6: Frontend Polish
- [ ] T125 [P] Unit tests for all components in frontend/tests/unit/
- [ ] T126 Performance optimization and code splitting
- [ ] T127 [P] Accessibility improvements (WCAG 2.1)
- [ ] T128 [P] SEO optimization
- [ ] T129 Cross-browser testing and compatibility

---

# 📱 MOBILE TASKS (Android Kotlin)

## Phase 3.1: Android App Refactoring (CRITICAL PATH) ⚠️ MUST COMPLETE FIRST
**Refactor existing Android app to meet backend requirements and improve code quality**

### Domain-Driven Design Foundation (NEW - MUST COMPLETE FIRST)
- [x] T130 [P] Create Value Objects (Money, WalletAddress, TransactionId, UserId) in app/src/main/java/com/example/rampacashmobile/domain/valueobjects/
- [x] T131 [P] Create Rich Domain Entities (User, Wallet, Transaction, Contact) in app/src/main/java/com/example/rampacashmobile/domain/entities/
- [x] T132 [P] Create Domain Services (WalletDomainService, TransactionDomainService, ContactDomainService) in app/src/main/java/com/example/rampacashmobile/domain/services/
- [x] T133 [P] Create Repository Interfaces in domain layer in app/src/main/java/com/example/rampacashmobile/domain/repositories/
- [x] T134 [P] Create Domain Exceptions in app/src/main/java/com/example/rampacashmobile/domain/exceptions/
- [x] T135 [P] Create Domain Result types in app/src/main/java/com/example/rampacashmobile/domain/common/

### Code Quality Improvements (DDD-Aligned)
- [x] T136 [P] Break down MainViewModel into DDD-aligned ViewModels (WalletViewModel using WalletDomainService, TransactionViewModel using TransactionDomainService, ContactViewModel using ContactDomainService) - COMPLETED: Created specialized ViewModels with proper domain service integration and updated MainViewModel to use domain services directly with clean delegation pattern
- [x] T136.1 [P] Further refactor MainViewModel by extracting Web3Auth operations to Web3AuthViewModel, SPL token operations to TokenViewModel, connection management to ConnectionViewModel, and onboarding operations to OnboardingViewModel - COMPLETED: Created specialized ViewModels (Web3AuthViewModel, ConnectionViewModel, TokenViewModel, OnboardingViewModel) and refactored MainViewModel to act as a coordinator that delegates to specialized ViewModels (~315 lines vs original ~1000+ lines)
- [x] T137 [P] Split MainViewState into domain-aligned state classes (WalletState, TransactionState, ContactState) that correspond to our domain entities
- [x] T138 [P] Extract constants and magic numbers into AppConstants.kt
- [x] T139 [P] Migrate all error handling to use our domain Result<T> type and DomainError throughout the app
- [x] T140 [P] Replace excessive logging with proper logging framework (Timber)
- [x] T141 [P] Refactor large methods in MainViewModel to delegate to domain services and use our value objects
- [x] T142 [P] Implement input validation using our domain value objects and ValidationError from DomainError
- [x] T143 [P] Add comprehensive unit tests for domain services, value objects, entities, and ViewModels using domain services

### Data Model Alignment
- [x] T144 [P] Update User data class to match backend User entity (add missing fields: language, authProvider, authProviderId, status) - COMPLETED: Updated User model with all backend fields, added Language, AuthProvider, UserStatus enums
- [x] T145 [P] Create Contact data class matching backend Contact entity - COMPLETED: Created Contact model with ownerId, contactUserId, email, phone, displayName, walletAddress, isAppUser fields
- [x] T146 [P] Create VISACard data class matching backend VISACard entity - COMPLETED: Created VISACard model with cardNumber, cardType, status, balance, dailyLimit, monthlyLimit, expiresAt fields
- [x] T147 [P] Create OnOffRamp data class matching backend OnOffRamp entity - COMPLETED: Created OnOffRamp model with type, amount, fiatAmount, fiatCurrency, tokenType, status, provider, exchangeRate fields
- [x] T148 [P] Update Transaction data class to match backend Transaction entity - COMPLETED: Created Transaction model with senderId, recipientId, senderWalletId, recipientWalletId, amount, tokenType, status, solanaTransactionHash fields
- [x] T149 [P] Create Inquiry data class matching backend Inquiry entity - COMPLETED: Created Inquiry model with name, email, inquiry, type fields
- [x] T150 [P] Add proper data validation for all entities - COMPLETED: Created DataValidation utility with comprehensive validation for all entities including email, phone, Solana address, card number validation

### Backend API Integration (CRITICAL PATH)
**Integrate Android app with backend API following the Web3Auth JWT pattern**

#### API Client Setup
- [x] T151 [P] Create ApiClient with Retrofit for backend communication - COMPLETED: Created ApiClient with Retrofit configuration, JWT token injection, and all API service interfaces
- [x] T152 [P] Implement JWT token management (storage, refresh, injection) - COMPLETED: Created TokenManager for secure JWT token storage and management
- [x] T153 [P] Create API service interfaces for all backend endpoints - COMPLETED: Created all API service interfaces (Web3Auth, Wallet, Transaction, Contact, VISA Card, OnOffRamp, Inquiry)
- [x] T154 [P] Implement proper error handling for API calls - COMPLETED: Created ApiErrorHandler for converting HTTP errors to domain errors
- [x] T155 [P] Add network connectivity monitoring and offline handling - COMPLETED: Created NetworkMonitor for monitoring network connectivity status

#### Web3Auth JWT Integration
- [x] T156 [P] Update Web3Auth flow to call /auth/web3auth/validate endpoint - COMPLETED: Updated Web3AuthManager to integrate with backend API, added Web3AuthService for JWT token exchange, updated MainViewModel to use Web3AuthService
- [x] T157 [P] Implement JWT token exchange after Web3Auth login - COMPLETED: JWT token exchange is already implemented in Web3AuthService.validateWeb3AuthToken method
- [x] T158 [P] Store and manage API JWT tokens securely - COMPLETED: TokenManager handles secure JWT token storage using SharedPreferences
- [x] T159 [P] Implement token refresh logic - COMPLETED: Created TokenRefreshService with token validation and refresh logic, integrated with MainViewModel for authentication state management
- [x] T160 [P] Update authentication state management to use backend JWT tokens - COMPLETED: Updated MainViewModel with backend authentication methods, integrated TokenRefreshService, and added authentication status checking
- [x] T160.1 [P] Implement proper token refresh on 401 response - COMPLETED: Created TokenRefreshManager, updated ApiClient with 401 handling, added automatic token clearing on 401 responses
- [x] T160.2 [P] Fix Web3Auth JWT token extraction and browser launch issues - COMPLETED: Fixed JWT token extraction from userInfo.idToken, corrected Web3Auth configuration for Sapphire Devnet (BuildEnv.STAGING), added comprehensive debugging for Web3Auth response details

#### Backend Service Integration
- [x] T161 [P] Implement UserService for /auth/me, /user endpoints - COMPLETED: Implemented session persistence, auto-login on app startup, session validation on app resume, and authentication status checking
- [x] T161.1 [P] Implement session persistence and auto-login on app startup - COMPLETED: Updated MainViewModel to check backend authentication on app startup and load user data if authenticated
- [x] T161.2 [P] Add session validation and token refresh on app resume - COMPLETED: Added onAppResume() method to check authentication and refresh tokens when app resumes
- [x] T161.3 [P] Update MainViewModel to check authentication status on app startup - COMPLETED: Enhanced initializeApp() to check backend authentication first, then load user data or show login screen
- [x] T161.4 [P] Fix logout functionality - implement complete logout process - COMPLETED: Implemented complete logout flow with backend API call, local state clearing, and fallback direct logout method
- [x] T161.5 [P] Fix phone number login - detect phone login and provide appropriate error message - COMPLETED: Added phone login detection in Web3AuthService, provides clear error message when backend doesn't support phone login yet
- [x] T161.6 [P] Implement phone login onboarding flow - redirect to onboarding instead of error - COMPLETED: Implemented phone login onboarding flow that redirects users to onboarding screen to complete missing profile fields (email, firstName, lastName) instead of showing error
- [x] T161.7 [P] Update phone login flow for soft KYC - allow app access with incomplete profiles - COMPLETED: Updated phone login flow to allow users to browse the app with incomplete profiles instead of forcing immediate onboarding
- [x] T161.8 [P] Add user verification status tracking to MainViewState and UserApiModel - COMPLETED: Added verification status fields to MainViewState and updated UserApiModel to support nullable fields and verification status
- [x] T161.9 [P] Create VerificationStatusBanner component for profile completion reminders - COMPLETED: Created VerificationStatusBanner component with dismiss functionality and proper styling
- [x] T161.10 [P] Add operation restriction guards for financial operations (transactions, wallet operations) - COMPLETED: Added canPerformFinancialOperations(), canBrowseApp(), shouldShowVerificationBanner() methods to MainViewModel
- [x] T161.11 [P] Create ProfileCompletionScreen for users to complete missing profile information - COMPLETED: Created ProfileCompletionScreen with form validation and ProfileCompletionViewModel
- [x] T161.12 [P] Update MainViewModel to handle user verification status and missing fields - COMPLETED: Updated MainViewModel to track verification status, missing fields, and provide operation restriction methods
- [x] T161.13 [P] Add verification status checks to all financial operation methods - COMPLETED: Added verification status checks and operation restriction methods to MainViewModel
- [x] T161.14 [P] Update API models to support verification status and missing fields from backend - COMPLETED: Updated UserApiModel and UserProfileResponse to support nullable fields and verification status
- [x] T161.15 [P] Implement profile completion API integration with backend endpoints - COMPLETED: Added UserVerificationService with API integration for profile completion, verification status, and missing fields endpoints
- [ ] T162 [P] Implement WalletService for /wallet endpoints
- [ ] T163 [P] Implement TransactionService for /transactions endpoints
- [ ] T164 [P] Implement ContactService for /contacts endpoints
- [ ] T165 [P] Implement OnRampService for /onramp endpoints
- [ ] T166 [P] Implement OffRampService for /offramp endpoints
- [ ] T167 [P] Implement VISACardService for /visa-card endpoints

### User Verification System (NEW)
- [ ] T168 [P] Create ProfileCompletionScreen in app/src/main/java/com/example/rampacashmobile/ui/profile/ProfileCompletionScreen.kt
- [ ] T169 [P] Create VerificationStatusBanner in app/src/main/java/com/example/rampacashmobile/ui/components/VerificationStatusBanner.kt
- [ ] T170 [P] Create UserVerificationViewModel in app/src/main/java/com/example/rampacashmobile/ui/profile/UserVerificationViewModel.kt
- [ ] T171 [P] Create UserVerificationService in app/src/main/java/com/example/rampacashmobile/domain/services/UserVerificationService.kt
- [ ] T172 [P] Update MainViewModel to handle incomplete user profiles
- [ ] T173 [P] Create OperationRestrictionGuard for financial operations
- [ ] T174 [P] Add verification status checks to all financial operations
- [ ] T175 [P] Update User model to support verification status


## Phase 3.3: Missing Core Features Implementation
**Implement features required by backend specification but missing in current app**

### Contact Management
- [ ] T168 [P] Create ContactListScreen with add/edit/delete functionality
- [ ] T169 [P] Implement contact search and filtering
- [ ] T170 [P] Add contact sync with backend API
- [ ] T171 [P] Create ContactDetailScreen for viewing contact information
- [ ] T172 [P] Implement contact import from device contacts

### VISA Card Management
- [ ] T173 [P] Create VISACardScreen for card management
- [ ] T174 [P] Implement card creation and activation flow
- [ ] T175 [P] Add card balance and spending limits display
- [ ] T176 [P] Implement card suspension/reactivation functionality
- [ ] T177 [P] Create card transaction history screen

### On/Off Ramp Integration
- [ ] T178 [P] Create OnRampScreen for fiat to crypto conversion
- [ ] T179 [P] Implement SEPA transfer integration
- [ ] T180 [P] Add credit card payment integration
- [ ] T181 [P] Create OffRampScreen for crypto to fiat conversion
- [ ] T182 [P] Implement bank account management for withdrawals

### Enhanced Transaction Management
- [ ] T183 [P] Update SendScreen to use backend transaction creation
- [ ] T184 [P] Implement transaction confirmation with Solana hash
- [ ] T185 [P] Add transaction retry logic for failed transactions
- [ ] T186 [P] Create detailed transaction view screen
- [ ] T187 [P] Implement transaction filtering and search

## Phase 3.4: UI/UX Improvements
**Enhance user experience to match backend requirements**

### Dashboard Enhancements
- [ ] T188 [P] Update MainScreen to display all token balances from backend
- [ ] T189 [P] Add recent transactions widget with backend data
- [ ] T190 [P] Implement pull-to-refresh for real-time updates
- [ ] T191 [P] Add transaction statistics and analytics

### Navigation Improvements
- [ ] T192 [P] Update NavigationGraph with all required screens
- [ ] T193 [P] Implement proper deep linking for transaction success
- [ ] T194 [P] Add proper back navigation and state preservation
- [ ] T195 [P] Implement proper screen transitions and animations

### User Experience
- [ ] T196 [P] Add loading states and skeleton screens
- [ ] T197 [P] Implement proper error messages and user feedback
- [ ] T198 [P] Add confirmation dialogs for critical actions
- [ ] T199 [P] Implement proper form validation and user input handling

## Phase 3.5: Security and Compliance
**Implement security measures required for financial app**

### Security Enhancements
- [ ] T200 [P] Implement secure storage for sensitive data (JWT tokens, private keys)
- [ ] T201 [P] Add biometric authentication for sensitive operations
- [ ] T202 [P] Implement app backgrounding security (PIN prompt)
- [ ] T203 [P] Add certificate pinning for API calls
- [ ] T204 [P] Implement proper key management for Solana operations

### Compliance Features
- [ ] T205 [P] Add transaction limits and validation
- [ ] T206 [P] Implement user verification status checking
- [ ] T207 [P] Add audit logging for financial operations
- [ ] T208 [P] Implement proper data retention policies

## Phase 3.6: Testing and Quality Assurance
**Comprehensive testing for production readiness**

### Unit Testing
- [ ] T209 [P] Create unit tests for all ViewModels
- [ ] T210 [P] Add unit tests for all Use Cases
- [ ] T211 [P] Create unit tests for API services
- [ ] T212 [P] Add unit tests for data models and validation

### Integration Testing
- [ ] T213 [P] Create integration tests for API communication
- [ ] T214 [P] Add integration tests for Web3Auth flow
- [ ] T215 [P] Create integration tests for Solana operations
- [ ] T216 [P] Add integration tests for database operations

### UI Testing
- [ ] T217 [P] Create UI tests for critical user flows
- [ ] T218 [P] Add UI tests for authentication flow
- [ ] T219 [P] Create UI tests for transaction flow
- [ ] T220 [P] Add UI tests for contact management

## Phase 3.7: Performance and Optimization
**Optimize app performance and user experience**

### Performance Improvements
- [ ] T221 [P] Implement proper image loading and caching
- [ ] T222 [P] Add database query optimization
- [ ] T223 [P] Implement proper memory management
- [ ] T224 [P] Add app startup time optimization

### Monitoring and Analytics
- [ ] T225 [P] Implement crash reporting (Firebase Crashlytics)
- [ ] T226 [P] Add performance monitoring
- [ ] T227 [P] Implement user analytics (privacy-compliant)
- [ ] T228 [P] Add custom event tracking for business metrics

## Phase 3.8: Production Readiness
**Final preparations for production deployment**

### Build and Deployment
- [ ] T229 [P] Configure production build variants
- [ ] T230 [P] Implement proper signing and security
- [ ] T231 [P] Add environment-specific configurations
- [ ] T232 [P] Create automated build and deployment pipeline

### Documentation and Maintenance
- [ ] T233 [P] Create comprehensive API documentation
- [ ] T234 [P] Add code documentation and comments
- [ ] T235 [P] Create user guide and help documentation
- [ ] T236 [P] Implement proper error reporting and monitoring

---

# 🚨 ANDROID APP CRITICAL PATH ANALYSIS

## Current State vs Requirements Gap

### ❌ **CRITICAL ISSUES IDENTIFIED:**

1. **Backend Integration Missing**: App uses local Solana operations but doesn't integrate with backend API
2. **Data Model Mismatch**: Current models don't match backend data model (User, Contact, VISACard, OnOffRamp missing)
3. **Authentication Flow Incomplete**: Web3Auth exists but doesn't follow backend JWT token exchange pattern
4. **Missing Core Features**: Contact management, VISA card, on/off ramp functionality completely missing
5. **Code Quality Issues**: Large classes, complex state management, inconsistent error handling
6. **Security Gaps**: No proper JWT token management, missing compliance features

### ✅ **WHAT'S WORKING:**
- Basic Solana integration with Web3Auth
- Compose UI structure
- Basic transaction flow (local only)
- Hilt dependency injection setup

## Priority Order for Android Tasks

### **Phase 1: CRITICAL FOUNDATION (Must Complete First)**
1. **T130-T135**: Domain-Driven Design foundation (Value Objects, Rich Entities, Domain Services)
2. **T136-T143**: Code quality improvements and refactoring
3. **T144-T150**: Data model alignment with backend
4. **T151-T160**: Backend API integration and Web3Auth JWT flow

### **Phase 2: CORE FEATURES (High Priority)**
5. **T161-T167**: Backend service integration
6. **T168-T187**: Missing core features (contacts, VISA card, on/off ramp)

### **Phase 3: ENHANCEMENT (Medium Priority)**
7. **T188-T199**: UI/UX improvements
8. **T200-T208**: Security and compliance

### **Phase 4: PRODUCTION (Lower Priority)**
9. **T209-T236**: Testing, performance, and production readiness

---

# 📱 MOBILE TASKS (iOS - Future)

## Phase 4.1: iOS Setup (Future)
- [ ] T231 Create iOS project structure with Swift
- [ ] T232 [P] Configure Xcode project settings
- [ ] T233 [P] Setup SwiftLint and formatting
- [ ] T234 [P] Configure iOS deployment target (iOS 14+)

### iOS Implementation (Future)
- [ ] T235 [P] LoginViewController in ios/RampaRemittances/LoginViewController.swift
- [ ] T236 [P] DashboardViewController in ios/RampaRemittances/DashboardViewController.swift
- [ ] T237 [P] SendMoneyViewController in ios/RampaRemittances/SendMoneyViewController.swift
- [ ] T238 [P] TransactionHistoryViewController in ios/RampaRemittances/TransactionHistoryViewController.swift
- [ ] T239 [P] ContactListViewController in ios/RampaRemittances/ContactListViewController.swift
- [ ] T240 [P] WalletService in ios/RampaRemittances/Services/WalletService.swift
- [ ] T241 [P] AuthService in ios/RampaRemittances/Services/AuthService.swift

### iOS Security (Future)
- [ ] T242 [P] PIN authentication implementation (iOS)
- [ ] T243 [P] Biometric authentication implementation (iOS)
- [ ] T244 [P] Secure storage for sensitive data
- [ ] T245 [P] App backgrounding security (PIN prompt)

### iOS Integration (Future)
- [ ] T246 [P] Web3Auth integration (iOS)
- [ ] T247 [P] Solana wallet integration (iOS)
- [ ] T248 [P] Push notifications setup
- [ ] T249 [P] Deep linking implementation
- [ ] T250 [P] Offline data synchronization

### iOS Polish (Future)
- [ ] T251 [P] Unit tests for all iOS components
- [ ] T252 [P] UI/UX testing and optimization
- [ ] T253 [P] Performance optimization
- [ ] T254 [P] Accessibility improvements
- [ ] T255 [P] App store preparation and metadata

---

# 🔄 INTEGRATION TASKS

## Phase 3.6: End-to-End Integration
- [ ] T181 [P] End-to-end test for complete user flow (web)
- [ ] T182 [P] End-to-end test for complete user flow (mobile)
- [ ] T183 [P] Cross-platform data synchronization testing
- [ ] T184 [P] API contract validation testing
- [ ] T185 [P] Performance testing under load

## Phase 3.7: Deployment and DevOps
- [ ] T186 [P] Backend deployment configuration
- [ ] T187 [P] Frontend deployment configuration
- [ ] T188 [P] Mobile app store deployment
- [ ] T189 [P] CI/CD pipeline setup
- [ ] T190 [P] Monitoring and logging setup

---

# 📊 TASK DEPENDENCIES

## Critical Path
1. **Backend Setup Phase** (T001-T006) - Can run in parallel
2. **Backend Test Phase** (T007-T023) - Must complete before implementation
3. **Backend Core Implementation** (T024-T044) - Depends on tests
4. **Backend Integration** (T050-T055) - Depends on core
5. **Web3Auth User Verification System** (T153-T182) - CRITICAL: Must complete before any user operations
6. **Solana Blockchain Implementation** (T123-T152) - CRITICAL: Must complete before frontend can work with real blockchain
7. **Solana Module Integration** (T183-T211) - CRITICAL: Must complete to connect Solana services with existing modules
8. **Frontend Setup Phase** (T062-T066) - Can run in parallel with backend
9. **Frontend Test Phase** (T067-T073) - Must complete before implementation
10. **Frontend Core Implementation** (T074-T094) - Depends on tests
11. **Frontend User Verification System** (T098-T104) - Depends on backend verification system
12. **Frontend Integration** (T095-T100) - Depends on core
13. **Android App Refactoring** (T130-T137) - CRITICAL: Must complete first for Android
14. **Android Data Model Alignment** (T138-T144) - Depends on refactoring
15. **Android Backend Integration** (T145-T154) - Depends on data model alignment
16. **Android User Verification System** (T168-T175) - Depends on backend verification system
17. **Android Core Features** (T155-T181) - Depends on backend integration
18. **Android Enhancement** (T182-T202) - Depends on core features
19. **Android Production** (T203-T230) - Final phase

## Parallel Execution Examples

### Backend Contract Tests (Can run together)
```bash
# Launch T007-T018 together:
Task: "Contract test POST /auth/signup in backend/tests/contract/test_auth_signup.test.ts"
Task: "Contract test POST /auth/login in backend/tests/contract/test_auth_login.test.ts"
Task: "Contract test GET /wallet/balance in backend/tests/contract/test_wallet_balance.test.ts"
# ... (all contract tests)
```

### Frontend Component Tests (Can run together)
```bash
# Launch T067-T072 together:
Task: "Component test for LoginPage in frontend/tests/components/LoginPage.test.tsx"
Task: "Component test for Dashboard in frontend/tests/components/Dashboard.test.tsx"
Task: "Component test for SendMoney in frontend/tests/components/SendMoney.test.tsx"
# ... (all component tests)
```

### Android Refactoring Tasks (Can run together)
```bash
# Launch T130-T137 together:
Task: "Break down MainViewModel into smaller, focused ViewModels"
Task: "Split MainViewState into focused state classes"
Task: "Extract constants and magic numbers into AppConstants.kt"
Task: "Implement consistent error handling with Result types"
# ... (all refactoring tasks)
```

### Android Data Model Tasks (Can run together)
```bash
# Launch T138-T144 together:
Task: "Update User data class to match backend User entity"
Task: "Create Contact data class matching backend Contact entity"
Task: "Create VISACard data class matching backend VISACard entity"
# ... (all data model tasks)
```

### Android API Integration Tasks (Can run together)
```bash
# Launch T145-T154 together:
Task: "Create ApiClient with Retrofit for backend communication"
Task: "Implement JWT token management"
Task: "Create API service interfaces for all backend endpoints"
# ... (all API integration tasks)
```

## Notes
- **[P] tasks** = different files, no dependencies
- **Verify tests fail** before implementing
- **Commit after each task** for rollback capability
- **Backend tasks** must complete before frontend/mobile can integrate
- **Mobile tasks** can run in parallel with frontend after backend is ready
- **Integration tasks** require all platforms to be complete

## Validation Checklist
- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] Clear separation between backend, frontend, and mobile
- [ ] No task modifies same file as another [P] task
- [ ] Android tasks address code quality issues identified
- [ ] Android tasks align with backend data model
- [ ] Android tasks implement missing core features
- [ ] Android tasks follow proper dependency order

---

# 🔐 WEB3AUTH IMPLEMENTATION PRIORITIES

## Phase 1: Backend Web3Auth Migration (CRITICAL PATH)
**Must complete in order - no parallel execution**

### Step 1: Remove Unused Auth Endpoints (T103-T109)
- Remove /auth/signup, /auth/login, /auth/refresh, /auth/verify-email, /auth/resend-verification, /auth/forgot-password, /auth/reset-password
- These are replaced by Web3Auth's built-in authentication

### Step 2: Web3Auth JWT Validation Infrastructure (T110-T114)
- Web3Auth JWT validation service
- Web3Auth middleware for token extraction
- JWT extractor utilities
- Web3Auth configuration
- Web3Auth error handling

### Step 3: Web3Auth Passport Strategy (T115-T116)
- Web3Auth Passport strategy for token validation
- Web3Auth guard for route protection

### Step 4: Web3Auth API Endpoints (T117-T118)
- POST /auth/web3auth/validate (validate Web3Auth tokens)

## Phase 2: Frontend Web3Auth Integration
**Can run in parallel after Phase 1**

- [ ] T092: Web3Auth Context Provider
- [ ] T093: useWeb3Auth Hook
- [ ] T094: JWT Token Management
- [ ] T095: API Client Integration
- [ ] T096: Route Protection

## Phase 3: Advanced Web3Auth Features
**Optional - can be implemented later**

- [ ] T109: Multi-wallet support
- [ ] T110: Wallet switching logic
- [ ] T111: Solana transaction signing
- [ ] T112: Web3Auth session management
- [ ] T113: Web3Auth token refresh logic

## Implementation Notes
- **T103-T119** are the core Web3Auth migration tasks (backend)
- **T092-T096** are frontend tasks that depend on backend completion
- **T109-T113** are advanced features that can be added incrementally
- This approach gives you Web3Auth user experience with your existing JWT system

---

# 📱 ANDROID APP IMPLEMENTATION PRIORITIES

## Phase 1: Critical Foundation (MUST COMPLETE FIRST)
**Address code quality issues and align with backend requirements**

### Step 1: Domain-Driven Design Foundation (T130-T135)
- Create Value Objects (Money, WalletAddress, TransactionId, UserId)
- Create Rich Domain Entities (User, Wallet, Transaction, Contact)
- Create Domain Services (WalletDomainService, TransactionDomainService, ContactDomainService)
- Create Repository Interfaces in domain layer
- Create Domain Exceptions and Result types

### Step 2: Code Quality Refactoring (T136-T143)
- Break down MainViewModel (1424 lines) into focused ViewModels
- Split MainViewState (20+ properties) into smaller state classes
- Extract constants and magic numbers
- Implement consistent error handling with Result types
- Replace excessive logging with proper framework
- Refactor large methods into smaller, focused methods
- Add comprehensive unit tests

### Step 3: Data Model Alignment (T144-T150)
- Update User model to match backend User entity
- Create missing models: Contact, VISACard, OnOffRamp, Inquiry
- Update Transaction model to match backend specification
- Add proper data validation for all entities

### Step 4: Backend API Integration (T151-T160)
- Create ApiClient with Retrofit for backend communication
- Implement JWT token management and refresh logic
- Update Web3Auth flow to use backend JWT token exchange
- Create API service interfaces for all backend endpoints

## Phase 2: Core Features Implementation (HIGH PRIORITY)
**Implement missing features required by backend specification**

### Step 5: Backend Service Integration (T161-T167)
- Implement UserService for /auth/me, /user endpoints
- Implement WalletService for /wallet endpoints
- Implement TransactionService for /transactions endpoints
- Implement ContactService for /contacts endpoints
- Implement OnRampService and OffRampService
- Implement VISACardService for /visa-card endpoints

### Step 6: Missing Core Features (T168-T187)
- Create ContactListScreen with full CRUD functionality
- Create VISACardScreen for card management
- Create OnRampScreen and OffRampScreen for fiat conversion
- Update SendScreen to use backend transaction creation
- Implement transaction confirmation with Solana hash

## Phase 3: Enhancement and Polish (MEDIUM PRIORITY)
**Improve user experience and add production features**

### Step 7: UI/UX Improvements (T188-T199)
- Update MainScreen to display backend data
- Add proper loading states and error handling
- Implement pull-to-refresh and real-time updates
- Add transaction statistics and analytics

### Step 8: Security and Compliance (T200-T208)
- Implement secure storage for sensitive data
- Add biometric authentication for sensitive operations
- Implement transaction limits and validation
- Add audit logging for financial operations

## Phase 4: Production Readiness (LOWER PRIORITY)
**Final preparations for production deployment**

### Step 9: Testing and Quality Assurance (T209-T220)
- Create comprehensive unit tests for all components
- Add integration tests for API communication
- Create UI tests for critical user flows

### Step 10: Performance and Monitoring (T221-T228)
- Implement proper image loading and caching
- Add performance monitoring and crash reporting
- Implement user analytics (privacy-compliant)

### Step 11: Production Deployment (T229-T236)
- Configure production build variants
- Implement proper signing and security
- Create automated build and deployment pipeline
- Add comprehensive documentation

## Implementation Notes
- **T130-T135** are critical DDD foundation tasks (must complete first)
- **T136-T143** are critical refactoring tasks (depends on DDD foundation)
- **T144-T150** are data model alignment tasks (depends on refactoring)
- **T151-T160** are backend integration tasks (depends on data model)
- **T161-T187** are core feature tasks (depends on backend integration)
- **T188-T236** are enhancement and production tasks (can be done incrementally)
- This approach ensures the Android app meets backend requirements and production standards

---

# 🏗️ DOMAIN-DRIVEN DESIGN IMPLEMENTATION DETAILS

## DDD Architecture Overview
**Hybrid DDD approach that enforces domain boundaries while keeping it practical for Android development**

### Domain Layer Structure
```
app/src/main/java/com/example/rampacashmobile/domain/
├── entities/                    # Rich Domain Entities
│   ├── User.kt                 # Rich User entity with business logic
│   ├── Wallet.kt               # Rich Wallet entity with validation
│   ├── Transaction.kt          # Rich Transaction entity with rules
│   └── Contact.kt              # Rich Contact entity with business methods
├── valueobjects/               # Value Objects
│   ├── Money.kt                # Money value object with currency validation
│   ├── WalletAddress.kt        # Wallet address value object
│   ├── TransactionId.kt        # Transaction ID value object
│   └── UserId.kt               # User ID value object
├── services/                   # Domain Services
│   ├── WalletDomainService.kt  # Wallet business logic
│   ├── TransactionDomainService.kt # Transaction business logic
│   └── ContactDomainService.kt # Contact business logic
├── repositories/               # Repository Interfaces (Domain Contracts)
│   ├── WalletRepository.kt     # Wallet data access contract
│   ├── TransactionRepository.kt # Transaction data access contract
│   └── ContactRepository.kt    # Contact data access contract
├── exceptions/                 # Domain Exceptions
│   ├── DomainException.kt      # Base domain exception
│   ├── InsufficientFundsException.kt
│   └── InvalidTransactionException.kt
└── common/                     # Domain Common Types
    ├── Result.kt               # Result type for error handling
    └── DomainError.kt          # Domain error types
```

### Key DDD Principles Implementation

#### 1. Value Objects (T130)
```kotlin
// Example: Money value object
@JvmInline
value class Money(val amount: BigDecimal, val currency: Currency) {
    init {
        require(amount >= BigDecimal.ZERO) { "Amount cannot be negative" }
    }
    
    operator fun plus(other: Money): Money {
        require(currency == other.currency) { "Cannot add different currencies" }
        return Money(amount + other.amount, currency)
    }
    
    fun isGreaterThan(other: Money): Boolean {
        require(currency == other.currency) { "Cannot compare different currencies" }
        return amount > other.amount
    }
}
```

#### 2. Rich Domain Entities (T131)
```kotlin
// Example: Rich User entity
class User private constructor(
    val id: UserId,
    private var _email: Email,
    private var _walletAddress: WalletAddress,
    private var _status: UserStatus
) {
    fun changeEmail(newEmail: Email): Result<Unit> {
        return if (canChangeEmail()) {
            _email = newEmail
            Result.success(Unit)
        } else {
            Result.failure(UserCannotChangeEmailException())
        }
    }
    
    fun activate(): Result<Unit> {
        return if (canActivate()) {
            _status = UserStatus.ACTIVE
            Result.success(Unit)
        } else {
            Result.failure(UserCannotActivateException())
        }
    }
    
    private fun canChangeEmail(): Boolean = _status != UserStatus.SUSPENDED
    private fun canActivate(): Boolean = _status == UserStatus.PENDING
}
```

#### 3. Domain Services (T132)
```kotlin
// Example: Transaction domain service
class TransactionDomainService @Inject constructor(
    private val walletRepository: WalletRepository,
    private val transactionRepository: TransactionRepository
) {
    suspend fun processTransaction(
        fromWallet: Wallet,
        toWallet: Wallet,
        amount: Money
    ): Result<Transaction> {
        return validateTransaction(fromWallet, toWallet, amount)
            .flatMap { createTransaction(fromWallet, toWallet, amount) }
            .flatMap { executeTransaction(it) }
    }
    
    private fun validateTransaction(
        fromWallet: Wallet,
        toWallet: Wallet,
        amount: Money
    ): Result<Unit> {
        return when {
            !fromWallet.canSend(amount) -> Result.failure(InsufficientFundsException())
            fromWallet == toWallet -> Result.failure(CannotSendToSelfException())
            amount.isZero() -> Result.failure(ZeroAmountException())
            else -> Result.success(Unit)
        }
    }
}
```

#### 4. Repository Interfaces (T133)
```kotlin
// Example: Wallet repository interface
interface WalletRepository {
    suspend fun findById(id: WalletId): Result<Wallet>
    suspend fun findByAddress(address: WalletAddress): Result<Wallet>
    suspend fun save(wallet: Wallet): Result<Unit>
    suspend fun update(wallet: Wallet): Result<Unit>
    suspend fun delete(id: WalletId): Result<Unit>
}
```

#### 5. Domain Exceptions (T134)
```kotlin
// Example: Domain exception hierarchy
abstract class DomainException(message: String, cause: Throwable? = null) : Exception(message, cause)

class InsufficientFundsException(message: String = "Insufficient funds for transaction") : DomainException(message)
class InvalidTransactionException(message: String = "Invalid transaction") : DomainException(message)
class UserCannotChangeEmailException(message: String = "User cannot change email") : DomainException(message)
```

#### 6. Result Types (T135)
```kotlin
// Example: Result type for error handling
sealed class Result<out T> {
    data class Success<out T>(val data: T) : Result<T>()
    data class Failure(val error: DomainError) : Result<Nothing>()
    
    inline fun <R> map(transform: (T) -> R): Result<R> = when (this) {
        is Success -> Success(transform(data))
        is Failure -> this
    }
    
    inline fun <R> flatMap(transform: (T) -> Result<R>): Result<R> = when (this) {
        is Success -> transform(data)
        is Failure -> this
    }
}
```

### DDD Benefits for Android App
- **Clear Business Logic**: Domain rules are explicit and testable
- **Maintainable**: Changes to business rules are localized
- **Testable**: Domain logic can be unit tested independently
- **Flexible**: Easy to add new features without breaking existing code
- **Android-Friendly**: Not overly complex for mobile development
- **Backend Aligned**: Matches your backend domain model

---

# 🔐 WEB3AUTH USER VERIFICATION SYSTEM IMPLEMENTATION

## Overview
**Implement a user verification system that allows incomplete user profiles to explore the app while restricting financial operations until profile completion**

### Key Concepts
1. **Incomplete User Creation**: Create users with missing information as `PENDING_VERIFICATION`
2. **Verification Status Tracking**: Track user verification status and missing fields
3. **Profile Completion Flow**: Allow users to complete missing information
4. **Operation Restrictions**: Block financial operations for unverified users
5. **Gradual Activation**: Activate users after profile completion

## Implementation Strategy

### Phase 1: Backend User Verification System (T153-T182)
**Must complete first - no parallel execution**

#### Step 1: User Entity Updates (T153-T157)
```typescript
// Add to User entity - SEPARATE FIELDS FOR DIFFERENT PURPOSES

// verificationStatus: Tracks profile completeness and data collection
export enum UserVerificationStatus {
    PENDING_VERIFICATION = 'pending_verification',  // Missing required info
    VERIFIED = 'verified',                          // Profile complete
    REJECTED = 'rejected',                          // Profile rejected
}

// userStatus: Tracks account state and business rules
export enum UserStatus {
    ACTIVE = 'active',                              // Account active
    SUSPENDED = 'suspended',                        // Account suspended
    PENDING_VERIFICATION = 'pending_verification',  // Account pending (new users)
}

// Update User entity fields
@Column({ unique: true, nullable: true }) // Make optional
email?: string;

@Column({ name: 'first_name', nullable: true }) // Make optional
firstName?: string;

@Column({ name: 'last_name', nullable: true }) // Make optional
lastName?: string;

// Profile completeness tracking
@Column({
    name: 'verification_status',
    type: 'enum',
    enum: UserVerificationStatus,
    default: UserVerificationStatus.PENDING_VERIFICATION,
})
verificationStatus: UserVerificationStatus;

// Account state tracking
@Column({
    name: 'status',
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
})
status: UserStatus;

@Column({ name: 'verification_completed_at', nullable: true })
verificationCompletedAt?: Date;
```

#### Step 2: Web3Auth User Creation Logic (T158-T163)
```typescript
// Update Web3AuthUser interface
export interface Web3AuthUser {
    id: string;
    email?: string; // Make optional
    phone?: string; // Add phone support
    firstName?: string; // Make optional
    lastName?: string; // Make optional
    profileImage?: string;
    verifier: string;
    verifierId: string;
    typeOfLogin: string;
    aggregateVerifier?: string;
    aggregateVerifierId?: string;
    loginMethod?: string; // Add login method detection
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };
}

// Smart user creation based on login method
private getLoginMethod(aggregateVerifier: string): string {
    if (aggregateVerifier.includes('sms-passwordless')) return 'phone';
    if (aggregateVerifier.includes('apple')) return 'apple';
    if (aggregateVerifier.includes('google')) return 'google';
    if (aggregateVerifier.includes('email-passwordless')) return 'email';
    return 'unknown';
}

// Create incomplete user for phone/email login
private async createIncompleteUser(web3AuthUser: Web3AuthUser): Promise<User> {
    return await this.userService.create({
        email: web3AuthUser.email,
        phone: web3AuthUser.phone,
        firstName: web3AuthUser.firstName || 'User',
        lastName: web3AuthUser.lastName || 'User',
        authProvider: this.mapVerifierToAuthProvider(web3AuthUser.verifier),
        authProviderId: web3AuthUser.verifierId,
        language: Language.EN,
        verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
        status: UserStatus.PENDING_VERIFICATION,
    });
}

// Create complete user for Google login
private async createCompleteUser(web3AuthUser: Web3AuthUser): Promise<User> {
    const [firstName, ...lastNameParts] = web3AuthUser.name.split(' ');
    return await this.userService.create({
        email: web3AuthUser.email,
        firstName: firstName || 'User',
        lastName: lastNameParts.join(' ') || 'User',
        authProvider: this.mapVerifierToAuthProvider(web3AuthUser.verifier),
        authProviderId: web3AuthUser.verifierId,
        language: Language.EN,
        verificationStatus: UserVerificationStatus.VERIFIED,
        status: UserStatus.ACTIVE,
    });
}
```

#### Step 3: User Verification Service (T164-T168)
```typescript
@Injectable()
export class UserVerificationService {
    async completeProfile(userId: string, profileData: CompleteProfileDto): Promise<User> {
        // Validate required fields
        const missingFields = await this.getMissingFields(userId);
        if (missingFields.length > 0) {
            throw new BadRequestException('Missing required fields: ' + missingFields.join(', '));
        }

        // Update user profile
        const user = await this.userService.update(userId, profileData);
        
        // Verify user if all required fields are provided
        if (this.isProfileComplete(user)) {
            await this.verifyUser(userId);
        }

        return user;
    }

    async verifyUser(userId: string): Promise<User> {
        return await this.userService.update(userId, {
            verificationStatus: UserVerificationStatus.VERIFIED,
            status: UserStatus.ACTIVE,
            verificationCompletedAt: new Date(),
        });
    }

    async getMissingFields(userId: string): Promise<string[]> {
        const user = await this.userService.findById(userId);
        const missingFields: string[] = [];

        if (!user.email) missingFields.push('email');
        if (!user.firstName || user.firstName === 'User') missingFields.push('firstName');
        if (!user.lastName || user.lastName === 'User') missingFields.push('lastName');

        return missingFields;
    }

    private isProfileComplete(user: User): boolean {
        return !!(user.email && 
                 user.firstName && 
                 user.lastName && 
                 user.firstName !== 'User' && 
                 user.lastName !== 'User');
    }
}
```

#### Step 4: User Verification Controller (T169-T173)
```typescript
@Controller('user')
export class UserVerificationController {
    @Post('complete-profile')
    @UseGuards(JwtAuthGuard)
    async completeProfile(
        @Request() req: any,
        @Body() completeProfileDto: CompleteProfileDto,
    ): Promise<{ user: User; message: string }> {
        const user = await this.userVerificationService.completeProfile(
            req.user.id,
            completeProfileDto,
        );
        return {
            user,
            message: 'Profile completed successfully',
        };
    }

    @Get('verification-status')
    @UseGuards(JwtAuthGuard)
    async getVerificationStatus(@Request() req: any): Promise<VerificationStatusDto> {
        const missingFields = await this.userVerificationService.getMissingFields(req.user.id);
        return {
            verificationStatus: req.user.verificationStatus,
            missingFields,
            isVerified: req.user.verificationStatus === UserVerificationStatus.VERIFIED,
        };
    }
}
```

#### Step 5: Operation Restrictions (T174-T178)
```typescript
@Injectable()
export class UserVerificationGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check BOTH conditions for financial operations
        if (user.verificationStatus !== UserVerificationStatus.VERIFIED) {
            throw new ForbiddenException('Profile verification required for this operation');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException('Account must be active for this operation');
        }

        return true;
    }
}

// Apply to financial operations
@Controller('transactions')
export class TransactionController {
    @Post()
    @UseGuards(JwtAuthGuard, UserVerificationGuard) // Add verification guard
    async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
        // Transaction logic
    }
}

// Business logic examples
class UserBusinessLogic {
    canPerformFinancialOperations(user: User): boolean {
        return user.verificationStatus === UserVerificationStatus.VERIFIED && 
               user.status === UserStatus.ACTIVE;
    }

    canBrowseApp(user: User): boolean {
        return user.status === UserStatus.ACTIVE || 
               user.status === UserStatus.PENDING_VERIFICATION;
    }

    shouldShowProfileCompletion(user: User): boolean {
        return user.verificationStatus === UserVerificationStatus.PENDING_VERIFICATION;
    }

    isAccountSuspended(user: User): boolean {
        return user.status === UserStatus.SUSPENDED;
    }
}
```

### Phase 2: Frontend User Verification System (T098-T104)
**Can run in parallel after Phase 1**

#### Profile Completion Screen
```typescript
// ProfileCompletionScreen.tsx
export const ProfileCompletionScreen: React.FC = () => {
    const { user, completeProfile } = useUserVerification();
    const [formData, setFormData] = useState({
        email: user?.email || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await completeProfile(formData);
    };

    return (
        <div className="profile-completion">
            <h2>Complete Your Profile</h2>
            <form onSubmit={handleSubmit}>
                {/* Form fields for missing information */}
            </form>
        </div>
    );
};
```

#### Verification Status Banner
```typescript
// VerificationStatusBanner.tsx
export const VerificationStatusBanner: React.FC = () => {
    const { verificationStatus, missingFields } = useUserVerification();

    if (verificationStatus === 'verified') return null;

    return (
        <div className="verification-banner">
            <p>Complete your profile to access all features</p>
            <Link to="/profile/complete">Complete Profile</Link>
        </div>
    );
};
```

### Phase 3: Mobile User Verification System (T168-T175)
**Can run in parallel after Phase 1**

#### Profile Completion Screen
```kotlin
// ProfileCompletionScreen.kt
@Composable
fun ProfileCompletionScreen(
    viewModel: UserVerificationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column {
        Text("Complete Your Profile")
        // Form fields for missing information
        Button(
            onClick = { viewModel.completeProfile() }
        ) {
            Text("Complete Profile")
        }
    }
}
```

#### Verification Status Banner
```kotlin
// VerificationStatusBanner.kt
@Composable
fun VerificationStatusBanner(
    verificationStatus: UserVerificationStatus
) {
    if (verificationStatus == UserVerificationStatus.VERIFIED) return

    Card {
        Text("Complete your profile to access all features")
        Button(onClick = { /* Navigate to profile completion */ }) {
            Text("Complete Profile")
        }
    }
}
```

## User Flow Examples

### Phone Login Flow
1. User logs in with phone number
2. System creates user with `PENDING_VERIFICATION` status
3. User can browse app but sees verification banner
4. User completes profile with email, firstName, lastName
5. System verifies user and activates account
6. User can now perform financial operations

### Google Login Flow
1. User logs in with Google
2. System creates user with `VERIFIED` status (complete info)
3. User can immediately perform all operations
4. No verification required

### Apple/Email Login Flow
1. User logs in with Apple/Email
2. System creates user with `PENDING_VERIFICATION` status
3. User completes profile with firstName, lastName
4. System verifies user and activates account
5. User can now perform financial operations

## Benefits
- **Better User Experience**: Users can explore before committing
- **Reduced Friction**: No immediate data collection required
- **Compliance Ready**: Easy to add KYC requirements later
- **Flexible**: Supports all Web3Auth login methods
- **Secure**: Financial operations require verification

## Why Separate verificationStatus and userStatus Fields?

### **Different Purposes & Lifecycles**

**`verificationStatus`** - **Profile Completeness**
- **Purpose**: Tracks whether user has provided required information
- **Changes**: When user completes profile or admin rejects it
- **Related to**: Data collection, KYC compliance, profile management
- **Values**: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`

**`userStatus`** - **Account State**
- **Purpose**: Tracks whether account is active/suspended
- **Changes**: When admin takes action or user violates terms
- **Related to**: Account management, business rules, security
- **Values**: `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`

### **Real-World Scenarios**

```typescript
// Scenario 1: User completes profile but gets suspended
{
  verificationStatus: 'VERIFIED',     // ✅ Profile complete
  userStatus: 'SUSPENDED'            // ❌ Account suspended by admin
  // Result: Can't perform financial operations (suspended account)
}

// Scenario 2: User has incomplete profile but account is active
{
  verificationStatus: 'PENDING_VERIFICATION', // ❌ Missing info
  userStatus: 'ACTIVE'                       // ✅ Account active
  // Result: Can browse app but can't perform financial operations
}

// Scenario 3: User profile rejected but account still active
{
  verificationStatus: 'REJECTED',     // ❌ Profile rejected
  userStatus: 'ACTIVE'               // ✅ Account still active
  // Result: Can browse app but needs to resubmit profile
}

// Scenario 4: New user with incomplete profile
{
  verificationStatus: 'PENDING_VERIFICATION', // ❌ Missing info
  userStatus: 'PENDING_VERIFICATION'         // ❌ Account pending
  // Result: Can browse app, needs to complete profile
}
```

### **Business Logic Benefits**

```typescript
// Financial operations require BOTH conditions
if (user.verificationStatus === 'VERIFIED' && user.userStatus === 'ACTIVE') {
  // Allow transactions, wallet operations, etc.
}

// Profile completion only checks verification
if (user.verificationStatus === 'PENDING_VERIFICATION') {
  // Show profile completion screen
}

// Admin actions only affect userStatus
if (user.userStatus === 'SUSPENDED') {
  // Block all operations, show suspension message
}

// App browsing depends on userStatus
if (user.userStatus === 'ACTIVE' || user.userStatus === 'PENDING_VERIFICATION') {
  // Allow browsing, viewing balances, etc.
}
```

### **Future Flexibility**

**KYC Integration:**
```typescript
// Future: Add KYC verification levels
export enum UserVerificationStatus {
  PENDING_VERIFICATION = 'pending_verification',
  PROFILE_COMPLETE = 'profile_complete',      // Basic info provided
  KYC_PENDING = 'kyc_pending',               // Waiting for KYC
  KYC_VERIFIED = 'kyc_verified',             // KYC approved
  REJECTED = 'rejected',
}
```

**Account Management:**
```typescript
// Future: Add more account states
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  FROZEN = 'frozen',                         // Temporary freeze
  CLOSED = 'closed',                         // Account closed
}
```

### **Database Queries**

```sql
-- Find users who can perform financial operations
SELECT * FROM user 
WHERE verification_status = 'VERIFIED' 
AND status = 'ACTIVE';

-- Find users who need profile completion
SELECT * FROM user 
WHERE verification_status = 'PENDING_VERIFICATION';

-- Find suspended users
SELECT * FROM user 
WHERE status = 'SUSPENDED';

-- Find new users (both pending)
SELECT * FROM user 
WHERE verification_status = 'PENDING_VERIFICATION' 
AND status = 'PENDING_VERIFICATION';
```

---

# ⚡ SOLANA BLOCKCHAIN IMPLEMENTATION PRIORITIES

## Phase 1: Solana Package Installation (CRITICAL PATH)
**Must complete first - no parallel execution**

### Step 1: Install Required Packages (T123-T126)
- Install @solana/web3.js for core blockchain operations
- Install @solana/spl-token for SPL token operations
- Install @solana/wallet-adapter-base for wallet integration
- Update package.json with all Solana dependencies

## Phase 2: Core Solana Services (CRITICAL PATH)
**Must complete before any blockchain operations**

### Step 2: Solana Service Implementation (T127-T130)
- Replace mock SolanaService with real @solana/web3.js implementation
- Implement Connection class for RPC communication
- Implement PublicKey validation and address utilities
- Implement transaction serialization and deserialization

## Phase 3: Transaction Operations (CRITICAL PATH)
**Essential for money transfers**

### Step 3: Transaction Operations (T131-T135)
- Implement SOL transfer transactions
- Implement SPL token transfer transactions (USDC, EURC)
- Implement transaction confirmation and status checking
- Implement transaction fee estimation and recent blockhash fetching
- Implement transaction retry logic and error handling

## Phase 4: Wallet Operations (CRITICAL PATH)
**Essential for wallet management**

### Step 4: Wallet Operations (T136-T140)
- Implement wallet address validation using @solana/web3.js PublicKey
- Implement wallet balance checking for SOL and SPL tokens
- Implement wallet account info fetching
- Implement wallet transaction history retrieval
- Implement wallet token account discovery

## Phase 5: Configuration and Error Handling
**Production readiness**

### Step 5: Configuration and Error Handling (T141-T148)
- Implement Solana network configuration
- Implement RPC endpoint management and failover logic
- Implement commitment level configuration
- Implement network-specific token mint addresses
- Implement comprehensive Solana error handling
- Implement transaction retry logic with exponential backoff
- Implement Solana network health monitoring
- Implement transaction timeout handling

## Phase 6: Testing
**Quality assurance**

### Step 6: Solana Testing (T149-T152)
- Unit tests for SolanaService
- Unit tests for SPL token operations
- Integration tests for Solana transactions
- Contract tests for Solana wallet operations

## Implementation Notes
- **T123-T126** are package installation tasks (must complete first)
- **T127-T130** are core service implementation (depends on packages)
- **T131-T135** are transaction operations (depends on core services)
- **T136-T140** are wallet operations (depends on core services)
- **T141-T148** are configuration and error handling (can run in parallel with T131-T140)
- **T149-T152** are testing tasks (depends on all implementation)
- This approach ensures proper Solana blockchain integration for the remittances app
