export interface AccountInfo {
    address: string;
    balance: number;
    owner: string;
    executable: boolean;
    rentEpoch: number;
    data?: Buffer;
}

export interface TokenAccountInfo {
    address: string;
    mint: string;
    owner: string;
    amount: number;
    decimals: number;
    uiAmount: number;
}
