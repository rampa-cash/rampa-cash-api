import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SumsubHttpAdapter } from './sumsub-http.adapter';
import { SUMSUB_ADAPTER_TOKEN } from '../../../domain/sumsub/interfaces/sumsub-adapter.interface';

@Module({
    imports: [ConfigModule],
    providers: [
        SumsubHttpAdapter,
        {
            provide: SUMSUB_ADAPTER_TOKEN,
            useClass: SumsubHttpAdapter,
        },
    ],
    exports: [SUMSUB_ADAPTER_TOKEN, SumsubHttpAdapter],
})
export class SumsubAdapterModule {}
