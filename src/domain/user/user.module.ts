import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserVerificationController } from './controllers/user-verification.controller';
import { UserVerificationService } from './services/user-verification.service';
import { USER_SERVICE_TOKEN } from '../common/tokens/service-tokens';
import { User } from './entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UserVerificationController, UserController],
    providers: [
        {
            provide: USER_SERVICE_TOKEN,
            useClass: UserService,
        },
        UserService,
        UserVerificationService,
    ],
    exports: [USER_SERVICE_TOKEN, UserService, UserVerificationService],
})
export class UserModule {}
