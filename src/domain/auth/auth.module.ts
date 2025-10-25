import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { ParaSdkConfigService } from './services/para-sdk-config.service';
import { ParaSdkAuthService } from './services/para-sdk-auth.service';
import { SessionValidationService } from './services/session-validation.service';
import { SessionValidationGuard } from './guards/session-validation.guard';

import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { User } from '../user/entities/user.entity';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'local' }),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => UserModule),
        forwardRef(() => WalletModule),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        ParaSdkConfigService,
        ParaSdkAuthService,
        SessionValidationService,
        SessionValidationGuard,
    ],
    exports: [
        AuthService,
        ParaSdkAuthService,
        SessionValidationService,
        SessionValidationGuard,
        PassportModule,
    ],
})
export class AuthModule {}
