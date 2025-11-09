import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { SessionValidationService } from './services/session-validation.service';
import { SessionValidationGuard } from './guards/session-validation.guard';
import {
    AUTHENTICATION_SERVICE_TOKEN,
    AuthenticationService,
} from './interfaces/authentication-service.interface';

// Infrastructure adapters
import { ParaSdkAdapterModule } from '../../infrastructure/adapters/auth/para-sdk/para-sdk.module';
import { ParaSdkAuthService } from '../../infrastructure/adapters/auth/para-sdk/para-sdk-auth.service';

import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { User } from '../user/entities/user.entity';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'local' }),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => UserModule),
        forwardRef(() => WalletModule),
        // Import infrastructure adapter module
        ParaSdkAdapterModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        // Port and Adapters: Bind PORT (interface) to ADAPTER (implementation)
        // The adapter is provided by ParaSdkAdapterModule from infrastructure layer
        {
            provide: AUTHENTICATION_SERVICE_TOKEN,
            useClass: ParaSdkAuthService,
        },
        SessionValidationService,
        SessionValidationGuard,
    ],
    exports: [
        AuthService,
        // Export PORT token instead of concrete implementation
        AUTHENTICATION_SERVICE_TOKEN,
        SessionValidationService,
        SessionValidationGuard,
        PassportModule,
    ],
})
export class AuthModule {}
