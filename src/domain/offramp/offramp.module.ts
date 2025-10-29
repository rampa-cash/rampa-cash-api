import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffRampTransaction } from './entities/offramp-transaction.entity';
import { OffRampService } from './services/offramp.service';
import { OffRampProviderFactoryService } from './services/offramp-provider-factory.service';
import { OffRampController } from './controllers/offramp.controller';
import { WalletModule } from '../wallet/wallet.module';
import { EventBusModule } from '../common/modules/event-bus.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OffRampTransaction]),
        forwardRef(() => WalletModule),
        EventBusModule,
        forwardRef(() => AuthModule),
    ],
    controllers: [OffRampController],
    providers: [OffRampService, OffRampProviderFactoryService],
    exports: [OffRampService, OffRampProviderFactoryService],
})
export class OffRampModule {}
