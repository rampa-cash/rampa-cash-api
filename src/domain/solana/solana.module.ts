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
import { SolanaBlockchainService } from './services/solana-blockchain.service';
import { SolanaTransactionBuilderService } from './services/solana-transaction-builder.service';
import { SolanaBalanceService } from './services/solana-balance.service';
import { SolanaMonitorService } from './services/solana-monitor.service';
import { TokenConfigService } from '../common/services/token-config.service';
import { SolanaFundingController } from './controllers/solana-funding.controller';
import { ParaSigningService } from './services/para-signing.service';
import { ParaSdkAdapterModule } from '../../infrastructure/adapters/auth/para-sdk/para-sdk.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { EventBusModule } from '../common/modules/event-bus.module';
import solanaConfig from '../../config/solana.config';

@Module({
    imports: [
        ConfigModule.forFeature(solanaConfig),
        forwardRef(() => WalletModule),
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule), // Required for SessionValidationGuard which needs UserService
        EventBusModule,
        ParaSdkAdapterModule,
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
        SolanaBlockchainService,
        SolanaTransactionBuilderService,
        SolanaBalanceService,
        SolanaMonitorService,
        TokenConfigService,
        ParaSigningService,
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
        SolanaBlockchainService,
        SolanaTransactionBuilderService,
        SolanaBalanceService,
        SolanaMonitorService,
        TokenConfigService,
        ParaSigningService,
    ],
})
export class SolanaModule {}
