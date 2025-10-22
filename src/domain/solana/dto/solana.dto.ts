export interface SolanaTransaction {
    signature: string;
    slot: number;
    blockTime: number | null;
    confirmationStatus: 'processed' | 'confirmed' | 'finalized';
    err: any;
}

export interface SolanaAccountInfo {
    address: string;
    balance: number;
    owner: string;
    executable: boolean;
    rentEpoch: number;
}

export interface SolanaTokenBalance {
    mint: string;
    amount: number;
    decimals: number;
    uiAmount: number;
    tokenProgram: string;
}
