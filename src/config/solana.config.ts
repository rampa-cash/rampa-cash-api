import { registerAs } from '@nestjs/config';

export interface SolanaConfig {
    rpcUrl: string;
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    commitment: 'processed' | 'confirmed' | 'finalized';
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    tokenMints: {
        USDC: string;
        EURC: string;
        SOL: string;
    };
}

export default registerAs(
    'solana',
    (): SolanaConfig => ({
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        network:
            (process.env.SOLANA_NETWORK as
                | 'mainnet-beta'
                | 'devnet'
                | 'testnet') || 'devnet',
        commitment:
            (process.env.SOLANA_COMMITMENT as
                | 'processed'
                | 'confirmed'
                | 'finalized') || 'confirmed',
        maxRetries: parseInt(process.env.SOLANA_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.SOLANA_RETRY_DELAY || '1000'),
        timeout: parseInt(process.env.SOLANA_TIMEOUT || '30000'),
        tokenMints: {
            USDC:
                process.env.SOLANA_USDC_MINT ||
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
            EURC:
                process.env.SOLANA_EURC_MINT ||
                'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp', // Mainnet EURC
            SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
        },
    }),
);
