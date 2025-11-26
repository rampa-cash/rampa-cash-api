import { Injectable, Logger } from '@nestjs/common';
import { PublicKey, Transaction } from '@solana/web3.js';
import { ParaSolanaWeb3Signer } from '@getpara/solana-web3.js-v1-integration';
import { SolanaConnectionService } from './solana-connection.service';
import { ParaSdkSessionManager } from '../../../infrastructure/adapters/auth/para-sdk/para-sdk-session.manager';

export interface ParaSigningResult {
    signature: string;
    transaction: Transaction;
}

/**
 * Para signing bridge.
 *
 * Tries to use Para Server SDK (via ParaSdkSessionManager) to sign and send
 * Solana transactions. Falls back to a clear error if no session or signing
 * method is available.
 */
@Injectable()
export class ParaSigningService {
    private readonly logger = new Logger(ParaSigningService.name);

    constructor(
        private readonly solanaConnectionService: SolanaConnectionService,
        private readonly paraSessionManager: ParaSdkSessionManager,
    ) {}

    /**
     * Sign and send a Solana transaction using Para. Requires an active Para session token.
     */
    async signAndSendWithPara(
        transaction: Transaction,
        paraSessionToken?: string,
        paraSerializedSession?: string,
        walletId?: string,
    ): Promise<ParaSigningResult> {
        if (!paraSessionToken) {
            throw new Error('Para session token is required for signing');
        }
        if (!walletId) {
            throw new Error('Para walletId is required for signing');
        }

        // Prepare transaction with blockhash and fee payer
        const connection = this.solanaConnectionService.getConnection();

        let paraServer =
            this.paraSessionManager.getParaServer(paraSessionToken);

        // If session not yet imported in server SDK, try importing with the serialized token
        if (!paraServer) {
            try {
                // The serialized session should contain the signers needed for server-side operations.
                // The session token is just an identifier.
                const sessionToImport = paraSerializedSession || paraSessionToken;
                if (!paraSerializedSession) {
                    this.logger.warn(
                        'paraSerializedSession not provided, falling back to using paraSessionToken. This may fail if signers are not included.',
                    );
                }

                await this.paraSessionManager.importSession(
                    paraSessionToken,
                    sessionToImport,
                );
                paraServer =
                    this.paraSessionManager.getParaServer(paraSessionToken);

                // Verify the session is properly loaded and active
                if (paraServer) {
                    const isActive = await paraServer.isSessionActive();
                    if (!isActive) {
                        this.logger.error(
                            `Para session for token ${paraSessionToken} is not active after import`,
                        );
                        // Clean up the inactive session
                        this.paraSessionManager.revokeSession(paraSessionToken);
                        throw new Error('Session not active after import');
                    }
                    this.logger.log(
                        'Para session imported and verified as active.',
                    );
                }
            } catch (err) {
                this.logger.error(
                    `Failed to import Para session ${paraSessionToken}: ${err.message}`,
                );
            }
        }

        if (!paraServer) {
            throw new Error('Para session not found or inactive');
        }

        // Create Para Solana signer (uses Para wallet as fee payer)
        const solanaSigner = new ParaSolanaWeb3Signer(
            paraServer as any,
            connection,
        );


        if (!solanaSigner.sender) {
            throw new Error(
                'Para Solana signer did not provide a sender/feePayer address',
            );
        }

        // Prepare original transaction (set blockhash/feePayer) using signer sender
        const { blockhash: latestBlockhash } =
            await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash;
        transaction.feePayer = solanaSigner.sender;

        // Prefer signer.sendTransaction if available (per Para examples)
        const sendFn = (solanaSigner as any).sendTransaction;
        if (typeof sendFn === 'function') {
            const signature = await sendFn.call(solanaSigner, transaction);
            return { signature, transaction };
        }

        // Fallback: signTransaction + sendRawTransaction (if sendTransaction not present)
        await (solanaSigner as any).signTransaction(transaction);
        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            {
                skipPreflight: false,
                preflightCommitment: 'processed',
            },
        );

        return {
            signature,
            transaction,
        };
    }
}
