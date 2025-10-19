import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolanaConfig } from '../../../config/solana.config';
import { TokenType } from '../enums/token-type.enum';

@Injectable()
export class TokenConfigService {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Get the mint address for a specific token type based on current environment
     */
    getTokenMintAddress(tokenType: TokenType): string {
        const solanaConfig = this.configService.get<SolanaConfig>('solana');

        if (!solanaConfig) {
            throw new Error('Solana configuration not found');
        }

        switch (tokenType) {
            case TokenType.USDC:
                return solanaConfig.tokenMints.USDC;
            case TokenType.EURC:
                return solanaConfig.tokenMints.EURC;
            case TokenType.SOL:
                return solanaConfig.tokenMints.SOL;
            default:
                throw new Error(`Unknown token type: ${tokenType}`);
        }
    }

    /**
     * Get all token mint addresses for the current environment
     */
    getAllTokenMintAddresses(): Record<TokenType, string> {
        const solanaConfig = this.configService.get<SolanaConfig>('solana');

        if (!solanaConfig) {
            throw new Error('Solana configuration not found');
        }

        return {
            [TokenType.USDC]: solanaConfig.tokenMints.USDC,
            [TokenType.EURC]: solanaConfig.tokenMints.EURC,
            [TokenType.SOL]: solanaConfig.tokenMints.SOL,
        };
    }

    /**
     * Get the current Solana network
     */
    getCurrentNetwork(): string {
        const solanaConfig = this.configService.get<SolanaConfig>('solana');

        if (!solanaConfig) {
            throw new Error('Solana configuration not found');
        }

        return solanaConfig.network;
    }

    /**
     * Check if we're on mainnet
     */
    isMainnet(): boolean {
        return this.getCurrentNetwork() === 'mainnet-beta';
    }

    /**
     * Check if we're on devnet
     */
    isDevnet(): boolean {
        return this.getCurrentNetwork() === 'devnet';
    }

    /**
     * Check if we're on testnet
     */
    isTestnet(): boolean {
        return this.getCurrentNetwork() === 'testnet';
    }
}
