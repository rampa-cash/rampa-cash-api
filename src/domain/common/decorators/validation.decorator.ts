import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';
import { IsPhoneNumber } from 'class-validator';

/**
 * Custom Solana address validation decorator
 * Validates that the address is a valid Solana public key
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
                    if (typeof value !== 'string') return false;

                    // Basic Solana address validation (base58, 32-44 characters)
                    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
                    return (
                        base58Regex.test(value) &&
                        value.length >= 32 &&
                        value.length <= 44
                    );
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid Solana address`;
                },
            },
        });
    };
}

/**
 * Custom phone number validation decorator (less restrictive than @IsPhoneNumber)
 * Allows international formats and various separators
 */
export function IsPhoneNumberFlexible(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isPhoneNumberFlexible',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;

                    // More flexible phone number regex
                    // Allows: +1234567890, (123) 456-7890, 123-456-7890, 123.456.7890, etc.
                    const phoneRegex = /^[+]?[1-9][\d\s\-().]{7,20}$/;
                    return phoneRegex.test(value);
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid phone number`;
                },
            },
        });
    };
}

/**
 * Custom email validation decorator for contact entities
 * More permissive than standard email validation
 */
export function IsEmailFlexible(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isEmailFlexible',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;

                    // More flexible email regex
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(value);
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid email address`;
                },
            },
        });
    };
}

/**
 * Amount validation decorator for positive numbers with minimum values
 */
export function IsAmount(
    min: number = 0.00000001,
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isAmount',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'number') return false;
                    return value >= min;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a positive number greater than or equal to ${min}`;
                },
            },
        });
    };
}

/**
 * String length validation decorator with custom min/max
 */
export function IsStringLength(
    min: number,
    max: number,
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isStringLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;
                    return value.length >= min && value.length <= max;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be between ${min} and ${max} characters long`;
                },
            },
        });
    };
}

/**
 * Enum validation decorator with custom error message
 */
export function IsEnumValue(
    enumObject: any,
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isEnumValue',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return Object.values(enumObject).includes(value);
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be one of: ${Object.values(enumObject).join(', ')}`;
                },
            },
        });
    };
}

/**
 * Card number validation decorator for VISA cards
 */
export function IsCardNumber(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isCardNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false;

                    // Remove spaces and dashes
                    const cleanValue = value.replace(/[\s-]/g, '');

                    // Check if it's all digits and proper length
                    const digitRegex = /^\d{13,19}$/;
                    if (!digitRegex.test(cleanValue)) return false;

                    // Luhn algorithm validation
                    let sum = 0;
                    let isEven = false;

                    for (let i = cleanValue.length - 1; i >= 0; i--) {
                        let digit = parseInt(cleanValue[i]);

                        if (isEven) {
                            digit *= 2;
                            if (digit > 9) {
                                digit -= 9;
                            }
                        }

                        sum += digit;
                        isEven = !isEven;
                    }

                    return sum % 10 === 0;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid card number`;
                },
            },
        });
    };
}
