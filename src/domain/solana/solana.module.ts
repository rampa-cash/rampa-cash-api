import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolanaService } from './services/solana.service';
import { SolanaConnectionService } from './services/solana-connection.service';
import { SplTokenService } from './services/spl-token.service';
import { SolanaRetryService } from './services/solana-retry.service';
import { SolanaHealthService } from './services/solana-health.service';
import { TokenAccountService } from './services/token-account.service';
import { SolanaTransferService } from './services/solana-transfer.service';
import { TokenConfigService } from '../common/services/token-config.service';
import solanaConfig from '../../config/solana.config';

@Module({
    imports: [ConfigModule.forFeature(solanaConfig)],
    providers: [
        SolanaService,
        SolanaConnectionService,
        SplTokenService,
        SolanaRetryService,
        SolanaHealthService,
        TokenAccountService,
        SolanaTransferService,
        TokenConfigService,
    ],
    exports: [
        SolanaService,
        SolanaConnectionService,
        SplTokenService,
        SolanaRetryService,
        SolanaHealthService,
        TokenAccountService,
        SolanaTransferService,
        TokenConfigService,
    ],
})
export class SolanaModule {}
