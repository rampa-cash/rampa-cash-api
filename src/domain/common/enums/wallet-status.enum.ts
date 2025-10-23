export enum WalletStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

export const WALLET_STATUS_DESCRIPTIONS = {
    [WalletStatus.ACTIVE]: 'Wallet is active and can be used for transactions',
    [WalletStatus.SUSPENDED]:
        'Wallet is suspended and cannot be used for transactions',
} as const;
