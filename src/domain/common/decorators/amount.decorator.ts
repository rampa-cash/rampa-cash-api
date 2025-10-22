import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

/**
 * Validates that a number is a positive amount
 * @param validationOptions Optional validation options
 */
export function IsPositiveAmount(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isPositiveAmount',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (
                        typeof value !== 'number' &&
                        typeof value !== 'string'
                    ) {
                        return false;
                    }

                    const numValue =
                        typeof value === 'string' ? parseFloat(value) : value;

                    return !isNaN(numValue) && numValue > 0;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a positive number`;
                },
            },
        });
    };
}

/**
 * Validates that a number is a non-negative amount (allows zero)
 * @param validationOptions Optional validation options
 */
export function IsNonNegativeAmount(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isNonNegativeAmount',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (
                        typeof value !== 'number' &&
                        typeof value !== 'string'
                    ) {
                        return false;
                    }

                    const numValue =
                        typeof value === 'string' ? parseFloat(value) : value;

                    return !isNaN(numValue) && numValue >= 0;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a non-negative number`;
                },
            },
        });
    };
}

/**
 * Validates that a number meets minimum amount requirements
 * @param minAmount Minimum allowed amount
 * @param validationOptions Optional validation options
 */
export function IsMinAmount(
    minAmount: number,
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isMinAmount',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (
                        typeof value !== 'number' &&
                        typeof value !== 'string'
                    ) {
                        return false;
                    }

                    const numValue =
                        typeof value === 'string' ? parseFloat(value) : value;

                    return !isNaN(numValue) && numValue >= minAmount;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be at least ${minAmount}`;
                },
            },
        });
    };
}
