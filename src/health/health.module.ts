import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { SolanaModule } from '../domain/solana/solana.module';

@Module({
    imports: [ConfigModule, TypeOrmModule, SolanaModule],
    controllers: [HealthController],
})
export class HealthModule {}
