import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParaSdkConfigService } from './para-sdk-config.service';
import { ParaSdkAuthService } from './para-sdk-auth.service';
import { ParaSdkSessionManager } from './para-sdk-session.manager';
import { ParaSdkVerificationService } from './para-sdk-verification.service';

/**
 * Para SDK Adapter Module
 *
 * This module provides the Para SDK authentication adapter implementation.
 * It's part of the infrastructure layer in the Port and Adapters architecture.
 *
 * The adapter implements the AuthenticationService PORT (interface) from the domain.
 *
 * Uses Para Server SDK (@getpara/server-sdk) to import and validate client sessions.
 * Reference: https://docs.getpara.com/v2/server/setup
 */
@Module({
    imports: [ConfigModule],
    providers: [
        ParaSdkConfigService,
        ParaSdkSessionManager,
        ParaSdkVerificationService,
        ParaSdkAuthService,
    ],
    exports: [
        ParaSdkConfigService,
        ParaSdkSessionManager,
        ParaSdkVerificationService,
        ParaSdkAuthService,
    ],
})
export class ParaSdkAdapterModule {}
