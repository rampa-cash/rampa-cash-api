import { PublicKey, Keypair } from '@solana/web3.js';
import { BadRequestException, Logger } from '@nestjs/common';

export class AddressUtils {
    private static readonly logger = new Logger(AddressUtils.name);

    /**
     * Validates if a string is a valid Solana address
     * @param address - The address string to validate
     * @returns true if valid, false otherwise
     */
    static isValidAddress(address: string): boolean {
        try {
            if (!address || typeof address !== 'string') {
                return false;
            }

            // Basic length check (Solana addresses are 32-44 characters in base58)
            if (address.length < 32 || address.length > 44) {
                return false;
            }

            // Try to create a PublicKey to validate the address
            new PublicKey(address);
            return true;
        } catch (error) {
            this.logger.debug(`Invalid address format: ${address}`, error);
            return false;
        }
    }

    /**
     * Validates and returns a PublicKey from an address string
     * @param address - The address string to validate and convert
     * @returns PublicKey instance
     * @throws BadRequestException if address is invalid
     */
    static validateAndCreatePublicKey(address: string): PublicKey {
        try {
            if (!this.isValidAddress(address)) {
                throw new BadRequestException(
                    `Invalid Solana address: ${address}`,
                );
            }

            return new PublicKey(address);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(
                `Failed to create PublicKey from address: ${address}`,
                error,
            );
            throw new BadRequestException(
                `Invalid Solana address format: ${address}`,
            );
        }
    }

    /**
     * Converts a PublicKey to a string address
     * @param publicKey - The PublicKey to convert
     * @returns The address string
     */
    static publicKeyToString(publicKey: PublicKey): string {
        return publicKey.toBase58();
    }

    /**
     * Checks if two addresses are equal
     * @param address1 - First address
     * @param address2 - Second address
     * @returns true if addresses are equal
     */
    static areAddressesEqual(address1: string, address2: string): boolean {
        try {
            const pubKey1 = this.validateAndCreatePublicKey(address1);
            const pubKey2 = this.validateAndCreatePublicKey(address2);
            return pubKey1.equals(pubKey2);
        } catch (error) {
            this.logger.debug(
                `Failed to compare addresses: ${address1}, ${address2}`,
                error,
            );
            return false;
        }
    }

    /**
     * Generates a random address for testing purposes
     * @returns A random valid Solana address
     */
    static generateRandomAddress(): string {
        const keypair = Keypair.generate();
        return keypair.publicKey.toBase58();
    }

    /**
     * Validates if an address is a valid token mint address
     * @param address - The address to validate
     * @returns true if valid mint address
     */
    static isValidTokenMint(address: string): boolean {
        return this.isValidAddress(address);
    }

    /**
     * Validates if an address is a valid token account address
     * @param address - The address to validate
     * @returns true if valid token account address
     */
    static isValidTokenAccount(address: string): boolean {
        return this.isValidAddress(address);
    }
}
