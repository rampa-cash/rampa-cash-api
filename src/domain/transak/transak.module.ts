import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TransakController } from './controllers/transak.controller';
import { TransakService } from './services/transak.service';
import { OnRampTransaction } from '../onramp/entities/onramp-transaction.entity';
import { OffRampTransaction } from '../offramp/entities/offramp-transaction.entity';
import { OnRampModule } from '../onramp/onramp.module';
import { OffRampModule } from '../offramp/offramp.module';
import { SumsubModule } from '../sumsub/sumsub.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([OnRampTransaction, OffRampTransaction]),
        forwardRef(() => OnRampModule),
        forwardRef(() => OffRampModule),
        forwardRef(() => SumsubModule),
        forwardRef(() => WalletModule),
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule), // Required for SessionValidationGuard which needs UserService
    ],
    controllers: [TransakController],
    providers: [TransakService],
    exports: [TransakService],
})
export class TransakModule {}
