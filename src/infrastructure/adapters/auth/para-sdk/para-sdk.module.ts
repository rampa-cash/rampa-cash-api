import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParaSdkConfigService } from './para-sdk-config.service';
import { ParaSdkAuthService } from './para-sdk-auth.service';

/**
 * Para SDK Adapter Module
 *
 * This module provides the Para SDK authentication adapter implementation.
 * It's part of the infrastructure layer in the Port and Adapters architecture.
 *
 * The adapter implements the AuthenticationService PORT (interface) from the domain.
 */
@Module({
    imports: [ConfigModule],
    providers: [ParaSdkConfigService, ParaSdkAuthService],
    exports: [ParaSdkConfigService, ParaSdkAuthService],
})
export class ParaSdkAdapterModule {}
