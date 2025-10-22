# Rampa Cash API - Postman Collection

This folder contains the Postman collection and environment files for the Rampa Cash API.

## Files

- `Rampa-Cash-API.postman_collection.json` - Complete Postman collection with all API endpoints
- `Rampa-Cash-API-Environment.postman_environment.json` - Environment variables for different server configurations
- `README.md` - This documentation file

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click "Import" button
3. Import both files:
   - `Rampa-Cash-API.postman_collection.json`
   - `Rampa-Cash-API-Environment.postman_environment.json`

### 2. Configure Environment Variables

The environment includes the following variables:

- `baseUrl` - API base URL (default: http://localhost:3001)
- `apiToken` - JWT token for authenticated requests
- `web3AuthToken` - Web3Auth JWT token for authentication
- `userId` - User ID (auto-populated from auth response)
- `transactionId` - Transaction ID for testing
- `contactId` - Contact ID for testing
- `onrampId` - OnRamp ID for testing
- `offrampId` - OffRamp ID for testing
- `visaCardId` - VISA Card ID for testing
- `inquiryId` - Inquiry ID for testing
- `provider` - Payment provider (default: stripe)
- `providerTransactionId` - Provider transaction ID

### 3. Authentication Flow

1. **Get Web3Auth Token**: First, obtain a Web3Auth JWT token from your frontend application
2. **Validate Token**: Use the "Validate Web3Auth Token" endpoint to exchange it for an API token
3. **Set API Token**: The collection automatically extracts and sets the API token from the validation response
4. **Make Authenticated Requests**: All subsequent requests will use the API token

### 4. Testing Workflow

#### Basic Flow:
1. Start with "Health Check" to verify API is running
2. Use "Validate Web3Auth Token" to authenticate
3. Test wallet operations (create, get, transfer)
4. Test transaction operations
5. Test contact management
6. Test onramp/offramp operations
7. Test VISA card operations

#### Sample Data:
The collection includes sample request bodies with placeholder values. Replace these with actual data:
- Wallet addresses
- User IDs
- Transaction amounts
- Contact information
- Bank account details (for offramp)

## Collection Structure

The collection is organized into the following folders:

### Authentication
- Validate Web3Auth Token
- Get User Profile
- Logout

### Wallet
- Create/Get/Update/Delete Wallet
- Get Balances (specific and all)
- Connect Wallet
- Transfer Funds
- Suspend/Activate Wallet

### Transactions
- Create/Get/Update/Delete Transactions
- Get Sent/Received/Pending Transactions
- Confirm/Cancel Transactions
- Get Transaction Stats

### Contacts
- CRUD operations for contacts
- Search contacts
- Get contacts by email/phone/wallet
- Sync with app users
- Get contact stats

### OnRamp
- Initiate/Get/Process/Fail OnRamp
- Get OnRamp by provider
- Get OnRamp stats

### OffRamp
- Initiate/Get/Process/Fail OffRamp
- Get OffRamp by provider
- Get OffRamp stats

### VISA Card
- CRUD operations for VISA cards
- Activate/Suspend/Reactivate/Cancel cards
- Update balance
- Check spending limits
- Get card stats

### User Management
- CRUD operations for users

### Inquiry
- Create/Get/Delete inquiries
- Waitlist management

### Health
- Health check endpoints
- Readiness/Liveness checks
- Detailed health information

### App
- Welcome message

## Environment Configurations

### Development
- `baseUrl`: http://localhost:3001

### Staging
- `baseUrl`: https://staging-api.rampa.com

### Production
- `baseUrl`: https://api.rampa.com

## Notes

- All authenticated endpoints require the `apiToken` variable to be set
- The collection includes automatic token extraction from Web3Auth validation response
- Sample request bodies are provided for all POST/PUT requests
- Query parameters are pre-configured for common use cases
- The collection follows the actual API implementation structure

## Troubleshooting

1. **401 Unauthorized**: Ensure `apiToken` is set and valid
2. **404 Not Found**: Check that `baseUrl` is correct and API is running
3. **400 Bad Request**: Verify request body format and required fields
4. **500 Internal Server Error**: Check API logs and ensure all services are running

## API Documentation

For detailed API documentation, refer to the OpenAPI specification at `.specs/contracts/openapi.yaml` or visit the Swagger UI at `http://localhost:3001/api/docs` when the API is running.
