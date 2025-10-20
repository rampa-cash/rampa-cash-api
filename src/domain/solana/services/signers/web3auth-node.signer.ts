import { Injectable } from '@nestjs/common';
import { Web3AuthNodeService } from '../../../auth/services/web3auth-node.service';
import { ISolanaTransactionSigner } from '../../interfaces/solana-transaction-signer.interface';

@Injectable()
export class Web3AuthNodeSigner implements ISolanaTransactionSigner {
    constructor(private readonly web3authNode: Web3AuthNodeService) {}

    private signer?: any;

    async init(params: { userId: string }): Promise<void> {
        const result = await this.web3authNode.connect({
            userId: params.userId,
        });
        this.signer = result?.signer; // TransactionSigner
        if (!this.signer)
            throw new Error('No Solana signer returned by Web3Auth');
    }

    async getPublicKey(): Promise<string> {
        if (!this.signer) throw new Error('Signer not initialized');
        // Many SDKs expose publicKey or address on the signer
        return this.signer.address ?? this.signer.publicKey?.toString?.() ?? '';
    }

    async signTransaction(rawTx: Uint8Array | Buffer): Promise<Uint8Array> {
        if (!this.signer) throw new Error('Signer not initialized');
        const input =
            rawTx instanceof Uint8Array ? rawTx : new Uint8Array(rawTx);
        const signed = await this.signer.signTransaction(input);
        // Zeroize input buffer reference
        input.fill(0);
        return signed;
    }
}
