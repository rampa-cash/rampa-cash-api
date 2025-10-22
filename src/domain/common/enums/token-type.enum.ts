export enum TokenType {
    USDC = 'USDC',
    EURC = 'EURC',
    SOL = 'SOL',
}

export const TOKEN_DECIMALS = {
    [TokenType.USDC]: 6,
    [TokenType.EURC]: 6,
    [TokenType.SOL]: 9,
} as const;
