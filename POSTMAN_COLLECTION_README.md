# Rampa Cash API - Postman Collection

This repository contains a comprehensive Postman collection for testing the Rampa Cash API endpoints. The collection includes all available endpoints organized by functionality.

## Files Included

- `Rampa_Cash_API.postman_collection.json` - Complete Postman collection with all endpoints
- `Rampa_Cash_API.postman_environment.json` - Environment variables for testing
- `README.md` - This documentation file

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Import both files:
   - `Rampa_Cash_API.postman_collection.json`
   - `Rampa_Cash_API.postman_environment.json`

### 2. Configure Environment Variables

Set up the following environment variables in Postman:

- `baseUrl`: `http://localhost:3001` (or your API server URL)
- `sessionToken`: Your Para SDK session token (obtained from authentication)
- `userId`: User ID for testing
- `walletId`: Wallet ID for testing
- `walletAddress`: Wallet address for testing
- `contactId`: Contact ID for testing
- `transactionId`: Transaction ID for testing
- `investmentId`: Investment ID for testing
- `visaCardId`: VISA Card ID for testing
- `moduleId`: Learning module ID for testing

### 3. Authentication Setup

The API uses session-based authentication with Para SDK integration:

1. First, obtain a session token from Para SDK
2. Use the "Import Session" endpoint to validate your session
3. Set the `sessionToken` environment variable
4. All subsequent requests will use this token for authentication

## Unified Transaction API

The `/transactions` endpoint now handles both internal transfers (between app users) and external transfers (to any Solana wallet) in a single, unified interface.

### Internal Transfers (User to User)
```json
{
  "recipientId": "user-uuid-here",
  "amount": 100.5,
  "tokenType": "USDC",
  "description": "Payment for services"
}
```

### External Transfers (User to External Wallet)
```json
{
  "externalAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 50.0,
  "tokenType": "SOL",
  "memo": "External payment",
  "description": "Payment to external wallet"
}
```

