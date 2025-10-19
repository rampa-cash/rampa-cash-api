import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { WalletBalanceService } from './services/wallet-balance.service';
import { AddressResolutionService } from './services/address-resolution.service';
import { Wallet } from './entities/wallet.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { User } from '../user/entities/user.entity';
import { SolanaModule } from '../solana/solana.module';
import { TransferModule } from '../transfer/transfer.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Wallet, WalletBalance, User]),
        SolanaModule,
        TransferModule,
    ],
    controllers: [WalletController],
    providers: [WalletService, WalletBalanceService, AddressResolutionService],
    exports: [WalletService, WalletBalanceService, AddressResolutionService],
})
export class WalletModule {}
