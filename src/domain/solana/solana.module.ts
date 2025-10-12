import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolanaService } from './services/solana.service';
import { SolanaConnectionService } from './services/solana-connection.service';
import { SplTokenService } from './services/spl-token.service';
import solanaConfig from '../../config/solana.config';

@Module({
    imports: [ConfigModule.forFeature(solanaConfig)],
    providers: [SolanaService, SolanaConnectionService, SplTokenService],
    exports: [SolanaService, SolanaConnectionService, SplTokenService],
})
export class SolanaModule {}
