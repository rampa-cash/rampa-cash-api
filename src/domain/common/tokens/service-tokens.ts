/**
 * Service tokens for dependency injection
 * These tokens are used instead of interfaces since interfaces don't exist at runtime
 */
export const WALLET_SERVICE_TOKEN = 'IWalletService';
export const USER_SERVICE_TOKEN = 'IUserService';
export const TRANSACTION_SERVICE_TOKEN = 'ITransactionService';
export const CONTACT_SERVICE_TOKEN = 'IContactService';
export const ONRAMP_SERVICE_TOKEN = 'IOnRampService';
export const VISACARD_SERVICE_TOKEN = 'IVISACardService';
