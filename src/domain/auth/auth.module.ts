import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { ParaSdkConfigService } from './services/para-sdk-config.service';
import { ParaSdkAuthService } from './services/para-sdk-auth.service';
import { SessionValidationService } from './services/session-validation.service';

import { UserService } from '../user/services/user.service';
import { UserVerificationService } from '../user/services/user-verification.service';
import { WalletModule } from '../wallet/wallet.module';
import { User } from '../user/entities/user.entity';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'local' }),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => WalletModule),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        ParaSdkConfigService,
        ParaSdkAuthService,
        SessionValidationService,
        UserService,
        UserVerificationService,
    ],
    exports: [
        AuthService,
        ParaSdkAuthService,
        SessionValidationService,
        PassportModule,
    ],
})
export class AuthModule {}