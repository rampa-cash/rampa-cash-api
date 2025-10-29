import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    sanitizedData?: any;
}

export interface DataIntegrityCheck {
    table: string;
    totalRecords: number;
    invalidRecords: number;
    issues: Array<{
        recordId: string;
        field: string;
        value: any;
        error: string;
    }>;
}

export interface ValidationRule {
    field: string;
    type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'date' | 'enum';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    customValidator?: (value: any) => boolean | string;
}

@Injectable()
export class DataValidationService {
    private readonly logger = new Logger(DataValidationService.name);

    constructor(private readonly dataSource: DataSource) {}

    async validateEntity<T extends object>(
        entityClass: new () => T,
        data: any,
        groups?: string[],
    ): Promise<ValidationResult> {
        try {
            // Transform plain object to class instance
            const entity = plainToClass(entityClass, data);

            // Validate using class-validator
            const errors = await validate(entity, {
                groups,
                whitelist: true,
                forbidNonWhitelisted: true,
            });

            return {
                isValid: errors.length === 0,
                errors,
                sanitizedData: errors.length === 0 ? entity : undefined,
            };
        } catch (error) {
            this.logger.error(`Entity validation failed: ${error.message}`);
            return {
                isValid: false,
                errors: [
                    {
                        property: 'general',
                        value: data,
                        constraints: {
                            validation: 'Entity validation failed',
                        },
                    } as ValidationError,
                ],
            };
        }
    }

    async validateData(data: any, rules: ValidationRule[]): Promise<ValidationResult> {
        const errors: ValidationError[] = [];

        for (const rule of rules) {
            const value = this.getNestedValue(data, rule.field);
            const fieldError = await this.validateField(value, rule);

            if (fieldError) {
                errors.push(fieldError);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedData: errors.length === 0 ? this.sanitizeData(data, rules) : undefined,
        };
    }

    async checkDataIntegrity(tableName: string): Promise<DataIntegrityCheck> {
        try {
            // Get table metadata
            const tableMetadata = this.dataSource.getMetadata(tableName);
            if (!tableMetadata) {
                throw new Error(`Table ${tableName} not found`);
            }

            // Get total record count
            const totalRecords = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)', 'count')
                .from(tableMetadata.target, 'entity')
                .getRawOne();

            const count = parseInt(totalRecords.count);

            // Check for common integrity issues
            const issues: DataIntegrityCheck['issues'] = [];

            // Check for null values in required fields
            for (const column of tableMetadata.columns) {
                if (!column.isNullable && !column.isGenerated) {
                    const nullRecords = await this.dataSource
                        .createQueryBuilder()
                        .select('id')
                        .from(tableMetadata.target, 'entity')
                        .where(`${column.propertyName} IS NULL`)
                        .getRawMany();

                    for (const record of nullRecords) {
                        issues.push({
                            recordId: record.id,
                            field: column.propertyName,
                            value: null,
                            error: 'Required field is null',
                        });
                    }
                }
            }

            // Check for duplicate values in unique fields
            for (const column of tableMetadata.columns) {
                if ((column as any).isUnique && !column.isPrimary) {
                    const duplicates = await this.dataSource
                        .createQueryBuilder()
                        .select(`${column.propertyName}, COUNT(*) as count`)
                        .from(tableMetadata.target, 'entity')
                        .groupBy(column.propertyName)
                        .having('COUNT(*) > 1')
                        .getRawMany();

                    for (const duplicate of duplicates) {
                        issues.push({
                            recordId: 'multiple',
                            field: column.propertyName,
                            value: duplicate[column.propertyName],
                            error: 'Duplicate value in unique field',
                        });
                    }
                }
            }

            // Check foreign key constraints
            for (const relation of tableMetadata.relations) {
                if (relation.isOneToOne || relation.isOneToMany) {
                    const orphanedRecords = await this.dataSource
                        .createQueryBuilder()
                        .select('entity.id')
                        .from(tableMetadata.target, 'entity')
                        .leftJoin(relation.target, 'related', `entity.${relation.propertyName} = related.id`)
                        .where(`entity.${relation.propertyName} IS NOT NULL`)
                        .andWhere('related.id IS NULL')
                        .getRawMany();

                    for (const record of orphanedRecords) {
                        issues.push({
                            recordId: record.id,
                            field: relation.propertyName,
                            value: record[relation.propertyName],
                            error: 'Foreign key constraint violation',
                        });
                    }
                }
            }

            return {
                table: tableName,
                totalRecords: count,
                invalidRecords: issues.length,
                issues,
            };
        } catch (error) {
            this.logger.error(`Data integrity check failed for ${tableName}: ${error.message}`);
            return {
                table: tableName,
                totalRecords: 0,
                invalidRecords: 0,
                issues: [
                    {
                        recordId: 'system',
                        field: 'general',
                        value: null,
                        error: `Integrity check failed: ${error.message}`,
                    },
                ],
            };
        }
    }

