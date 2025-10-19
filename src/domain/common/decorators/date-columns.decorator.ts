import { CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';

/**
 * Standardized CreateDateColumn decorator
 * Ensures consistent date column naming and configuration
 */
export function CreateDateColumnStandard(options?: {
    name?: string;
    comment?: string;
}) {
    return CreateDateColumn({
        name: options?.name || 'created_at',
        comment: options?.comment || 'Record creation timestamp',
    });
}

/**
 * Standardized UpdateDateColumn decorator
 * Ensures consistent date column naming and configuration
 */
export function UpdateDateColumnStandard(options?: {
    name?: string;
    comment?: string;
}) {
    return UpdateDateColumn({
        name: options?.name || 'updated_at',
        comment: options?.comment || 'Record last update timestamp',
    });
}

/**
 * Standardized date column for specific timestamps
 * Used for events like activation, completion, etc.
 */
export function DateColumnStandard(options: {
    name: string;
    nullable?: boolean;
    comment?: string;
}) {
    return Column({
        name: options.name,
        type: 'timestamp',
        nullable: options.nullable ?? true,
        comment: options.comment || `Timestamp for ${options.name}`,
    });
}

/**
 * Timezone-aware date column
 * Stores dates with timezone information
 */
export function TimezoneDateColumn(options: {
    name: string;
    nullable?: boolean;
    comment?: string;
}) {
    return Column({
        name: options.name,
        type: 'timestamptz', // PostgreSQL timezone-aware timestamp
        nullable: options.nullable ?? true,
        comment:
            options.comment || `Timezone-aware timestamp for ${options.name}`,
    });
}
