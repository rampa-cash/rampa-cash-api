import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolanaService } from './services/solana.service';
import { SolanaConnectionService } from './services/solana-connection.service';
import { SplTokenService } from './services/spl-token.service';
import { SolanaRetryService } from './services/solana-retry.service';
import { SolanaHealthService } from './services/solana-health.service';
import { TokenAccountService } from './services/token-account.service';
import { SolanaTransferService } from './services/solana-transfer.service';
import { SolanaFundingService } from './services/solana-funding.service';
import { TokenConfigService } from '../common/services/token-config.service';
import { SolanaFundingController } from './controllers/solana-funding.controller';
import { WalletModule } from '../wallet/wallet.module';
import solanaConfig from '../../config/solana.config';

@Module({
    imports: [
        ConfigModule.forFeature(solanaConfig),
        forwardRef(() => WalletModule),
    ],
    controllers: [SolanaFundingController],
    providers: [
        SolanaService,
        SolanaConnectionService,
        SplTokenService,
        SolanaRetryService,
        SolanaHealthService,
        TokenAccountService,
        SolanaTransferService,
        SolanaFundingService,
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
        SolanaFundingService,
        TokenConfigService,
    ],
})
export class SolanaModule {}
