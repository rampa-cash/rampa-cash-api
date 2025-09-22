import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VISACardController } from './controllers/visa-card.controller';
import { VISACardService } from './visa-card.service';
import { VISACard } from './entities/visa-card.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VISACard])],
    controllers: [VISACardController],
    providers: [VISACardService],
    exports: [VISACardService],
})
export class VISACardModule {}
