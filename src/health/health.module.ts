import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

@Module({
    imports: [ConfigModule, TypeOrmModule],
    controllers: [HealthController],
})
export class HealthModule {}
