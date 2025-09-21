import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const object = plainToClass(metatype, value);
        const errors = await validate(object);

        if (errors.length > 0) {
            const errorMessages = this.formatErrors(errors);
            throw new BadRequestException({
                message: 'Validation failed',
                errors: errorMessages,
            });
        }

        return value;
    }

    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }

    private formatErrors(errors: any[]): string[] {
        const errorMessages: string[] = [];

        errors.forEach(error => {
            if (error.constraints) {
                Object.values(error.constraints).forEach((message: string) => {
                    errorMessages.push(message);
                });
            }

            // Handle nested validation errors
            if (error.children && error.children.length > 0) {
                const nestedErrors = this.formatErrors(error.children);
                errorMessages.push(...nestedErrors);
            }
        });

        return errorMessages;
    }
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(value)) {
            throw new BadRequestException(`Invalid UUID format: ${value}`);
        }

        return value;
    }
}

@Injectable()
export class ParseEmailPipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(value)) {
            throw new BadRequestException(`Invalid email format: ${value}`);
        }

        return value.toLowerCase();
    }
}

@Injectable()
export class ParsePhonePipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string {
        // Basic phone number validation (international format)
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;

        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            throw new BadRequestException(`Invalid phone number format: ${value}`);
        }

        return value.replace(/\s/g, '');
    }
}

@Injectable()
export class ParseDecimalPipe implements PipeTransform<string, number> {
    constructor(private readonly precision: number = 8) { }

    transform(value: string, metadata: ArgumentMetadata): number {
        const decimalRegex = new RegExp(`^\\d+(\\.\\d{1,${this.precision}})?$`);

        if (!decimalRegex.test(value)) {
            throw new BadRequestException(
                `Invalid decimal format. Expected up to ${this.precision} decimal places: ${value}`
            );
        }

        const parsed = parseFloat(value);

        if (isNaN(parsed)) {
            throw new BadRequestException(`Invalid number: ${value}`);
        }

        return parsed;
    }
}

@Injectable()
export class ParseEnumPipe implements PipeTransform<string, string> {
    constructor(private readonly enumObject: any) { }

    transform(value: string, metadata: ArgumentMetadata): string {
        const validValues = Object.values(this.enumObject);

        if (!validValues.includes(value)) {
            throw new BadRequestException(
                `Invalid enum value. Expected one of: ${validValues.join(', ')}`
            );
        }

        return value;
    }
}

@Injectable()
export class SanitizePipe implements PipeTransform<any, any> {
    transform(value: any, metadata: ArgumentMetadata): any {
        if (typeof value === 'string') {
            return this.sanitizeString(value);
        }

        if (typeof value === 'object' && value !== null) {
            return this.sanitizeObject(value);
        }

        return value;
    }

    private sanitizeString(str: string): string {
        return str
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }

    private sanitizeObject(obj: any): any {
        const sanitized: any = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'string') {
                    sanitized[key] = this.sanitizeString(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitized[key] = this.sanitizeObject(obj[key]);
                } else {
                    sanitized[key] = obj[key];
                }
            }
        }

        return sanitized;
    }
}
