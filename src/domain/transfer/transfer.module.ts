import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { TransferOrchestrationService } from './services/transfer-orchestration.service';
import { TransferController } from './controllers/transfer.controller';
import { WalletModule } from '../wallet/wallet.module';
import { SolanaModule } from '../solana/solana.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, Wallet, WalletBalance]),
        forwardRef(() => WalletModule),
        SolanaModule,
    ],
    providers: [TransferOrchestrationService],
    controllers: [TransferController],
    exports: [TransferOrchestrationService],
})
export class TransferModule {}
