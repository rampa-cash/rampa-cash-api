import { Module } from '@nestjs/common';
// import { OnRampApplicationService } from '../../onramp/services/onramp-application.service'; // Removed - using new OnRampService
import { TransactionApplicationService } from '../../transaction/services/transaction-application.service';
import { WalletApplicationService } from '../../wallet/services/wallet-application.service';
import { OnRampModule } from '../../onramp/onramp.module';
import { TransactionModule } from '../../transaction/transaction.module';
import { WalletModule } from '../../wallet/wallet.module';
import { UserModule } from '../../user/user.module';

/**
 * ApplicationServiceModule
 *
 * @description Module that provides application services for orchestrating
 * domain operations. Application services coordinate between multiple domain
 * services to handle complex business workflows.
 *
 * @example
 * ```typescript
 * // Import in your module
 * @Module({
 *   imports: [ApplicationServiceModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Module({
    imports: [OnRampModule, TransactionModule, WalletModule, UserModule],
    providers: [
        // OnRampApplicationService, // Removed - using new OnRampService
        TransactionApplicationService,
        WalletApplicationService,
    ],
    exports: [
        // OnRampApplicationService, // Removed - using new OnRampService
        TransactionApplicationService,
        WalletApplicationService,
    ],
})
export class ApplicationServiceModule {}
