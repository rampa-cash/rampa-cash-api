import { Column } from 'typeorm';

/**
 * Decorator for crypto token decimal precision (18,8)
 * 18 total digits, 8 decimal places
 * Suitable for: USDC, EURC, SOL, and other crypto tokens
 */
export function CryptoDecimalColumn(options?: {
    name?: string;
    nullable?: boolean;
    default?: number;
    comment?: string;
}) {
    return Column({
        name: options?.name,
        type: 'decimal',
        precision: 18,
        scale: 8,
        nullable: options?.nullable ?? false,
        default: options?.default ?? 0,
        comment: options?.comment,
    });
}

/**
 * Decorator for fiat currency decimal precision (18,2)
 * 18 total digits, 2 decimal places
 * Suitable for: USD, EUR, and other fiat currencies
 */
export function FiatDecimalColumn(options?: {
    name?: string;
    nullable?: boolean;
    default?: number;
    comment?: string;
}) {
    return Column({
        name: options?.name,
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: options?.nullable ?? false,
        default: options?.default ?? 0,
        comment: options?.comment,
    });
}

/**
 * Decorator for exchange rate decimal precision (18,8)
 * 18 total digits, 8 decimal places
 * Suitable for: Exchange rates, conversion rates
 */
export function ExchangeRateDecimalColumn(options?: {
    name?: string;
    nullable?: boolean;
    default?: number;
    comment?: string;
}) {
    return Column({
        name: options?.name,
        type: 'decimal',
        precision: 18,
        scale: 8,
        nullable: options?.nullable ?? false,
        default: options?.default ?? 0,
        comment: options?.comment,
    });
}

/**
 * Decorator for percentage decimal precision (5,4)
 * 5 total digits, 4 decimal places
 * Suitable for: Fees, rates, percentages (0.0001 to 99.9999)
 */
export function PercentageDecimalColumn(options?: {
    name?: string;
    nullable?: boolean;
    default?: number;
    comment?: string;
}) {
    return Column({
        name: options?.name,
        type: 'decimal',
        precision: 5,
        scale: 4,
        nullable: options?.nullable ?? false,
        default: options?.default ?? 0,
        comment: options?.comment,
    });
}

/**
 * Decorator for count decimal precision (10,0)
 * 10 total digits, 0 decimal places
 * Suitable for: Quantities, counts, IDs
 */
export function CountDecimalColumn(options?: {
    name?: string;
    nullable?: boolean;
    default?: number;
    comment?: string;
}) {
    return Column({
        name: options?.name,
        type: 'decimal',
        precision: 10,
        scale: 0,
        nullable: options?.nullable ?? false,
        default: options?.default ?? 0,
        comment: options?.comment,
    });
}
