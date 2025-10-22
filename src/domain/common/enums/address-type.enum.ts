/**
 * AddressType enum for different blockchain address types
 *
 * @description This enum defines the supported blockchain address types
 * in the Rampa Cash system. It's used for address validation, normalization,
 * and type detection across different blockchain networks.
 */
export enum AddressType {
    SOLANA = 'solana',
    ETHEREUM = 'ethereum',
    BITCOIN = 'bitcoin',
    UNKNOWN = 'unknown',
}
