import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { UserModule } from './domain/user/user.module';
import { AuthModule } from './domain/auth/auth.module';
import { ContactModule } from './domain/contact/contact.module';
import { OnRampModule } from './domain/onramp/onramp.module';
import { TransactionModule } from './domain/transaction/transaction.module';
import { VISACardModule } from './domain/visa-card/visa-card.module';
import { WalletModule } from './domain/wallet/wallet.module';
import { SolanaModule } from './domain/solana/solana.module';
import { LearningModule } from './domain/learning/learning.module';
import { InvestmentModule } from './domain/investment/investment.module';
import { CommonModule } from './domain/common/common.module';
import { SumsubModule } from './domain/sumsub/sumsub.module';
import { getDatabaseConfig } from './config/database.config';
import { getLoggerConfig } from './config/logger.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        WinstonModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: getLoggerConfig,
            inject: [ConfigService],
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: getDatabaseConfig,
            inject: [ConfigService],
        }),
        HealthModule,
        UserModule,
        AuthModule,
        ContactModule,
        OnRampModule,
        TransactionModule,
        VISACardModule,
        WalletModule,
        SolanaModule,
        LearningModule,
        InvestmentModule,
        CommonModule,
        SumsubModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
