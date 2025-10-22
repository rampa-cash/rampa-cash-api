import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VISACardController } from './controllers/visa-card.controller';
import { VISACardService } from './services/visa-card.service';
import { VISACARD_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { VISACard } from './entities/visa-card.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VISACard])],
    controllers: [VISACardController],
    providers: [
        {
            provide: VISACARD_SERVICE_TOKEN,
            useClass: VISACardService,
        },
        VISACardService,
    ],
    exports: [VISACARD_SERVICE_TOKEN, VISACardService],
})
export class VISACardModule {}
