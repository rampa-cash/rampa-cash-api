import { Injectable, Logger } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

export enum AddressType {
    SOLANA = 'solana',
    ETHEREUM = 'ethereum',
    BITCOIN = 'bitcoin',
    UNKNOWN = 'unknown',
}

export interface AddressValidationResult {
    isValid: boolean;
    addressType: AddressType;
    normalizedAddress: string;
    error?: string;
}

@Injectable()
export class AddressValidationService {
    private readonly logger = new Logger(AddressValidationService.name);

    /**
     * Validates and normalizes a blockchain address
     * @param address - The address to validate
     * @param expectedType - Optional expected address type
     * @returns AddressValidationResult with validation details
     */
    async validateAddress(
        address: string,
        expectedType?: AddressType,
    ): Promise<AddressValidationResult> {
        try {
            if (!address || typeof address !== 'string') {
                return {
                    isValid: false,
                    addressType: AddressType.UNKNOWN,
                    normalizedAddress: '',
                    error: 'Address must be a non-empty string',
                };
            }

            const trimmedAddress = address.trim();
            if (trimmedAddress.length === 0) {
                return {
                    isValid: false,
                    addressType: AddressType.UNKNOWN,
                    normalizedAddress: '',
                    error: 'Address cannot be empty',
                };
            }

            // Try to detect address type
            const detectedType = await this.detectAddressType(trimmedAddress);

            // If expected type is specified, validate against it
            if (expectedType && detectedType !== expectedType) {
                return {
                    isValid: false,
                    addressType: detectedType,
                    normalizedAddress: trimmedAddress,
                    error: `Expected ${expectedType} address but detected ${detectedType}`,
                };
            }

            // Validate based on detected type
            const validationResult = await this.validateByType(
                trimmedAddress,
                detectedType,
            );

            return {
                isValid: validationResult.isValid,
                addressType: detectedType,
                normalizedAddress: validationResult.normalizedAddress,
                error: validationResult.error,
            };
        } catch (error) {
            this.logger.error(
                `Address validation error: ${error.message}`,
                error.stack,
            );
            return {
                isValid: false,
                addressType: AddressType.UNKNOWN,
                normalizedAddress: address,
                error: 'Address validation failed due to internal error',
            };
        }
    }

    /**
     * Detects the type of blockchain address
     * @param address - The address to analyze
     * @returns AddressType enum value
     */
    private async detectAddressType(address: string): Promise<AddressType> {
        // For MVP: Only Solana addresses are supported
        if (this.isSolanaAddress(address)) {
            return AddressType.SOLANA;
        }

        return AddressType.UNKNOWN;
    }

    /**
     * Validates address based on its detected type
     * @param address - The address to validate
     * @param type - The detected address type
     * @returns Validation result with normalized address
     */
    private async validateByType(
        address: string,
        type: AddressType,
    ): Promise<{
        isValid: boolean;
        normalizedAddress: string;
        error?: string;
    }> {
        switch (type) {
            case AddressType.SOLANA:
                return this.validateSolanaAddress(address);
            case AddressType.ETHEREUM:
                return this.validateEthereumAddress(address);
            case AddressType.BITCOIN:
                return this.validateBitcoinAddress(address);
            default:
                return {
                    isValid: false,
                    normalizedAddress: address,
                    error: 'Unsupported address type',
                };
        }
    }

    /**
     * Validates Solana address
     * @param address - The Solana address to validate
     * @returns Validation result
     */
    private validateSolanaAddress(address: string): {
        isValid: boolean;
        normalizedAddress: string;
        error?: string;
    } {
        try {
            const publicKey = new PublicKey(address);
            const normalizedAddress = publicKey.toBase58();

            return {
                isValid: true,
                normalizedAddress,
            };
        } catch (error) {
            return {
                isValid: false,
                normalizedAddress: address,
                error: 'Invalid Solana address format',
            };
        }
    }

    /**
     * Validates Ethereum address
     * @param address - The Ethereum address to validate
     * @returns Validation result
     */
    private validateEthereumAddress(address: string): {
        isValid: boolean;
        normalizedAddress: string;
        error?: string;
    } {
        try {
            const isValid = this.isEthereumAddress(address);
            if (!isValid) {
                return {
                    isValid: false,
                    normalizedAddress: address,
                    error: 'Invalid Ethereum address format',
                };
            }

            // Normalize to checksum format
            const normalizedAddress = address.toLowerCase();

            return {
                isValid: true,
                normalizedAddress,
            };
        } catch (error) {
            return {
                isValid: false,
                normalizedAddress: address,
                error: 'Invalid Ethereum address format',
            };
        }
    }

    /**
     * Validates Bitcoin address
     * @param address - The Bitcoin address to validate
     * @returns Validation result
     */
    private validateBitcoinAddress(address: string): {
        isValid: boolean;
        normalizedAddress: string;
        error?: string;
    } {
        // Basic Bitcoin address validation
        // Legacy addresses: 1-34 characters, base58
        // P2SH addresses: 3-34 characters, base58
        // Bech32 addresses: bc1 prefix, bech32 encoding

        if (address.startsWith('bc1')) {
            // Bech32 address validation (simplified)
            if (address.length < 42 || address.length > 62) {
                return {
                    isValid: false,
                    normalizedAddress: address,
                    error: 'Invalid Bitcoin bech32 address length',
                };
            }
        } else {
            // Legacy and P2SH address validation (simplified)
            if (address.length < 26 || address.length > 35) {
                return {
                    isValid: false,
                    normalizedAddress: address,
                    error: 'Invalid Bitcoin address length',
                };
            }
        }

        return {
            isValid: true,
            normalizedAddress: address,
        };
    }

    /**
     * Checks if address is a valid Solana address
     * @param address - The address to check
     * @returns boolean
     */
    private isSolanaAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if address is a valid Ethereum address
     * @param address - The address to check
     * @returns boolean
     */
    private isEthereumAddress(address: string): boolean {
        // For MVP: Ethereum addresses not supported
        return false;
    }

    /**
     * Checks if address is a valid Bitcoin address
     * @param address - The address to check
     * @returns boolean
     */
    private isBitcoinAddress(address: string): boolean {
        // Basic Bitcoin address pattern matching
        if (address.startsWith('bc1')) {
            // Bech32 address
            return /^bc1[a-z0-9]{39,59}$/.test(address);
        } else {
            // Legacy and P2SH addresses (base58)
            return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
        }
    }

    /**
     * Normalizes an address to its standard format
     * @param address - The address to normalize
     * @param type - The address type
     * @returns Normalized address
     */
    async normalizeAddress(
        address: string,
        type: AddressType,
    ): Promise<string> {
        const validation = await this.validateAddress(address, type);
        return validation.normalizedAddress;
    }

    /**
     * Validates multiple addresses in batch
     * @param addresses - Array of addresses to validate
     * @param expectedType - Optional expected address type for all addresses
     * @returns Array of validation results
     */
    async validateAddresses(
        addresses: string[],
        expectedType?: AddressType,
    ): Promise<AddressValidationResult[]> {
        const validationPromises = addresses.map((address) =>
            this.validateAddress(address, expectedType),
        );

        return Promise.all(validationPromises);
    }

    /**
     * Gets supported address types
     * @returns Array of supported address types
     */
    getSupportedAddressTypes(): AddressType[] {
        return [AddressType.SOLANA, AddressType.ETHEREUM, AddressType.BITCOIN];
    }
}
