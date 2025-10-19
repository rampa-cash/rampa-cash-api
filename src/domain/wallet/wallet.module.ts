import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { WalletBalanceService } from './services/wallet-balance.service';
import { CachedWalletService } from './services/cached-wallet.service';
import { CachedWalletBalanceService } from './services/cached-wallet-balance.service';
import { AddressResolutionService } from './services/address-resolution.service';
import { CacheService } from '../common/services/cache.service';
import { WALLET_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { Wallet } from './entities/wallet.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { User } from '../user/entities/user.entity';
import { SolanaModule } from '../solana/solana.module';
import { TransferModule } from '../transfer/transfer.module';
import { EventBusModule } from '../common/modules/event-bus.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Wallet, WalletBalance, User]),
        SolanaModule,
        TransferModule,
        EventBusModule,
    ],
    controllers: [WalletController],
    providers: [
        CacheService,
        {
            provide: WALLET_SERVICE_TOKEN,
            useClass: WalletService,
        },
        WalletService,
        WalletBalanceService,
        CachedWalletService,
        CachedWalletBalanceService,
        AddressResolutionService,
    ],
    exports: [
        CacheService,
        WALLET_SERVICE_TOKEN,
        WalletService,
        WalletBalanceService,
        CachedWalletService,
        CachedWalletBalanceService,
        AddressResolutionService,
    ],
})
export class WalletModule {}
