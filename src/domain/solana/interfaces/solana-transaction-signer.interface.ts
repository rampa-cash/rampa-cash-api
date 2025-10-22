export interface ISolanaTransactionSigner {
    getPublicKey(): Promise<string>;
    signTransaction(rawTx: Uint8Array | Buffer): Promise<Uint8Array>;
}
