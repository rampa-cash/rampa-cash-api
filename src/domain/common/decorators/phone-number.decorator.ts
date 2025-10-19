import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is a valid phone number (less restrictive than @IsPhoneNumber)
 * Supports international formats with country codes
 * @param validationOptions Optional validation options
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
                    if (typeof value !== 'string') {
                        return false;
                    }

                    // Remove all non-digit characters except + at the beginning
                    const cleaned = value.replace(/[^\d+]/g, '');

                    // Check if it starts with + (international format) or is just digits
                    if (cleaned.startsWith('+')) {
                        // International format: + followed by 7-15 digits
                        return /^\+[1-9]\d{6,14}$/.test(cleaned);
                    } else {
                        // National format: 7-15 digits
                        return /^[1-9]\d{6,14}$/.test(cleaned);
                    }
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid phone number (international format: +1234567890 or national format: 1234567890)`;
                },
            },
        });
    };
}

/**
 * Validates that a string is a valid phone number or empty string
 * @param validationOptions Optional validation options
 */
export function IsOptionalPhoneNumberFlexible(
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isOptionalPhoneNumberFlexible',
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

                    // Remove all non-digit characters except + at the beginning
                    const cleaned = value.replace(/[^\d+]/g, '');

                    // Check if it starts with + (international format) or is just digits
                    if (cleaned.startsWith('+')) {
                        // International format: + followed by 7-15 digits
                        return /^\+[1-9]\d{6,14}$/.test(cleaned);
                    } else {
                        // National format: 7-15 digits
                        return /^[1-9]\d{6,14}$/.test(cleaned);
                    }
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid phone number or empty (international format: +1234567890 or national format: 1234567890)`;
                },
            },
        });
    };
}
