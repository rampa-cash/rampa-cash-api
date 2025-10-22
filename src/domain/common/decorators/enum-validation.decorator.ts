import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

/**
 * Validates that a value is one of the allowed enum values
 * @param enumObject The enum object to validate against
 * @param validationOptions Optional validation options
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
                    if (value === null || value === undefined) {
                        return true; // Allow null/undefined, use @IsOptional() if needed
                    }

                    const enumValues = Object.values(enumObject);
                    return enumValues.includes(value);
                },
                defaultMessage(args: ValidationArguments) {
                    const enumValues = Object.values(enumObject);
                    return `${args.property} must be one of: ${enumValues.join(', ')}`;
                },
            },
        });
    };
}

/**
 * Validates that a value is one of the allowed enum values or empty string
 * @param enumObject The enum object to validate against
 * @param validationOptions Optional validation options
 */
export function IsOptionalEnumValue(
    enumObject: any,
    validationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isOptionalEnumValue',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    // Allow empty string or null/undefined
                    if (!value || value === '') {
                        return true;
                    }

                    const enumValues = Object.values(enumObject);
                    return enumValues.includes(value);
                },
                defaultMessage(args: ValidationArguments) {
                    const enumValues = Object.values(enumObject);
                    return `${args.property} must be one of: ${enumValues.join(', ')} or empty`;
                },
            },
        });
    };
}
