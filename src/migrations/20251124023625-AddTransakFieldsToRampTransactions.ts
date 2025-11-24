import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransakFieldsToRampTransactions20251124023625
    implements MigrationInterface
{
    name = 'AddTransakFieldsToRampTransactions20251124023625';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ============================================
        // ONRAMP TRANSACTIONS CHANGES
        // ============================================

        // Add walletAddress for webhook matching (Transak sends walletAddress in webhook)
        await queryRunner.query(`
            ALTER TABLE "onramp_transactions" 
            ADD COLUMN IF NOT EXISTS "walletAddress" VARCHAR(255);
        `);

        // Add index for webhook matching by wallet address
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_onramp_wallet_address" 
            ON "onramp_transactions" ("walletAddress")
            WHERE "walletAddress" IS NOT NULL;
        `);

        // Make tokenAmount nullable (initially null, set from webhook)
        // Current: NOT NULL DEFAULT '0' -> Change to: NULL
        await queryRunner.query(`
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "tokenAmount" DROP NOT NULL,
            ALTER COLUMN "tokenAmount" DROP DEFAULT;
        `);

        // Make exchangeRate nullable (initially null, set from webhook)
        // Current: NOT NULL DEFAULT '0' -> Change to: NULL
        await queryRunner.query(`
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "exchangeRate" DROP NOT NULL,
            ALTER COLUMN "exchangeRate" DROP DEFAULT;
        `);

        // Make fee nullable (initially null, set from webhook)
        // Current: NOT NULL DEFAULT '0' -> Change to: NULL
        await queryRunner.query(`
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "fee" DROP NOT NULL,
            ALTER COLUMN "fee" DROP DEFAULT;
        `);

        // Add index for providerTransactionId lookups (critical for webhook processing)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_onramp_provider_tx_id" 
            ON "onramp_transactions" ("providerTransactionId") 
            WHERE "providerTransactionId" IS NOT NULL;
        `);

        // ============================================
        // OFFRAMP TRANSACTIONS CHANGES
        // ============================================

        // Add walletAddress for webhook matching (Transak sends walletAddress in webhook)
        await queryRunner.query(`
            ALTER TABLE "offramp_transactions" 
            ADD COLUMN IF NOT EXISTS "wallet_address" VARCHAR(255);
        `);

        // Add index for webhook matching by wallet address
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_offramp_wallet_address" 
            ON "offramp_transactions" ("wallet_address")
            WHERE "wallet_address" IS NOT NULL;
        `);

        // Make fiatAmount nullable (initially null, set from webhook)
        // Current: NOT NULL -> Change to: NULL
        await queryRunner.query(`
            ALTER TABLE "offramp_transactions" 
            ALTER COLUMN "fiat_amount" DROP NOT NULL;
        `);

        // Note: exchange_rate and fee are already nullable in current schema

        // Add index for providerTransactionId lookups (critical for webhook processing)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_offramp_provider_tx_id" 
            ON "offramp_transactions" ("provider_transaction_id") 
            WHERE "provider_transaction_id" IS NOT NULL;
        `);

        // Add metadata column if it doesn't exist (for storing partnerCustomerId, etc.)
        await queryRunner.query(`
            ALTER TABLE "offramp_transactions" 
            ADD COLUMN IF NOT EXISTS "metadata" JSONB;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // ============================================
        // REVERT OFFRAMP TRANSACTIONS CHANGES
        // ============================================

        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_offramp_provider_tx_id"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_offramp_wallet_address"`,
        );
        await queryRunner.query(
            `ALTER TABLE "offramp_transactions" DROP COLUMN IF EXISTS "wallet_address"`,
        );
        await queryRunner.query(
            `ALTER TABLE "offramp_transactions" DROP COLUMN IF EXISTS "metadata"`,
        );

        // Restore NOT NULL constraint (set default values for existing rows first)
        await queryRunner.query(`
            UPDATE "offramp_transactions" 
            SET "fiat_amount" = 0 WHERE "fiat_amount" IS NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "offramp_transactions" 
            ALTER COLUMN "fiat_amount" SET NOT NULL;
        `);

        // ============================================
        // REVERT ONRAMP TRANSACTIONS CHANGES
        // ============================================

        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_onramp_provider_tx_id"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_onramp_wallet_address"`,
        );
        await queryRunner.query(
            `ALTER TABLE "onramp_transactions" DROP COLUMN IF EXISTS "walletAddress"`,
        );

        // Restore NOT NULL constraints (set default values for existing rows first)
        await queryRunner.query(`
            UPDATE "onramp_transactions" 
            SET "tokenAmount" = 0 WHERE "tokenAmount" IS NULL;
            UPDATE "onramp_transactions" 
            SET "exchangeRate" = 0 WHERE "exchangeRate" IS NULL;
            UPDATE "onramp_transactions" 
            SET "fee" = 0 WHERE "fee" IS NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "tokenAmount" SET NOT NULL,
            ALTER COLUMN "tokenAmount" SET DEFAULT '0';
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "exchangeRate" SET NOT NULL,
            ALTER COLUMN "exchangeRate" SET DEFAULT '0';
            ALTER TABLE "onramp_transactions" 
            ALTER COLUMN "fee" SET NOT NULL,
            ALTER COLUMN "fee" SET DEFAULT '0';
        `);
    }
}

