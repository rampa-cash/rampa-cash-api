# Rampa Cash API

A comprehensive NestJS-based API for managing cryptocurrency transactions, wallet operations, and fiat on/off-ramp services built on the Solana blockchain with Web3Auth integration.

## 🏗️ Architecture

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Blockchain**: Solana (devnet/mainnet)
- **Authentication**: Web3Auth with custom JWT signing
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker

## 🚀 Quick Start (Docker)

This project is designed to run in Docker. For the complete setup, see the main [rampa-cash-docker README](../../README.md).

### Prerequisites

- Docker and Docker Compose installed
- Access to the `rampa-cash-docker` repository

### First-time Setup

1. **Set up environment variables**:
   ```bash
   # Copy the example file (if available)
   cp .env.example .env
   ```

2. **Configure `.env` file** with:
   - Database connection settings (use `postgres` as host in Docker)
   - Web3Auth credentials and configuration
   - Solana network settings (devnet/mainnet)
   - JWT secrets and signing keys

3. **Start services from the root directory**:
   ```bash
   cd ../..  # Go to rampa-cash-docker root
   make up
   ```

4. **Run database migrations** (required on first setup):
   ```bash
   # After containers are running
   make shell-api
   npm run migration:run
   ```

### Database Setup

**Important**: The database `rampa_cash_dev` is created automatically when the PostgreSQL container starts, but the schema (tables) must be created by running migrations.

- **Database is created automatically** ✅
- **Schema/tables must be created manually** ⚠️

After starting containers for the first time, run:
```bash
make shell-api
npm run migration:run
```

### Access Points

Once running:
- **API**: http://localhost:3001
- **Swagger Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health
- **Database**: localhost:5432 (user: `rampa_user`, db: `rampa_cash_dev`)

## 📋 Available Commands

### Development (Inside Container)

```bash
# Access API container
make shell-api  # From rampa-cash-docker root

# Inside container:
npm run start:dev    # Start with hot reload
npm run start:debug # Start in debug mode
npm run build        # Build for production
```

### Database Management

```bash
# Access API container
make shell-api

# Inside container:
npm run migration:generate -- src/migrations/MigrationName  # Generate migration
npm run migration:create -- src/migrations/MigrationName   # Create empty migration
npm run migration:run                                       # Run pending migrations
npm run migration:revert                                    # Revert last migration
```

### Testing

```bash
# Access API container
make shell-api

# Inside container:
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:e2e          # Run e2e tests
npm run test:integration  # Run integration tests
npm run test:cov          # Run tests with coverage
```

### Code Quality

```bash
# Access API container
make shell-api

# Inside container:
npm run lint    # Lint code
npm run format  # Format code
```

## 🔧 Configuration

### Database Configuration

Default settings (configured in `docker-compose.yml`):
- **Host**: `postgres` (Docker network) / `localhost` (local)
- **Port**: `5432`
- **Database**: `rampa_cash_dev`
- **User**: `rampa_user`
- **Password**: `rampa_password`
- **Connection Pool**: 5-20 connections with retry logic

### Environment Variables

Required environment variables in `.env`:
- `POSTGRES_HOST` - Database host (use `postgres` in Docker)
- `POSTGRES_PORT` - Database port (default: `5432`)
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name
- `NODE_ENV` - Environment (development/production)
- Web3Auth configuration
- Solana network configuration
- JWT secrets and signing keys

## 🐛 Troubleshooting

### Database Connection Failed

- Verify PostgreSQL container is running: `make status`
- Check connection credentials in `.env`
- Ensure database exists (created automatically on first start)
- **Important**: Run migrations after first start: `make shell-api && npm run migration:run`

### Migration Errors

- Check database permissions
- Verify migration files are valid
- Ensure no conflicting schema changes
- Try resetting database: `make db-reset` (from root directory)

### Container Issues

- View API logs: `make logs-api`
- Access container shell: `make shell-api`
- Check service status: `make status`
- Rebuild containers: `make build` (from root directory)

### Common Errors

1. **"Database does not exist"**: Database is created automatically. Check container logs: `make logs-db`
2. **"Table does not exist"**: Run migrations: `make shell-api && npm run migration:run`
3. **"Connection refused"**: Ensure PostgreSQL container is healthy: `make status`

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── domain/           # Feature modules
│   ├── auth/         # Authentication & authorization
│   ├── wallet/       # Wallet management
│   ├── transaction/  # Transaction processing
│   ├── onramp/       # On-ramp services
│   ├── offramp/      # Off-ramp services
│   ├── visa-card/    # VISA card integration
│   ├── contact/      # Contact management
│   └── solana/       # Solana blockchain integration
├── common/           # Shared utilities
├── health/           # Health check endpoints
└── migrations/       # Database migrations
```

## 📚 Additional Resources

- Main Docker setup: See [rampa-cash-docker README](../../README.md)
- API Documentation: http://localhost:3001/api/docs (when running)
- NestJS Documentation: https://docs.nestjs.com/
