import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { Web3AuthService } from './services/web3auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { User } from '../user/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret:
                    configService.get<string>('JWT_SECRET') ||
                    'your-secret-key',
                signOptions: {
                    expiresIn:
                        configService.get<string>('JWT_EXPIRES_IN') || '15m',
                },
            }),
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, Wallet, WalletBalance]),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        Web3AuthService,
        JwtStrategy,
        JwtAuthGuard,
        UserService,
        WalletService,
    ],
    exports: [
        AuthService,
        Web3AuthService,
        JwtAuthGuard,
        PassportModule,
        JwtModule,
    ],
})
export class AuthModule {}
