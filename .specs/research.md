# Research: Rampa Cash Remittances App

**Feature**: 001-title-rampa-cash  
**Date**: 2025-01-27  
**Status**: Complete

## Research Summary
This document consolidates research findings for the Rampa Cash remittances app, covering Web3Auth integration, Solana libraries, cross-platform authentication, on/off ramp patterns, and DDD implementation with NestJS.

## 1. Web3Auth MPC Wallet Integration

### Decision
Use Web3Auth's MPC (Multi-Party Computation) wallet service for non-custodial wallet management with social login integration.

### Rationale
- **Non-custodial**: Private keys never leave user's device
- **Social Login**: Seamless Google/Apple authentication for non-Web3 users
- **MPC Security**: Distributed key management without single points of failure
- **Solana Support**: Native integration with Solana blockchain
- **Cross-platform**: Works on web, iOS, and Android

### Alternatives Considered
- **Phantom/Solflare Integration**: Good for advanced users but complex for beginners
- **Custom Wallet Generation**: Too complex and security risks
- **Custodial Wallets**: Violates security-first principle

### Implementation Notes
- Use Web3Auth's Solana adapter
- Implement fallback to direct wallet connection for advanced users
- Store only public keys and user metadata on server
- Handle wallet recovery through social login

## 2. Solana JavaScript Libraries

### Decision
Use @solana/web3.js as primary library with @solana/spl-token for token operations.

### Rationale
- **Official Library**: Maintained by Solana Foundation
- **Comprehensive**: Covers all blockchain operations needed
- **TypeScript Support**: Full type safety
- **Active Community**: Extensive documentation and examples
- **Token Support**: Built-in SPL token operations

### Alternatives Considered
- **@solana/spl-token**: Good for token operations but limited for general blockchain operations
- **Custom RPC calls**: Too low-level and error-prone
- **Third-party wrappers**: Additional dependency risk

### Implementation Notes
- Use Connection class for RPC communication
- Implement retry logic for failed transactions
- Use PublicKey validation for wallet addresses
- Handle transaction confirmation and error states

## 3. Cross-Platform Authentication Strategies

### Decision
Implement shared authentication service with platform-specific UI components.

### Rationale
- **Consistent UX**: Same login flow across all platforms
- **Shared Logic**: Common authentication logic reduces bugs
- **Platform Optimization**: Native UI patterns where appropriate
- **Security**: Consistent security measures across platforms

### Alternatives Considered
- **Platform-specific Auth**: Too much duplication and inconsistency
- **WebView-based Auth**: Poor user experience on mobile
- **Custom Auth**: Too complex and security risks

### Implementation Notes
- Shared authentication service in backend
- Platform-specific UI components for login screens
- JWT tokens for session management
- Biometric authentication on mobile platforms

## 4. On/Off Ramp Integration Patterns

### Decision
Implement abstract on/off ramp service with pluggable provider integration.

### Rationale
- **Flexibility**: Easy to switch providers without code changes
- **Compliance**: Different providers for different regions
- **Testing**: Mock providers for development and testing
- **Future-proof**: Easy to add new providers

### Alternatives Considered
- **Direct Integration**: Too tightly coupled and inflexible
- **Single Provider**: Limited options and potential vendor lock-in
- **Custom Implementation**: Too complex and compliance risks

### Implementation Notes
- Abstract OnRampService and OffRampService interfaces
- Provider-specific implementations (e.g., Ramp, MoonPay, Transak)
- Configuration-driven provider selection
- Webhook handling for transaction status updates

## 5. DDD Implementation with NestJS

### Decision
Implement Domain-Driven Design principles with NestJS modules and services.

### Rationale
- **Business Logic**: Clear separation of domain logic from infrastructure
- **Maintainability**: Easier to understand and modify business rules
- **Testability**: Domain logic can be tested independently
- **Scalability**: Clear boundaries for future feature additions

### Alternatives Considered
- **Anemic Domain Model**: Too simple for complex financial logic
- **Pure DDD**: Too complex for MVP phase
- **Traditional Layered Architecture**: Not suitable for complex business logic

### Implementation Notes
- Domain entities for User, Wallet, Transaction, etc.
- Domain services for business logic
- Application services for use cases
- Infrastructure services for external integrations
- Repository pattern for data access

## 6. Cross-Platform State Management

### Decision
Use Redux Toolkit with platform-specific persistence.

### Rationale
- **Predictable State**: Clear state management patterns
- **Cross-platform**: Same state logic across platforms
- **DevTools**: Excellent debugging capabilities
- **Performance**: Optimized re-renders

### Alternatives Considered
- **Context API**: Too simple for complex state
- **Zustand**: Good but less ecosystem support
- **Platform-specific**: Too much duplication

### Implementation Notes
- Shared Redux store structure
- Platform-specific persistence (AsyncStorage on mobile, localStorage on web)
- RTK Query for API state management
- Middleware for logging and error handling

## 7. Database Design for Financial Transactions

### Decision
Use PostgreSQL with ACID compliance and audit logging.

### Rationale
- **ACID Compliance**: Critical for financial data integrity
- **Audit Trail**: Built-in support for transaction logging
- **Performance**: Excellent for complex queries
- **Reliability**: Proven in financial applications

### Alternatives Considered
- **MongoDB**: Good for flexibility but lacks ACID guarantees
- **MySQL**: Good but PostgreSQL has better JSON support
- **NoSQL**: Too risky for financial data

### Implementation Notes
- Use transactions for all financial operations
- Implement audit logging for all changes
- Use database constraints for data integrity
- Implement proper indexing for performance

## 8. Security Considerations

### Decision
Implement multi-layered security with client-side signing and server-side validation.

### Rationale
- **Defense in Depth**: Multiple security layers
- **Client-side Signing**: Private keys never leave device
- **Server Validation**: Additional security checks
- **Audit Logging**: Complete transaction trail

### Implementation Notes
- AES-256 encryption for sensitive data
- JWT tokens with short expiration
- Rate limiting on all endpoints
- Input validation and sanitization
- Regular security audits

## Research Status
✅ **Complete** - All technical decisions made and documented
✅ **Constitution Compliant** - All decisions align with constitutional principles
✅ **MVP Focused** - Decisions prioritize simplicity and core functionality
✅ **Future-proof** - Architecture allows for easy expansion

## Next Steps
1. Create data model based on research findings
2. Generate API contracts for all identified services
3. Create contract tests for validation
4. Generate implementation tasks
