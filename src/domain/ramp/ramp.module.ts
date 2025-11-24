import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RampController } from './controllers/ramp.controller';
import { ProviderRouterService } from './services/provider-router.service';
import { User } from '../user/entities/user.entity';
import { SumsubApplicantEntity } from '../sumsub/entities/sumsub-applicant.entity';
import { SumsubModule } from '../sumsub/sumsub.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { TransakModule } from '../transak/transak.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([User, SumsubApplicantEntity]),
        forwardRef(() => SumsubModule),
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule), // Required for SessionValidationGuard
        forwardRef(() => TransakModule), // Required for TransakService in webhook handler
    ],
    controllers: [RampController],
    providers: [ProviderRouterService],
    exports: [ProviderRouterService], // Export for use in TransakController
})
export class RampModule {}

