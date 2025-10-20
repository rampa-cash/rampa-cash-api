import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { Web3AuthController } from './controllers/web3auth.controller';
import { AuthService } from './services/auth.service';
import { Web3AuthValidationService } from './services/web3auth-validation.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
    Web3AuthStrategy,
    Web3AuthJwtStrategy,
} from './strategies/web3auth.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
    Web3AuthGuard,
    Web3AuthJwtGuard,
    Web3AuthOrJwtGuard,
} from './guards/web3auth.guard';

import { UserService } from '../user/services/user.service';
import { UserVerificationService } from '../user/services/user-verification.service';
import { WalletModule } from '../wallet/wallet.module';
import { User } from '../user/entities/user.entity';
import { Web3AuthNodeService } from './services/web3auth-node.service';
import { Web3AuthNodeSigner } from '../solana/services/signers/web3auth-node.signer';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret:
                    configService.get<string>('JWT_SECRET') ||
                    'your-secret-key',
                signOptions: {
                    expiresIn:
                        configService.get<string>('JWT_EXPIRES_IN') || '3600s',
                },
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => WalletModule),
    ],
    controllers: [AuthController, Web3AuthController],
    providers: [
        AuthService,
        Web3AuthValidationService,
        Web3AuthNodeService,
        Web3AuthNodeSigner,
        JwtStrategy,
        Web3AuthStrategy,
        Web3AuthJwtStrategy,
        JwtAuthGuard,
        Web3AuthGuard,
        Web3AuthJwtGuard,
        Web3AuthOrJwtGuard,
        UserService,
        UserVerificationService,
    ],
    exports: [
        AuthService,
        Web3AuthValidationService,
        Web3AuthNodeService,
        Web3AuthNodeSigner,
        JwtAuthGuard,
        Web3AuthGuard,
        Web3AuthJwtGuard,
        Web3AuthOrJwtGuard,
        PassportModule,
        JwtModule,
    ],
})
export class AuthModule {}
