import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validates that a string has a specific length
 * @param minLength Minimum string length
 * @param maxLength Maximum string length
 * @param validationOptions Optional validation options
 */
export function IsStringLength(minLength: number, maxLength: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isStringLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') {
                        return false;
                    }

                    return value.length >= minLength && value.length <= maxLength;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be between ${minLength} and ${maxLength} characters long`;
                },
            },
        });
    };
}

/**
 * Validates that a string has a minimum length
 * @param minLength Minimum string length
 * @param validationOptions Optional validation options
 */
export function IsMinStringLength(minLength: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isMinStringLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') {
                        return false;
                    }

                    return value.length >= minLength;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be at least ${minLength} characters long`;
                },
            },
        });
    };
}

/**
 * Validates that a string has a maximum length
 * @param maxLength Maximum string length
 * @param validationOptions Optional validation options
 */
export function IsMaxStringLength(maxLength: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isMaxStringLength',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') {
                        return false;
                    }

                    return value.length <= maxLength;
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be no more than ${maxLength} characters long`;
                },
            },
        });
    };
}