### Optional Fields
- `fromAddress`: Override sender wallet (defaults to authenticated user's wallet)
- `memo`: Blockchain memo for external transfers
- `description`: Human-readable description

### Response Format
All transactions return:
```json
{
  "id": "transaction-id",
  "senderId": "sender-user-id",
  "recipientId": "recipient-user-id", // null for external transfers
  "externalAddress": "external-wallet-address", // null for internal transfers
  "amount": "100.5",
  "tokenType": "USDC",
  "status": "confirmed",
  "description": "Payment description",
  "solanaTransactionHash": "blockchain-transaction-hash",
  "createdAt": "2025-01-27T10:30:00Z",
  "completedAt": "2025-01-27T10:30:05Z"
}
```

## API Endpoints Overview

### Health Check Endpoints
- `GET /health` - Application health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /health/detailed` - Detailed health information

### Authentication Endpoints
- `GET /auth/health` - Authentication service health check
- `POST /auth/session/import` - Import session from Para SDK
- `POST /auth/session/validate` - Validate session token
- `POST /auth/session/refresh` - Refresh session token

### User Management
- `POST /user` - Create user
- `GET /user` - Get user profile
- `GET /user/:id` - Get user by ID
- `PATCH /user/:id` - Update user
- `GET /user/:id/kyc-status` - Get KYC status
- `PATCH /user/:id/kyc` - Update KYC information

### Wallet Management
- `POST /wallet` - Create wallet
- `GET /wallet` - Get wallet information
- `GET /wallet/balance` - Get wallet balance for specific token
- `GET /wallet/balances` - Get all wallet balances
- `POST /wallet/connect` - Connect Web3Auth wallet
- `DELETE /wallet` - Disconnect wallet
- `POST /wallet/create-token-accounts` - Create Associated Token Accounts

### Transactions (Unified Transfer & Transaction Management)
- `POST /transactions` - Create transaction (supports both internal and external transfers)
  - **Internal Transfer**: Use `recipientId` field to send to another app user
  - **External Transfer**: Use `externalAddress` field to send to any Solana wallet
- `GET /transactions` - Get user transactions
- `GET /transactions/sent` - Get sent transactions
- `GET /transactions/received` - Get received transactions
- `GET /transactions/:id` - Get transaction by ID
- `POST /transactions/:id/confirm` - Confirm transaction
- `POST /transactions/:id/cancel` - Cancel transaction
- `GET /transactions/stats/summary` - Get transaction statistics
- `GET /transactions/history` - Get transaction history with filters
- `GET /transactions/history/summary` - Get transaction history summary
- `GET /transactions/history/statistics` - Get transaction statistics
- `GET /transactions/search` - Search transactions by address

### Contact Management
- `POST /contacts` - Create contact
- `GET /contacts` - Get all contacts
- `GET /contacts/:id` - Get contact by ID
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact
- `GET /contacts/search` - Search contacts

### OnRamp (Fiat to Crypto)
- `POST /onramp` - Create on-ramp transaction
- `GET /onramp/:transactionId` - Get on-ramp status
- `GET /onramp` - Get user on-ramp transactions
- `POST /onramp/:transactionId/cancel` - Cancel on-ramp transaction

### OffRamp (Crypto to Fiat)
- `POST /offramp` - Create off-ramp transaction
- `POST /offramp/:id/initiate` - Initiate off-ramp transaction
- `GET /offramp` - Get user off-ramp transactions
- `GET /offramp/:id` - Get off-ramp transaction by ID
- `DELETE /offramp/:id` - Cancel off-ramp transaction

### Learning Modules
- `GET /learning/modules` - Get all learning modules
- `GET /learning/modules/:id` - Get module by ID
- `GET /learning/progress` - Get user progress
- `POST /learning/modules/:id/start` - Start learning module
- `POST /learning/modules/:id/progress` - Update progress
- `POST /learning/modules/:id/complete` - Complete module
- `GET /learning/rewards` - Get user BONK rewards

### Investment Management
- `GET /investments/options` - Get investment options
- `GET /investments/options/:id` - Get investment option by ID
- `GET /investments/my-investments` - Get user investments
- `POST /investments/invest` - Create investment
- `POST /investments/my-investments/:id/withdraw` - Withdraw from investment

### VISA Card Management
- `POST /visa-card` - Create VISA card
- `GET /visa-card` - Get user VISA card
- `GET /visa-card/:id` - Get VISA card by ID
- `POST /visa-card/:id/activate` - Activate VISA card
- `POST /visa-card/:id/suspend` - Suspend VISA card
- `POST /visa-card/:id/update-balance` - Update card balance

## Testing Workflow

### 1. Health Check
Start by testing the health endpoints to ensure the API is running:
- `GET /health`
- `GET /health/ready`
- `GET /health/live`

### 2. Authentication
1. Use `POST /auth/session/import` to import your Para SDK session
2. Set the returned session token in your environment variables
3. Test session validation with `POST /auth/session/validate`

### 3. User Setup
1. Create a user with `POST /user`
2. Update KYC information if required
3. Note the user ID for subsequent requests

### 4. Wallet Operations
1. Create or connect a wallet with `POST /wallet` or `POST /wallet/connect`
2. Check wallet balance with `GET /wallet/balance`
3. Create token accounts if needed with `POST /wallet/create-token-accounts`

### 5. Transaction Testing
1. Create contacts with `POST /contacts`
2. Initiate transfers with `POST /transfer`
3. Monitor transaction status
4. Test transaction confirmation and cancellation

### 6. OnRamp/OffRamp Testing
1. Create on-ramp transactions for fiat-to-crypto conversion
2. Test off-ramp transactions for crypto-to-fiat conversion
3. Monitor transaction statuses

### 7. Learning and Rewards
1. Browse available learning modules
2. Start and complete modules
3. Check BONK rewards

### 8. Investment Testing
1. Browse investment options
2. Create investments
3. Test withdrawal functionality

### 9. VISA Card Testing
1. Create VISA cards
2. Test card activation and management
3. Update card balances

## Important Notes

### Authentication
- All protected endpoints require a valid session token
- Session tokens are obtained from Para SDK integration
- Some endpoints require user verification (KYC completion)

### Token Types
The API supports the following token types:
- `SOL` - Solana native token
- `USDC` - USD Coin
- `EURC` - Euro Coin

### Error Handling
- All endpoints return consistent error responses
- Check response status codes and error messages
- Some operations require specific user verification levels

### Rate Limiting
- Be mindful of rate limits when testing
- Use appropriate delays between requests
- Monitor response headers for rate limit information

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if session token is valid and properly set
2. **403 Forbidden**: User may need to complete KYC verification
3. **404 Not Found**: Check if the resource ID exists and belongs to the user
4. **400 Bad Request**: Validate request body parameters
5. **500 Internal Server Error**: Check API server logs and health status

### Debug Tips

1. Always check the health endpoints first
2. Verify environment variables are set correctly
3. Use the session validation endpoint to check token status
4. Check API documentation for required parameters
5. Monitor response headers for additional information

## Support

For API support and documentation:
- Check the Swagger documentation at `http://localhost:3001/api/docs`
- Review the main API documentation in the project README
- Check the project's GitHub issues for known problems

## Version Information

- API Version: 1.0.0
- Collection Version: 1.0.0
- Last Updated: 2024

This collection covers all available endpoints in the Rampa Cash API. Use it to test functionality, validate implementations, and ensure proper API behavior.
