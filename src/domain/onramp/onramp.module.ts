import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnRampController } from './controllers/onramp.controller';
import { OffRampController } from './controllers/offramp.controller';
import { OnRampService } from './onramp.service';
import { OffRampService } from './offramp.service';
import { OnOffRamp } from './entities/onoff-ramp.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [TypeOrmModule.forFeature([OnOffRamp]), WalletModule],
    controllers: [OnRampController, OffRampController],
    providers: [OnRampService, OffRampService],
    exports: [OnRampService, OffRampService],
})
export class OnRampModule {}
