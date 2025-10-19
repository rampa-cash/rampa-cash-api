import { Module } from '@nestjs/common';
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
import { WalletService } from '../wallet/services/wallet.service';
import { User } from '../user/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';

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
        TypeOrmModule.forFeature([User, Wallet, WalletBalance]),
    ],
    controllers: [AuthController, Web3AuthController],
    providers: [
        AuthService,
        Web3AuthValidationService,
        JwtStrategy,
        Web3AuthStrategy,
        Web3AuthJwtStrategy,
        JwtAuthGuard,
        Web3AuthGuard,
        Web3AuthJwtGuard,
        Web3AuthOrJwtGuard,
        UserService,
        UserVerificationService,
        WalletService,
    ],
    exports: [
        AuthService,
        Web3AuthValidationService,
        JwtAuthGuard,
        Web3AuthGuard,
        Web3AuthJwtGuard,
        Web3AuthOrJwtGuard,
        PassportModule,
        JwtModule,
    ],
})
export class AuthModule {}
