# Para SDK Authentication Adapter

This adapter implements authentication using the Para Server SDK. It follows the Port and Adapters (Hexagonal) architecture pattern.

## Overview

The Para SDK adapter allows the server to:
1. Import client sessions from the Para client SDK
2. Validate imported sessions
3. Perform server-side blockchain operations using imported sessions

## Setup

### 1. Install Dependencies

The Para Server SDK is already installed:
```bash
npm install @getpara/server-sdk@alpha --save-exact
```

### 2. Environment Variables

Configure the following environment variables:

```env
PARA_API_KEY=your_para_api_key  # Required
PARA_ENVIRONMENT=development  # Optional, defaults to 'development'
PARA_SESSION_TTL=3600  # Optional, session TTL in seconds
PARA_ENABLE_LOGGING=true  # Optional, defaults to 'true'
```

**Important Notes:**
- **Only `PARA_API_KEY` is required** - The Para Server SDK only needs the API key for initialization
- `PARA_BASE_URL` is **NOT needed** - The SDK handles the base URL internally
- `PARA_API_SECRET` is **NOT needed** - The Para Server SDK doesn't use API secrets
- Reference: [Para Server SDK Documentation](https://docs.getpara.com/v2/server/setup)

### 3. API Endpoint

The adapter provides the following endpoint:

#### POST `/auth/session/import`

Imports a serialized session from the Para client SDK.

**Request Body:**
```json
{
  "serializedSession": "serialized_session_string_from_client"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "para_1234567890_abc123",
  "user": {
    "id": "para-user-123",
    "email": "user@example.com",
    "authProvider": "para"
  },
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

## Client Integration

On the client side, export the session and send it to the server:

```typescript
// Client-side (using Para Client SDK)
const serializedSession = await para.exportSession();

// Send to server
const response = await fetch('/auth/session/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ serializedSession }),
});

const { sessionToken } = await response.json();

// Use sessionToken for subsequent authenticated requests
// Include in Authorization header: Bearer {sessionToken}
```

If you don't need signing on the server, you can exclude signers:

```typescript
const serializedSession = await para.exportSession({ excludeSigners: true });
```

## Architecture

### Components

1. **ParaSdkConfigService**: Manages Para SDK configuration
2. **ParaSdkSessionManager**: Manages Para Server instances and sessions
3. **ParaSdkAuthService**: Implements the AuthenticationService PORT

### Session Flow

```
Client                    Server
  |                         |
  |-- exportSession()       |
  |   (serialized string)   |
  |------------------------>|
  |                         |-- importSession()
  |                         |   (creates Para Server instance)
  |                         |
  |<-- sessionToken --------|
  |                         |
  |-- Bearer {token}        |
  |   (authenticated req)  |
  |------------------------>|
  |                         |-- validateSession()
  |                         |   (validates using session manager)
  |<-- response ------------|
```

## Implementation Details

### Session Manager

The `ParaSdkSessionManager`:
- Creates a Para Server instance for each imported session
- Stores session information in memory
- Automatically cleans up expired sessions every 5 minutes
- Validates sessions before returning user information

### Session Validation

Sessions are validated by:
1. Checking if the session exists in the session manager
2. Verifying the session hasn't expired
3. Confirming the session is still active
4. Returning user information if valid

### Session Token Format

Server-generated session tokens follow the format:
```
para_{timestamp}_{random_string}
```

Example: `para_1704067200000_abc123xyz`

## Notes

### User Information Extraction

The `extractUserInfo` method in `ParaSdkSessionManager` is currently a placeholder. You may need to adjust it based on the actual Para SDK API to extract user information from the imported session.

Current implementation generates a user ID, but you should update it to extract actual user information from the Para SDK if available.

### Session Storage

Sessions are currently stored in memory. For production, consider:
- Using Redis for distributed session storage
- Persisting sessions to a database
- Implementing session replication for high availability

### Error Handling

The adapter handles:
- Invalid serialized sessions
- Expired sessions
- Missing or invalid configuration
- Network errors when importing sessions

## Testing

To test the implementation:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test the full flow from client to server
3. **E2E Tests**: Test with actual Para SDK client

## References

- [Para Server SDK Documentation](https://docs.getpara.com/v2/server/setup)
- [Para Client SDK Documentation](https://docs.getpara.com/v2/client/setup)

## Troubleshooting

### Session Import Fails

- Verify `PARA_API_KEY` is set correctly
- Check that the serialized session is valid
- Ensure the Para SDK is properly initialized on the client

### Session Validation Fails

- Check if the session has expired
- Verify the session token format is correct
- Ensure the session was properly imported

### Configuration Errors

- Verify all required environment variables are set
- Check that the API key is valid
- Ensure the base URL is correct

