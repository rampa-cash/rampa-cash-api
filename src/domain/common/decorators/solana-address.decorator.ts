import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';
import { PublicKey } from '@solana/web3.js';

/**
 * Validates that a string is a valid Solana address
 * @param validationOptions Optional validation options
 */
export function IsSolanaAddress(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isSolanaAddress',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') {
                        return false;
                    }

                    try {
                        // Use Solana's PublicKey to validate the address
                        new PublicKey(value);
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid Solana address`;
                },
            },
        });
    };
}

/**
 * Validates that a string is a valid Solana address or empty string
 * @param validationOptions Optional validation options
 */
export function IsOptionalSolanaAddress(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isOptionalSolanaAddress',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    // Allow empty string or null/undefined
                    if (!value || value === '') {
                        return true;
                    }

                    if (typeof value !== 'string') {
                        return false;
                    }

                    try {
                        // Use Solana's PublicKey to validate the address
                        new PublicKey(value);
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid Solana address or empty`;
                },
            },
        });
    };
}
