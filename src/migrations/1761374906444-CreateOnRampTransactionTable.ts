import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOnRampTransactionTable1761374906444 implements MigrationInterface {
    name = 'CreateOnRampTransactionTable1761374906444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum types for onramp transactions
        await queryRunner.query(`CREATE TYPE "public"."onramp_transactions_tokentype_enum" AS ENUM('USDC', 'EURC', 'SOL')`);
        await queryRunner.query(`CREATE TYPE "public"."onramp_transactions_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."onramp_transactions_provider_enum" AS ENUM('transak', 'moonpay', 'ramp', 'wyre')`);
        
        // Create the onramp_transactions table
        await queryRunner.query(`CREATE TABLE "onramp_transactions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "userId" uuid NOT NULL, 
            "walletId" uuid NOT NULL, 
            "amount" numeric(18,8) NOT NULL DEFAULT '0', 
            "currency" character varying(3) NOT NULL, 
            "tokenType" "public"."onramp_transactions_tokentype_enum" NOT NULL, 
            "tokenAmount" numeric(18,8) NOT NULL DEFAULT '0', 
            "status" "public"."onramp_transactions_status_enum" NOT NULL DEFAULT 'pending', 
            "provider" "public"."onramp_transactions_provider_enum" NOT NULL, 
            "providerTransactionId" character varying, 
            "providerOrderId" character varying, 
            "providerPaymentUrl" character varying, 
            "fee" numeric(18,8) NOT NULL DEFAULT '0', 
            "exchangeRate" numeric(18,8) NOT NULL DEFAULT '0', 
            "failureReason" character varying, 
            "metadata" jsonb, 
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
            "completedAt" TIMESTAMP, 
            "failedAt" TIMESTAMP, 
            CONSTRAINT "PK_a47f594755e46cc2a8e0f69fa6d" PRIMARY KEY ("id")
        )`);
        
        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_0c62b293d87a530dc336c13c31" ON "onramp_transactions" ("provider", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_943933e4ec107c6d3239a1080a" ON "onramp_transactions" ("userId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_4ca9bc57099fae550b9ff14e0a" ON "onramp_transactions" ("userId", "status")`);
        
        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "onramp_transactions" ADD CONSTRAINT "FK_f1d6fdea67307e1c18b432a69cd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "onramp_transactions" ADD CONSTRAINT "FK_057098c244f418c29a53ecaf069" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "onramp_transactions" DROP CONSTRAINT "FK_057098c244f418c29a53ecaf069"`);
        await queryRunner.query(`ALTER TABLE "onramp_transactions" DROP CONSTRAINT "FK_f1d6fdea67307e1c18b432a69cd"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_4ca9bc57099fae550b9ff14e0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_943933e4ec107c6d3239a1080a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c62b293d87a530dc336c13c31"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "onramp_transactions"`);
        
        // Drop enum types
        await queryRunner.query(`DROP TYPE "public"."onramp_transactions_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."onramp_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."onramp_transactions_tokentype_enum"`);
    }
}