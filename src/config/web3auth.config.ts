import { registerAs } from '@nestjs/config';

export interface Web3AuthConfig {
    clientId: string;
    web3AuthNetwork: string;
    publicKey: string;
    issuer: string;
    jwksUri?: string;
    chainConfig: {
        chainNamespace: string;
        chainId: string;
        rpcTarget: string;
        displayName: string;
        blockExplorerUrl: string;
        ticker: string;
        tickerName: string;
    };
    uiConfig: {
        theme: string;
        loginMethodsOrder: string[];
        defaultLanguage: string;
        loginGridCol: number;
        primaryButton: string;
    };
}

export default registerAs(
    'web3auth',
    (): Web3AuthConfig => ({
        clientId: process.env.WEB3AUTH_CLIENT_ID || '',
        web3AuthNetwork: process.env.WEB3AUTH_NETWORK || 'testnet',
        publicKey: process.env.WEB3AUTH_PUBLIC_KEY || '',
        issuer: process.env.WEB3AUTH_ISSUER || 'https://api.openlogin.com',
        jwksUri: process.env.WEB3AUTH_JWKS_URI,
        chainConfig: {
            chainNamespace: 'solana',
            chainId: process.env.SOLANA_NETWORK || 'devnet',
            rpcTarget:
                process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            displayName: 'Solana Devnet',
            blockExplorerUrl: 'https://explorer.solana.com/?cluster=devnet',
            ticker: 'SOL',
            tickerName: 'Solana',
        },
        uiConfig: {
            theme: 'light',
            loginMethodsOrder: [
                'google',
                'apple',
                'facebook',
                'twitter',
                'reddit',
                'discord',
                'twitch',
                'line',
                'github',
                'kakao',
                'linkedin',
                'weibo',
                'wechat',
                'email_passwordless',
            ],
            defaultLanguage: 'en',
            loginGridCol: 3,
            primaryButton: 'externalLogin',
        },
    }),
);
