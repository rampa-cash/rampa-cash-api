export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export const TRANSACTION_STATUS_DESCRIPTIONS = {
    [TransactionStatus.PENDING]: 'Transaction is pending confirmation',
    [TransactionStatus.CONFIRMED]:
        'Transaction has been confirmed on blockchain',
    [TransactionStatus.FAILED]: 'Transaction failed to execute',
    [TransactionStatus.CANCELLED]: 'Transaction was cancelled by user',
} as const;
