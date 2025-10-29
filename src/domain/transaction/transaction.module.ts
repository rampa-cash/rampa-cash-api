import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './controllers/transaction.controller';
import { TransactionService } from './services/transaction.service';
import { TransactionHistoryService } from './services/transaction-history.service';
import { SentTransactionsService } from './services/sent-transactions.service';
import { ReceivedTransactionsService } from './services/received-transactions.service';
import { TransactionHistoryRepository } from './repositories/transaction-history.repository';
import { TRANSACTION_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { Transaction } from './entities/transaction.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { WalletModule } from '../wallet/wallet.module';
import { SolanaModule } from '../solana/solana.module';
import { UserModule } from '../user/user.module';
import { EventBusModule } from '../common/modules/event-bus.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, WalletBalance]),
        forwardRef(() => WalletModule),
        forwardRef(() => SolanaModule),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule),
        EventBusModule,
    ],
    controllers: [TransactionController],
    providers: [
        {
            provide: TRANSACTION_SERVICE_TOKEN,
            useClass: TransactionService,
        },
        TransactionService,
        TransactionHistoryService,
        SentTransactionsService,
        ReceivedTransactionsService,
        TransactionHistoryRepository,
    ],
    exports: [TRANSACTION_SERVICE_TOKEN, TransactionService],
})
export class TransactionModule {}
