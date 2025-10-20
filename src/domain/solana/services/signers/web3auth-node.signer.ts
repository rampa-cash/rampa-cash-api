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

    async signTransaction(rawTx: Uint8Array | Buffer | any): Promise<Uint8Array> {
        if (!this.signer) throw new Error('Signer not initialized');
        
        console.log('Web3Auth signer - Input type:', typeof rawTx);
        console.log('Web3Auth signer - Signer type:', typeof this.signer);
        console.log('Web3Auth signer - Signer methods:', Object.getOwnPropertyNames(this.signer));
        
        let transaction;
        
        if (rawTx instanceof Uint8Array || Buffer.isBuffer(rawTx)) {
            // If it's serialized bytes, deserialize it first
            const { Transaction } = await import('@solana/web3.js');
            transaction = Transaction.from(rawTx);
            console.log('Web3Auth signer - Transaction deserialized from bytes');
        } else {
            // If it's already a Transaction object, use it directly
            transaction = rawTx;
            console.log('Web3Auth signer - Using provided Transaction object');
        }
        
        console.log('Web3Auth signer - Transaction feePayer:', transaction.feePayer?.toString());
        console.log('Web3Auth signer - Web3Auth signer address:', this.signer.address);
        console.log('Web3Auth signer - Transaction signatures before signing:', transaction.signatures.length);
        
        // Ensure the transaction's feePayer matches the Web3Auth signer's address
        const { PublicKey } = await import('@solana/web3.js');
        const signerPublicKey = new PublicKey(this.signer.address);
        
        if (!transaction.feePayer || !transaction.feePayer.equals(signerPublicKey)) {
            console.log('Web3Auth signer - Setting feePayer to match signer address');
            transaction.feePayer = signerPublicKey;
        }
        
        // According to MetaMask documentation, we should use signMessages for Solana signing
        // The Web3Auth signer provides signMessages method, not signTransactions
        console.log('Web3Auth signer - Using signMessages method for Solana transaction signing');
        
        // Serialize the transaction to get the message bytes
        const messageBytes = transaction.serializeMessage();
        console.log('Web3Auth signer - Transaction message bytes length:', messageBytes.length);
        
        // Create a signable message from the transaction bytes
        // According to MetaMask docs, we need to create a SignableMessage object
        const { createSignableMessage } = await import('@solana/signers');
        const signableMessage = createSignableMessage(messageBytes);
        console.log('Web3Auth signer - Created signable message');
        
        // Sign the message using Web3Auth signer's signMessages method
        console.log('Web3Auth signer - Signing message with Web3Auth signer...');
        const signatures = await this.signer.signMessages([signableMessage]);
        console.log('Web3Auth signer - Signatures returned:', signatures);
        console.log('Web3Auth signer - Signatures type:', typeof signatures);
        console.log('Web3Auth signer - Signatures length:', signatures?.length);
        
        if (!signatures || signatures.length === 0) {
            throw new Error('No signatures returned from Web3Auth signer');
        }
        
        const signature = signatures[0];
        console.log('Web3Auth signer - First signature:', signature);
        console.log('Web3Auth signer - Signature type:', typeof signature);
        console.log('Web3Auth signer - Signature length:', signature?.length);
        console.log('Web3Auth signer - Signature properties:', Object.keys(signature || {}));
        
        // Convert signature to Uint8Array if needed
        let signatureBytes;
        if (typeof signature === 'string') {
            // If it's a hex string, convert to Uint8Array
            signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
        } else if (signature instanceof Uint8Array) {
            signatureBytes = signature;
        } else if (Buffer.isBuffer(signature)) {
            signatureBytes = new Uint8Array(signature);
        } else if (signature && typeof signature === 'object') {
            // If it's an object, try to extract the signature data from common properties
            if (signature.signature) {
                // Try signature.signature property
                if (typeof signature.signature === 'string') {
                    signatureBytes = new Uint8Array(Buffer.from(signature.signature, 'hex'));
                } else if (signature.signature instanceof Uint8Array) {
                    signatureBytes = signature.signature;
                } else if (Buffer.isBuffer(signature.signature)) {
                    signatureBytes = new Uint8Array(signature.signature);
                }
            } else if (signature.data) {
                // Try signature.data property
                if (typeof signature.data === 'string') {
                    signatureBytes = new Uint8Array(Buffer.from(signature.data, 'hex'));
                } else if (signature.data instanceof Uint8Array) {
                    signatureBytes = signature.data;
                } else if (Buffer.isBuffer(signature.data)) {
                    signatureBytes = new Uint8Array(signature.data);
                }
            } else if (signature.bytes) {
                // Try signature.bytes property
                if (typeof signature.bytes === 'string') {
                    signatureBytes = new Uint8Array(Buffer.from(signature.bytes, 'hex'));
                } else if (signature.bytes instanceof Uint8Array) {
                    signatureBytes = signature.bytes;
                } else if (Buffer.isBuffer(signature.bytes)) {
                    signatureBytes = new Uint8Array(signature.bytes);
                }
            } else {
                // Try to find the signature using the public key as the property key
                const publicKeyString = signerPublicKey.toString();
                if (signature[publicKeyString]) {
                    const sigData = signature[publicKeyString];
                    console.log('Web3Auth signer - Found signature using public key property:', typeof sigData);
                    if (typeof sigData === 'string') {
                        signatureBytes = new Uint8Array(Buffer.from(sigData, 'hex'));
                    } else if (sigData instanceof Uint8Array) {
                        signatureBytes = sigData;
                    } else if (Buffer.isBuffer(sigData)) {
                        signatureBytes = new Uint8Array(sigData);
                    } else {
                        console.log('Web3Auth signer - Unknown signature data format:', sigData);
                        throw new Error('Invalid signature data format from Web3Auth signer');
                    }
                } else {
                    console.log('Web3Auth signer - Unknown signature object format:', signature);
                    throw new Error('Invalid signature format from Web3Auth signer');
                }
            }
        } else {
            console.log('Web3Auth signer - Unknown signature format:', signature);
            throw new Error('Invalid signature format from Web3Auth signer');
        }
        
        console.log('Web3Auth signer - Converted signature bytes length:', signatureBytes.length);
        
        // Add the signature to the transaction
        transaction.addSignature(signerPublicKey, signatureBytes);
        console.log('Web3Auth signer - Signature added to transaction');
        
        const signedTransaction = transaction;
        
        console.log('Web3Auth signer - Transaction signed successfully');
        console.log('Web3Auth signer - Signed transaction signatures:', signedTransaction.signatures.length);
        
        // Return the serialized signed transaction
        const serialized = signedTransaction.serialize();
        console.log('Web3Auth signer - Serialized signed transaction size:', serialized.length);
        
        return serialized;
    }
}
