import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './controllers/transaction.controller';
import { TransactionService } from './services/transaction.service';
import { TRANSACTION_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { Transaction } from './entities/transaction.entity';
import { WalletModule } from '../wallet/wallet.module';
import { SolanaModule } from '../solana/solana.module';

@Module({
    imports: [TypeOrmModule.forFeature([Transaction]), forwardRef(() => WalletModule), SolanaModule],
    controllers: [TransactionController],
    providers: [
        {
            provide: TRANSACTION_SERVICE_TOKEN,
            useClass: TransactionService,
        },
        TransactionService,
    ],
    exports: [TRANSACTION_SERVICE_TOKEN, TransactionService],
})
export class TransactionModule {}
