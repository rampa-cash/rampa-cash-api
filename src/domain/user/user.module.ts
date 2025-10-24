import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserVerificationController } from './controllers/user-verification.controller';
import { UserVerificationService } from './services/user-verification.service';
import { UserCreationService } from './services/user-creation.service';
import { KycService } from './services/kyc.service';
import { USER_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        forwardRef(() => AuthModule),
    ],
    controllers: [UserVerificationController, UserController],
    providers: [
        {
            provide: USER_SERVICE_TOKEN,
            useClass: UserService,
        },
        UserService,
        UserVerificationService,
        UserCreationService,
        KycService,
    ],
    exports: [USER_SERVICE_TOKEN, UserService, UserVerificationService, UserCreationService, KycService],
})
export class UserModule {}
