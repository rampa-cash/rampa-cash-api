# Rampa Cash API - Developer Documentation

## Overview

Rampa Cash API is a modern remittance platform built with NestJS, TypeScript, and PostgreSQL. It provides a comprehensive API for managing users, wallets, transactions, and financial operations on the Solana blockchain.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis (optional, for caching)
- Docker (optional, for containerized development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rampa-cash/api.git
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run migration:run
```

5. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`

## Architecture

### Domain-Driven Design (DDD)

The application follows Domain-Driven Design principles with clear domain boundaries:

- **Auth Domain**: Authentication, session management, Para SDK integration
- **User Domain**: User management, KYC, profile management
- **Wallet Domain**: Wallet creation, balance management, external wallet integration
- **Transaction Domain**: Transaction processing, history, blockchain operations
- **Contact Domain**: Contact management for transactions
- **OnRamp Domain**: Fiat to crypto conversion
- **OffRamp Domain**: Crypto to fiat conversion
- **Learning Domain**: Learning modules, BONK rewards
- **Investment Domain**: Investment options, portfolio management
- **Solana Domain**: Blockchain operations, transaction building

### Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Para SDK (session-based)
- **Blockchain**: Solana Web3.js
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Caching**: Redis (optional)

### Key Principles

1. **Dependency Inversion Principle (DIP)**: High-level modules depend on abstractions
2. **Dependency Injection (DI)**: Services are injected through NestJS DI container
3. **Strategy Pattern**: External services can be switched via configuration
4. **Test-Driven Development (TDD)**: All business logic has comprehensive tests
5. **Clean Architecture**: Clear separation of concerns and dependencies

## API Reference

### Base URL

```
http://localhost:3001
```

### Authentication

All protected endpoints require a session token in the Authorization header:

```
Authorization: Bearer <session-token>
```

### Endpoints

#### Health Check
- `GET /health` - Application health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

#### Authentication
- `POST /auth/session/import` - Import session from Para SDK
- `POST /auth/session/validate` - Validate session token
- `POST /auth/session/refresh` - Refresh session token

#### User Management
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/kyc/status` - Get KYC status
- `POST /users/kyc/update` - Update KYC information

#### Wallet Management
- `GET /wallets` - Get user wallets
- `POST /wallets` - Create new wallet
- `GET /wallets/:id/balance` - Get wallet balance
- `GET /wallets/balance` - Get all wallet balances

#### Transactions
- `GET /transactions` - Get user transactions
- `POST /transactions` - Create new transaction
- `GET /transactions/:id` - Get transaction details
- `GET /transactions/history` - Get transaction history
- `GET /transactions/sent` - Get sent transactions
- `GET /transactions/received` - Get received transactions

#### Contacts
- `GET /contacts` - Get user contacts
- `POST /contacts` - Create new contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact

#### OnRamp
- `POST /onramp/initiate` - Initiate on-ramp transaction
- `GET /onramp/status/:id` - Get on-ramp status

#### Learning
- `GET /learning/modules` - Get learning modules
- `POST /learning/modules/:id/start` - Start learning module
- `PUT /learning/modules/:id/progress` - Update progress
- `POST /learning/modules/:id/complete` - Complete module
- `GET /learning/rewards` - Get BONK rewards

#### Investments
- `GET /investments/options` - Get investment options
- `POST /investments/invest` - Create investment
- `GET /investments/my-investments` - Get user investments
- `GET /investments/my-investments/:id` - Get investment details

### Response Format

All API responses follow a consistent format:

```json
{
  "data": {}, // Response data
  "message": "Success", // Optional message
  "statusCode": 200 // HTTP status code
}
```

Error responses:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "error": "Bad Request"
}
```

## Authentication

### Session-Based Authentication

The API uses session-based authentication with Para SDK integration:

1. **Session Import**: Client imports session from Para SDK
2. **Session Validation**: Each request validates the session token
3. **Session Refresh**: Tokens can be refreshed before expiration

### KYC Requirements

Certain operations require KYC completion:

- Creating transactions
- On-ramp operations
- Investment operations

KYC status is checked on each protected endpoint.

## Database Schema

### Core Entities

#### Users
- `id`: UUID primary key
- `email`: User email address
- `name`: User full name
- `phoneNumber`: User phone number
- `kycStatus`: KYC completion status
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

#### Wallets
- `id`: UUID primary key
- `userId`: Foreign key to users
- `address`: Wallet address
- `type`: Wallet type (para, phantom, etc.)
- `externalWalletId`: External wallet identifier
- `isActive`: Active status
- `createdAt`: Creation timestamp

#### Transactions
- `id`: UUID primary key
- `senderId`: Sender user ID
- `recipientId`: Recipient user ID
- `amount`: Transaction amount
- `tokenType`: Token type (USDC, EURC, SOL)
- `status`: Transaction status
- `blockchainTxId`: Blockchain transaction ID
- `createdAt`: Creation timestamp

### Database Migrations

Migrations are located in `src/migrations/` and can be run with:

```bash
npm run migration:run
npm run migration:revert
npm run migration:generate -- -n MigrationName
```

## Testing

### Test Structure

- **Unit Tests**: `src/**/*.spec.ts`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`
- **Contract Tests**: `tests/contract/`

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Configuration

Test configurations are in:
- `tests/jest-unit.json` - Unit test config
- `tests/jest-integration.json` - Integration test config
- `tests/jest-e2e.json` - E2E test config

## Deployment

### Environment Variables

Required environment variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=rampa_cash

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Para SDK
PARA_SDK_API_KEY=your_api_key
PARA_SDK_API_URL=https://api.getpara.com

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Application
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Deployment

```bash
# Build image
docker build -t rampa-cash-api .

# Run container
docker run -p 3001:3001 --env-file .env rampa-cash-api
```

### Production Considerations

1. **Database**: Use managed PostgreSQL service
2. **Redis**: Use managed Redis service for caching
3. **Monitoring**: Set up application monitoring
4. **Logging**: Configure centralized logging
5. **Security**: Use HTTPS, rate limiting, CORS
6. **Backup**: Regular database backups

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Write tests first (TDD)
3. Implement feature
4. Ensure all tests pass
5. Run linting and formatting
6. Create pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write comprehensive tests
- Document public APIs
- Follow DDD principles

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add changelog entry
4. Request review from team
5. Merge after approval

## Support

For questions or issues:

- **Documentation**: [API Docs](http://localhost:3001/api/docs)
- **Issues**: GitHub Issues
- **Team**: team@rampa.cash

## License

This project is proprietary software. All rights reserved.
