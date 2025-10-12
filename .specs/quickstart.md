# Quickstart Guide: Rampa Cash Remittances App

**Feature**: 001-title-rampa-cash  
**Date**: 2025-01-27  
**Status**: Complete

## Overview
This guide demonstrates the core user flows for the Rampa Cash remittances app, targeting Latin American immigrants in Spain/Germany who need to send money home quickly and cheaply.

## Prerequisites
- Web browser (Chrome, Firefox, Safari) or mobile device (iOS/Android)
- Google or Apple account for new users
- Phantom or Solflare wallet for advanced users
- Valid email address and phone number

## User Flows

### 1. New User Onboarding (Crypto-Inexperienced)

**Scenario**: Maria, a Colombian immigrant in Madrid, wants to send money to her family in Bogotá.

#### Step 1: Sign Up
1. Open the Rampa app (web or mobile)
2. Click "Sign Up"
3. Select "Continue with Google" or "Continue with Apple"
4. Complete OAuth flow
5. **Expected Result**: Account created, non-custodial wallet automatically generated

#### Step 2: Add Funds
1. On dashboard, click "Add Money"
2. Select "Credit Card" or "SEPA Transfer"
3. Enter amount (minimum €10)
4. Complete payment flow
5. **Expected Result**: USDC added to wallet balance, real-time balance update

#### Step 3: Add Contact
1. Click "Contacts" in navigation
2. Click "Add Contact"
3. Enter family member's email: `juan.rodriguez@email.com`
4. Enter display name: "Juan Rodriguez"
5. **Expected Result**: Contact added to list

#### Step 4: Send Money
1. Click "Send Money"
2. Select contact "Juan Rodriguez"
3. Enter amount: €50
4. Select token: USDC
5. Add description: "Monthly support"
6. Click "Send"
7. **Expected Result**: Transaction initiated, confirmation within 30 seconds

### 2. Advanced User Onboarding (Existing Wallet)

**Scenario**: Carlos, a tech-savvy Mexican in Berlin, already has a Phantom wallet and wants to use it with Rampa.

#### Step 1: Connect Existing Wallet
1. Open the Rampa app
2. Click "Sign Up"
3. Select "Connect Phantom Wallet" or "Connect Solflare Wallet"
4. Authorize connection in wallet popup
5. **Expected Result**: Existing wallet connected, balances imported

#### Step 2: Send Money
1. On dashboard, verify wallet balance
2. Click "Send Money"
3. Enter recipient's wallet address or select from contacts
4. Enter amount and token type
5. Confirm transaction in wallet
6. **Expected Result**: Transaction confirmed on Solana network

### 3. Mobile App Security Flow

**Scenario**: Ana, using the mobile app, needs to access her account after the app was backgrounded.

#### Step 1: App Access
1. Open Rampa mobile app
2. **Expected Result**: PIN/biometric prompt appears
3. Enter PIN or use fingerprint/face ID
4. **Expected Result**: Access granted to dashboard

#### Step 2: Session Management
1. Use app normally
2. Background the app (home button)
3. Return to app after 5+ minutes
4. **Expected Result**: PIN/biometric prompt appears again

### 4. Transaction History and Monitoring

**Scenario**: User wants to track their remittance history.

#### Step 1: View Transactions
1. Click "Transactions" in navigation
2. **Expected Result**: List of recent transactions with:
   - Date and time
   - Recipient name
   - Amount and token type
   - Transaction status
   - Solana transaction hash (for advanced users)

#### Step 2: Transaction Details
1. Click on any transaction
2. **Expected Result**: Detailed view showing:
   - Full transaction information
   - Network confirmation status
   - Fee breakdown
   - Estimated delivery time

### 5. VISA Card Request and Usage

**Scenario**: User wants to spend their crypto balance directly.

#### Step 1: Request VISA Card
1. Click "VISA Card" in navigation
2. Select card type: "Virtual" or "Physical"
3. Set daily limit: €500
4. Set monthly limit: €5000
5. Complete identity verification
6. **Expected Result**: Card request submitted, approval within 24-48 hours

#### Step 2: Use VISA Card
1. Receive card (physical) or card details (virtual)
2. Activate card following instructions
3. Use card for purchases anywhere VISA is accepted
4. **Expected Result**: Crypto balance automatically converted to fiat for purchases

### 6. Off-Ramping (Withdraw to Bank)

**Scenario**: User wants to withdraw crypto balance to their bank account.

#### Step 1: Initiate Withdrawal
1. Click "Withdraw" on dashboard
2. Select token type and amount
3. Enter bank account details:
   - IBAN: ES1234567890123456789012
   - Account holder: Maria Rodriguez
   - Bank name: Santander
4. Review exchange rate and fees
5. Confirm withdrawal
6. **Expected Result**: Withdrawal initiated, funds arrive in 1-3 business days

## Error Handling Scenarios

### 1. Insufficient Balance
**When**: User tries to send more than available balance
**Expected**: Clear error message: "Insufficient balance. Available: €45.50 USDC"

### 2. Network Issues
**When**: Solana network is slow or unavailable
**Expected**: "Transaction pending. We'll notify you when confirmed."

### 3. Invalid Recipient
**When**: Recipient email/phone doesn't exist
**Expected**: "Recipient not found. Please check the email/phone number."

### 4. Payment Failure
**When**: Credit card payment fails
**Expected**: "Payment failed. Please try a different payment method."

### Performance Targets
- ✅ Transaction confirmation within 30 seconds
- ✅ API response times under 200ms
- ✅ Real-time balance updates
- ✅ Smooth mobile app performance

### Security Validation
- ✅ PIN/biometric authentication on mobile
- ✅ Automatic logout after 5 minutes inactivity (web)
- ✅ Secure wallet key management
- ✅ All transactions logged and auditable

### User Experience
- ✅ Simple, non-technical interface
- ✅ Clear error messages in English/Spanish
- ✅ Intuitive navigation
- ✅ Responsive design across devices

## Testing Checklist

### New User Flow
- [ ] Google/Apple signup works
- [ ] Non-custodial wallet created automatically
- [ ] Credit card payment processes
- [ ] Contact can be added
- [ ] Money can be sent to contact
- [ ] Transaction appears in history

### Advanced User Flow
- [ ] Phantom/Solflare wallet connects
- [ ] Existing balances imported
- [ ] Transactions work with connected wallet
- [ ] Wallet can be disconnected/reconnected

### Mobile Security
- [ ] PIN prompt on app open
- [ ] PIN prompt after backgrounding
- [ ] Biometric authentication works
- [ ] App locks after inactivity

### Error Scenarios
- [ ] Insufficient balance handled gracefully
- [ ] Network errors show appropriate messages
- [ ] Invalid inputs show validation errors
- [ ] Payment failures are handled properly

## Language Support

### English Interface
- All text, buttons, and messages in English
- Error messages in clear, simple English
- Help text and tooltips in English

### Spanish Interface
- All text, buttons, and messages in Spanish
- Error messages in clear, simple Spanish
- Help text and tooltips in Spanish
- Cultural considerations for LATAM users

## Device Compatibility

### Web App
- Responsive design for desktop, tablet, mobile
- Works in Chrome, Firefox, Safari, Edge
- Touch-friendly interface for mobile browsers

### Mobile Apps
- iOS 14+ support
- Android 8+ support
- Responsive layouts for different screen sizes
- Optimized for one-handed use