    async validateAllTables(): Promise<DataIntegrityCheck[]> {
        try {
            const entityMetadatas = this.dataSource.entityMetadatas;
            const results: DataIntegrityCheck[] = [];

            for (const metadata of entityMetadatas) {
                const result = await this.checkDataIntegrity(metadata.tableName);
                results.push(result);
            }

            return results;
        } catch (error) {
            this.logger.error(`Failed to validate all tables: ${error.message}`);
            return [];
        }
    }

    async sanitizeInput(input: any, rules: ValidationRule[]): Promise<any> {
        const sanitized = { ...input };

        for (const rule of rules) {
            const value = this.getNestedValue(sanitized, rule.field);
            const sanitizedValue = this.sanitizeValue(value, rule);
            this.setNestedValue(sanitized, rule.field, sanitizedValue);
        }

        return sanitized;
    }

    async validateEmail(email: string): Promise<boolean> {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async validateUUID(uuid: string): Promise<boolean> {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    async validatePhoneNumber(phone: string): Promise<boolean> {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    private async validateField(value: any, rule: ValidationRule): Promise<ValidationError | null> {
        // Check required
        if (rule.required && (value === undefined || value === null || value === '')) {
            return {
                property: rule.field,
                value,
                constraints: {
                    required: `${rule.field} is required`,
                },
            } as ValidationError;
        }

        // Skip validation if value is empty and not required
        if (!rule.required && (value === undefined || value === null || value === '')) {
            return null;
        }

        // Type validation
        const typeError = await this.validateType(value, rule);
        if (typeError) {
            return {
                property: rule.field,
                value,
                constraints: {
                    type: typeError,
                },
            } as ValidationError;
        }

        // Length validation for strings
        if (rule.type === 'string' && typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                return {
                    property: rule.field,
                    value,
                    constraints: {
                        minLength: `${rule.field} must be at least ${rule.minLength} characters`,
                    },
                } as ValidationError;
            }

            if (rule.maxLength && value.length > rule.maxLength) {
                return {
                    property: rule.field,
                    value,
                    constraints: {
                        maxLength: `${rule.field} must be at most ${rule.maxLength} characters`,
                    },
                } as ValidationError;
            }
        }

        // Range validation for numbers
        if (rule.type === 'number' && typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                return {
                    property: rule.field,
                    value,
                    constraints: {
                        min: `${rule.field} must be at least ${rule.min}`,
                    },
                } as ValidationError;
            }

            if (rule.max !== undefined && value > rule.max) {
                return {
                    property: rule.field,
                    value,
                    constraints: {
                        max: `${rule.field} must be at most ${rule.max}`,
                    },
                } as ValidationError;
            }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
            return {
                property: rule.field,
                value,
                constraints: {
                    pattern: `${rule.field} format is invalid`,
                },
            } as ValidationError;
        }

        // Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
            return {
                property: rule.field,
                value,
                constraints: {
                    enum: `${rule.field} must be one of: ${rule.enum.join(', ')}`,
                },
            } as ValidationError;
        }

        // Custom validation
        if (rule.customValidator) {
            const customResult = rule.customValidator(value);
            if (customResult !== true) {
                return {
                    property: rule.field,
                    value,
                    constraints: {
                        custom: typeof customResult === 'string' ? customResult : `${rule.field} is invalid`,
                    },
                } as ValidationError;
            }
        }

        return null;
    }

    private async validateType(value: any, rule: ValidationRule): Promise<string | null> {
        switch (rule.type) {
            case 'string':
                return typeof value === 'string' ? null : 'Must be a string';
            case 'number':
                return typeof value === 'number' && !isNaN(value) ? null : 'Must be a number';
            case 'boolean':
                return typeof value === 'boolean' ? null : 'Must be a boolean';
            case 'email':
                return await this.validateEmail(value) ? null : 'Must be a valid email';
            case 'uuid':
                return await this.validateUUID(value) ? null : 'Must be a valid UUID';
            case 'date':
                return value instanceof Date || !isNaN(Date.parse(value)) ? null : 'Must be a valid date';
            default:
                return null;
        }
    }

    private sanitizeData(data: any, rules: ValidationRule[]): any {
        const sanitized = { ...data };

        for (const rule of rules) {
            const value = this.getNestedValue(sanitized, rule.field);
            const sanitizedValue = this.sanitizeValue(value, rule);
            this.setNestedValue(sanitized, rule.field, sanitizedValue);
        }

        return sanitized;
    }

    private sanitizeValue(value: any, rule: ValidationRule): any {
        if (value === undefined || value === null) {
            return value;
        }

        switch (rule.type) {
            case 'string':
                return typeof value === 'string' ? value.trim() : String(value);
            case 'number':
                return typeof value === 'number' ? value : parseFloat(value);
            case 'boolean':
                return Boolean(value);
            case 'email':
                return typeof value === 'string' ? value.toLowerCase().trim() : value;
            case 'uuid':
                return typeof value === 'string' ? value.toLowerCase().trim() : value;
            case 'date':
                return value instanceof Date ? value : new Date(value);
            default:
                return value;
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        if (lastKey) {
            (target as any)[lastKey] = value;
        }
    }
}