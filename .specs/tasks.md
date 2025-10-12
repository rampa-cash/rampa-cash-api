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
- [ ] T145 [P] Implement comprehensive Solana error handling in src/domain/solana/filters/solana-exception.filter.ts
- [ ] T146 [P] Implement transaction retry logic with exponential backoff
- [ ] T147 [P] Implement Solana network health monitoring
- [ ] T148 [P] Implement transaction timeout handling

### Solana Testing
- [ ] T149 [P] Unit tests for SolanaService in test/unit/solana.service.test.ts
- [ ] T150 [P] Unit tests for SPL token operations in test/unit/spl-token.service.test.ts
- [ ] T151 [P] Integration tests for Solana transactions in test/integration/solana-transaction.test.ts
- [ ] T152 [P] Contract tests for Solana wallet operations in test/contract/test_solana_wallet.test.ts

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

# 📱 MOBILE TASKS

## Phase 3.1: Mobile Setup

### iOS Setup
- [ ] T130 Create iOS project structure with Swift
- [ ] T131 [P] Configure Xcode project settings
- [ ] T132 [P] Setup SwiftLint and formatting
- [ ] T133 [P] Configure iOS deployment target (iOS 14+)

### Android Setup
- [ ] T134 Create Android project structure with Kotlin
- [ ] T135 [P] Configure Gradle build system
- [ ] T136 [P] Setup ktlint and formatting
- [ ] T137 [P] Configure Android SDK (API 26+)

### Shared Components
- [ ] T138 [P] Create shared React Native components
- [ ] T139 [P] Setup shared state management
- [ ] T140 [P] Configure shared API client

## Phase 3.2: Mobile Tests First (TDD)

### iOS Tests
- [ ] T141 [P] Unit test for LoginViewController in ios/RampaRemittancesTests/LoginViewControllerTests.swift
- [ ] T142 [P] Unit test for DashboardViewController in ios/RampaRemittancesTests/DashboardViewControllerTests.swift
- [ ] T143 [P] Unit test for SendMoneyViewController in ios/RampaRemittancesTests/SendMoneyViewControllerTests.swift
- [ ] T144 [P] Integration test for authentication flow in ios/RampaRemittancesTests/AuthFlowTests.swift

### Android Tests
- [ ] T145 [P] Unit test for LoginActivity in android/app/src/test/LoginActivityTest.kt
- [ ] T146 [P] Unit test for DashboardActivity in android/app/src/test/DashboardActivityTest.kt
- [ ] T147 [P] Unit test for SendMoneyActivity in android/app/src/test/SendMoneyActivityTest.kt
- [ ] T148 [P] Integration test for authentication flow in android/app/src/test/AuthFlowTest.kt

## Phase 3.3: Mobile Core Implementation

### iOS Implementation
- [ ] T149 [P] LoginViewController in ios/RampaRemittances/LoginViewController.swift
- [ ] T150 [P] DashboardViewController in ios/RampaRemittances/DashboardViewController.swift
- [ ] T151 [P] SendMoneyViewController in ios/RampaRemittances/SendMoneyViewController.swift
- [ ] T152 [P] TransactionHistoryViewController in ios/RampaRemittances/TransactionHistoryViewController.swift
- [ ] T153 [P] ContactListViewController in ios/RampaRemittances/ContactListViewController.swift
- [ ] T154 [P] WalletService in ios/RampaRemittances/Services/WalletService.swift
- [ ] T155 [P] AuthService in ios/RampaRemittances/Services/AuthService.swift

### Android Implementation
- [ ] T156 [P] LoginActivity in android/app/src/main/java/com/rampa/remittances/LoginActivity.kt
- [ ] T157 [P] DashboardActivity in android/app/src/main/java/com/rampa/remittances/DashboardActivity.kt
- [ ] T158 [P] SendMoneyActivity in android/app/src/main/java/com/rampa/remittances/SendMoneyActivity.kt
- [ ] T159 [P] TransactionHistoryActivity in android/app/src/main/java/com/rampa/remittances/TransactionHistoryActivity.kt
- [ ] T160 [P] ContactListActivity in android/app/src/main/java/com/rampa/remittances/ContactListActivity.kt
- [ ] T161 [P] WalletService in android/app/src/main/java/com/rampa/remittances/Services/WalletService.kt
- [ ] T162 [P] AuthService in android/app/src/main/java/com/rampa/remittances/Services/AuthService.kt

### Mobile Security
- [ ] T163 [P] PIN authentication implementation (iOS)
- [ ] T164 [P] Biometric authentication implementation (iOS)
- [ ] T165 [P] PIN authentication implementation (Android)
- [ ] T166 [P] Biometric authentication implementation (Android)
- [ ] T167 [P] Secure storage for sensitive data
- [ ] T168 [P] App backgrounding security (PIN prompt)

## Phase 3.4: Mobile Integration
- [ ] T169 [P] Web3Auth integration (iOS)
- [ ] T170 [P] Web3Auth integration (Android)
- [ ] T171 [P] Solana wallet integration (iOS)
- [ ] T172 [P] Solana wallet integration (Android)
- [ ] T173 [P] Push notifications setup
- [ ] T174 [P] Deep linking implementation
- [ ] T175 [P] Offline data synchronization

## Phase 3.5: Mobile Polish
- [ ] T176 [P] Unit tests for all mobile components
- [ ] T177 [P] UI/UX testing and optimization
- [ ] T178 [P] Performance optimization
- [ ] T179 [P] Accessibility improvements
- [ ] T180 [P] App store preparation and metadata

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
1. **Setup Phase** (T001-T006, T062-T066, T130-T140) - Can run in parallel
2. **Test Phase** (T007-T023, T067-T073, T141-T148) - Must complete before implementation
3. **Core Implementation** (T024-T044, T074-T094, T149-T162) - Depends on tests
4. **Integration** (T050-T055, T095-T100, T169-T175) - Depends on core
5. **Solana Integration** (T123-T152) - CRITICAL: Must complete before frontend can work with real blockchain
6. **Polish** (T056-T061, T101-T105, T176-T180) - Final phase

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

### Mobile Tests (Can run together)
```bash
# Launch T141-T148 together:
Task: "Unit test for LoginViewController in ios/RampaRemittancesTests/LoginViewControllerTests.swift"
Task: "Unit test for DashboardViewController in ios/RampaRemittancesTests/DashboardViewControllerTests.swift"
Task: "Unit test for LoginActivity in android/app/src/test/LoginActivityTest.kt"
# ... (all mobile tests)
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
- [ ] Clear separation between backend and frontend/mobile
- [ ] No task modifies same file as another [P] task

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
