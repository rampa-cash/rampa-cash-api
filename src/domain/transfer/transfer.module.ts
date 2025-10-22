import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { TransferOrchestrationService } from './services/transfer-orchestration.service';
import { AtomicTransferService } from './services/atomic-transfer.service';
import { TransferController } from './controllers/transfer.controller';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { SolanaModule } from '../solana/solana.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseTransactionService } from '../common/services/transaction.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, Wallet, WalletBalance]),
        forwardRef(() => WalletModule),
        forwardRef(() => TransactionModule),
        forwardRef(() => SolanaModule),
        forwardRef(() => AuthModule),
    ],
    providers: [
        DatabaseTransactionService,
        TransferOrchestrationService,
        AtomicTransferService,
    ],
    controllers: [TransferController],
    exports: [
        DatabaseTransactionService,
        TransferOrchestrationService,
        AtomicTransferService,
    ],
})
export class TransferModule {}
