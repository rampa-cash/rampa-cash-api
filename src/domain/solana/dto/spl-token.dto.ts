import { PublicKey } from '@solana/web3.js';

export interface TokenBalance {
    mint: string;
    amount: number;
    decimals: number;
    uiAmount: number;
    tokenProgram: string;
    owner: string;
}

export interface TokenAccount {
    address: string;
    mint: string;
    owner: string;
    amount: number;
    decimals: number;
    uiAmount: number;
}

export interface TransferTokenParams {
    from: PublicKey;
    to: PublicKey;
    mint: PublicKey;
    amount: number;
    decimals: number;
}
