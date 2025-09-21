import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { InquiryModule } from './domain/inquiry/inquiry.module';
import { UserModule } from './domain/user/user.module';
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
        InquiryModule,
        UserModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
