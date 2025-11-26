/**
 * Maps generic payment method IDs to Transak-specific payment method codes
 *
 * @param methodId - Generic method ID from mobile app ('bank' or 'card')
 * @returns Transak payment method code or undefined if not recognized
 *
 * @example
 * getTransakPaymentMethod('bank') // Returns 'sepa_bank_transfer'
 * getTransakPaymentMethod('card') // Returns 'credit_debit_card'
 */
export function getTransakPaymentMethod(methodId: string): string | undefined {
    switch (methodId.toLowerCase()) {
        case 'card':
            return 'credit_debit_card';
        case 'bank':
            // Simplified: Always use SEPA for bank transfers
            // Future enhancement: Add currency-based mapping
            // (GBP → faster_payments, USD → ach_bank_transfer, etc.)
            return 'sepa_bank_transfer';
        default:
            return undefined;
    }
}
