# Rampa Cash API

A comprehensive NestJS-based API for managing cryptocurrency transactions, wallet operations, and fiat on/off-ramp services built on the Solana blockchain with Web3Auth integration.

## Overview

The Rampa Cash API provides a complete backend solution for:
- **Wallet Management**: Web3Auth MPC wallet creation and management
- **Transaction Processing**: Solana blockchain transactions (USDC, EURC, SOL)
- **On/Off-Ramp Services**: Fiat to crypto and crypto to fiat conversions
- **VISA Card Integration**: Virtual and physical card management
- **User Authentication**: Web3Auth-based authentication with JWT tokens
- **Contact Management**: User contact and address book functionality

## Architecture

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Blockchain**: Solana (devnet/mainnet)
- **Authentication**: Web3Auth with custom JWT signing
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker

## Prerequisites

Before running the project, ensure you have the following installed:
- **Docker** and **Docker Compose** (for containerized development)
- **Node.js** 20+ (if running locally)
- **PostgreSQL** 13+ (if running database locally)

## Environment Setup

1. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables** in `.env`:
   - Database connection settings
   - Web3Auth credentials and configuration
   - Solana network settings (devnet/mainnet)
   - JWT secrets and signing keys

## Quick Start (Docker)

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Run database migrations
npm run migration:run

# 4. Start the development server
npm run start:dev
```

### Available Commands

#### Development
```bash
# Start in development mode with hot reload
npm run start:dev

# Start in debug mode
npm run start:debug

# Start in production mode
npm run start:prod
```

#### Database Management
```bash
# Generate new migration
npm run migration:generate -- src/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

#### Testing
```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Run contract tests
npm run test:contract

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:cov
```

#### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

### Database Configuration

The application uses PostgreSQL with the following default settings:
- **Host**: `postgres` (Docker) / `localhost` (local)
- **Port**: `5432`
- **Database**: `rampa_cash_dev`
- **Connection Pool**: 5-20 connections with retry logic

### Solana Configuration

Configure your Solana network settings:
- **Network**: `devnet` (development) / `mainnet-beta` (production)
- **RPC URL**: Environment-specific Solana RPC endpoint
- **Token Mints**: USDC, EURC, and SOL token addresses

### Web3Auth Configuration

Set up Web3Auth for user authentication:
- **Client ID**: Your Web3Auth application client ID
- **Network**: `sapphire_mainnet` or `sapphire_devnet`
- **JWT Configuration**: Custom JWT signing with RS256/ES256

## API Documentation

Once the application is running, access the interactive API documentation:
- **Swagger UI**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/health`

## Project Structure

```
src/
├── config/           # Configuration files
├── domain/           # Feature modules
│   ├── auth/         # Authentication & authorization
│   ├── wallet/       # Wallet management
│   ├── transaction/  # Transaction processing
│   ├── onramp/       # On-ramp services
│   ├── transfer/     # Transfer operations
│   ├── visa-card/    # VISA card integration
│   ├── contact/      # Contact management
│   └── solana/       # Solana blockchain integration
├── common/           # Shared utilities
├── health/           # Health check endpoints
└── migrations/       # Database migrations
```

## Development Considerations

### Database Migrations
- Always generate migrations for schema changes
- Test migrations on a copy of production data
- Use descriptive migration names
- Never modify existing migrations in production

### Environment Variables
- Never commit `.env` files to version control
- Use `.env.example` as a template
- Validate all required environment variables on startup

### Security
- Use strong JWT secrets in production
- Configure proper CORS origins
- Enable SSL/TLS in production
- Regularly rotate API keys and secrets

### Performance
- Monitor database connection pool usage
- Use appropriate Solana RPC endpoints
- Implement proper caching strategies
- Monitor memory usage and garbage collection

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check connection credentials in `.env`
   - Ensure database exists

2. **Migration Errors**
   - Check database permissions
   - Verify migration files are valid
   - Ensure no conflicting schema changes

3. **Web3Auth Authentication Issues**
   - Verify client ID and network settings
   - Check JWT signing configuration
   - Ensure proper key formats (PEM)

4. **Solana Transaction Failures**
   - Check network connectivity
   - Verify RPC endpoint availability
   - Ensure sufficient SOL for transaction fees

### Logs and Debugging

- Set `LOG_LEVEL=debug` for detailed logging
- Check Docker logs: `docker logs <container_name>`
- Monitor health endpoint for service status
