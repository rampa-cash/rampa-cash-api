# Backend Signing Examples for Postman

## Overview
This document provides Postman collection examples for testing the Web3Auth Node SDK backend signing functionality.

## Environment Variables
Set these variables in your Postman environment:
- `baseUrl`: Your API base URL (e.g., `http://localhost:3001`)
- `apiToken`: Your API JWT token from `/auth/web3auth/validate`
- `web3authIdToken`: Web3Auth idToken for backend signing

## Collection Examples

### 1. Check Server Signing Status
```http
GET {{baseUrl}}/auth/web3auth/validate
Content-Type: application/json

{
  "token": "your-web3auth-jwt-token"
}
```

**Expected Response:**
```json
{
  "user": { ... },
  "accessToken": "your-api-token",
  "expiresIn": 3600,
  "serverSigningEnabled": true
}
```

### 2. Transfer with Backend Signing (Body)
```http
POST {{baseUrl}}/transfer
Authorization: Bearer {{apiToken}}
Content-Type: application/json

{
  "toAddress": "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
  "amount": 1.0,
  "tokenType": "USDC",
  "memo": "Test transfer with backend signing",
  "web3authIdToken": "{{web3authIdToken}}"
}
```

### 3. Transfer with Backend Signing (Header)
```http
POST {{baseUrl}}/transfer
Authorization: Bearer {{apiToken}}
X-Web3Auth-IdToken: {{web3authIdToken}}
Content-Type: application/json

{
  "toAddress": "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
  "amount": 1.0,
  "tokenType": "USDC",
  "memo": "Test transfer with backend signing"
}
```

### 4. OnRamp with Backend Signing
```http
POST {{baseUrl}}/onramp/initiate
Authorization: Bearer {{apiToken}}
X-Web3Auth-IdToken: {{web3authIdToken}}
Content-Type: application/json

{
  "amount": 100.0,
  "fiatAmount": 100.0,
  "fiatCurrency": "USD",
  "tokenType": "USDC",
  "provider": "stripe",
  "exchangeRate": 1.0,
  "fee": 0
}
```

### 5. OffRamp with Backend Signing
```http
POST {{baseUrl}}/offramp/initiate
Authorization: Bearer {{apiToken}}
X-Web3Auth-IdToken: {{web3authIdToken}}
Content-Type: application/json

{
  "amount": 100.0,
  "tokenType": "USDC",
  "bankAccount": {
    "iban": "DE89370400440532013000",
    "accountHolderName": "John Doe"
  }
}
```

## Testing Steps

1. **Enable Backend Signing**: Set `WEB3AUTH_BACKEND_SIGNING_ENABLED=true` in your environment
2. **Get API Token**: Use the Web3Auth validate endpoint to get your API token
3. **Get idToken**: Use the `/auth/web3auth/id-token` endpoint to get a Web3Auth idToken
4. **Test Transfers**: Use the transfer endpoints with the idToken
5. **Verify Signing**: Check logs to confirm backend signing is being used

## Notes

- Backend signing only works when `WEB3AUTH_BACKEND_SIGNING_ENABLED=true`
- The `web3authIdToken` can be provided in either the request body or the `X-Web3Auth-IdToken` header
- Network consistency is validated between Web3Auth SDK and Solana RPC configurations
- All signing operations are performed server-side using the Web3Auth Node SDK
