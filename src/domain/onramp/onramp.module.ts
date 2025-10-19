import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnRampController } from './controllers/onramp.controller';
import { OffRampController } from './controllers/offramp.controller';
import { OnRampService } from './services/onramp.service';
import { OffRampService } from './services/offramp.service';
import { ONRAMP_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { OnOffRamp } from './entities/onoff-ramp.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [TypeOrmModule.forFeature([OnOffRamp]), WalletModule],
    controllers: [OnRampController, OffRampController],
    providers: [
        {
            provide: ONRAMP_SERVICE_TOKEN,
            useClass: OnRampService,
        },
        OnRampService,
        OffRampService,
    ],
    exports: [ONRAMP_SERVICE_TOKEN, OnRampService, OffRampService],
})
export class OnRampModule {}
