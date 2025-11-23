import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SumsubApplicantEntity } from './entities/sumsub-applicant.entity';
import { SumsubService } from './services/sumsub.service';
import { SumsubController } from './controllers/sumsub.controller';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SumsubAdapterModule } from '../../infrastructure/adapters/sumsub/sumsub.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([SumsubApplicantEntity]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule),
        SumsubAdapterModule,
    ],
    controllers: [SumsubController],
    providers: [SumsubService],
    exports: [SumsubService],
})
export class SumsubModule {}
