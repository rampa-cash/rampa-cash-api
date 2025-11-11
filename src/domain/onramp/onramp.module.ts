import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnRampController } from './controllers/onramp.controller';
import { OnRampService } from './services/onramp.service';
import { OnRampProviderFactoryService } from './services/onramp-provider-factory.service';
import { OnRampTransaction } from './entities/onramp-transaction.entity';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';
import { EventBusModule } from '../common/modules/event-bus.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OnRampTransaction]),
        forwardRef(() => WalletModule),
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule), // Required for SessionValidationGuard which needs UserService
        EventBusModule,
    ],
    controllers: [OnRampController],
    providers: [OnRampService, OnRampProviderFactoryService],
    exports: [OnRampService, OnRampProviderFactoryService],
})
export class OnRampModule {}
