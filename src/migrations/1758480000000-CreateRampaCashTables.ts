import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRampaCashTables1758480000000 implements MigrationInterface {
    name = 'CreateRampaCashTables1758480000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enums
        await queryRunner.query(
            `CREATE TYPE "public"."auth_provider_enum" AS ENUM('google', 'apple', 'web3auth', 'phantom', 'solflare')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."language_enum" AS ENUM('en', 'es')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_status_enum" AS ENUM('active', 'suspended')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_type_enum" AS ENUM('web3auth_mpc', 'phantom', 'solflare')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_status_enum" AS ENUM('active', 'suspended')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."token_type_enum" AS ENUM('USDC', 'EURC', 'SOL')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'confirmed', 'failed', 'cancelled')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."card_type_enum" AS ENUM('physical', 'virtual')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."card_status_enum" AS ENUM('pending', 'active', 'suspended', 'cancelled')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."ramp_type_enum" AS ENUM('onramp', 'offramp')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."ramp_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
        );

        // Create user table
        await queryRunner.query(`CREATE TABLE "user" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "email" character varying NOT NULL,
            "phone" character varying,
            "first_name" character varying(50) NOT NULL,
            "last_name" character varying(50) NOT NULL,
            "language" "public"."language_enum" NOT NULL DEFAULT 'en',
            "auth_provider" "public"."auth_provider_enum" NOT NULL,
            "auth_provider_id" character varying NOT NULL,
            "is_active" boolean NOT NULL DEFAULT true,
            "status" "public"."user_status_enum" NOT NULL DEFAULT 'active',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "last_login_at" TIMESTAMP,
            CONSTRAINT "UQ_user_email" UNIQUE ("email"),
            CONSTRAINT "UQ_user_phone" UNIQUE ("phone"),
            CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
        )`);

        // Create wallet table
        await queryRunner.query(`CREATE TABLE "wallet" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "address" character varying NOT NULL,
            "public_key" character varying NOT NULL,
            "wallet_type" "public"."wallet_type_enum" NOT NULL,
            "is_active" boolean NOT NULL DEFAULT true,
            "status" "public"."wallet_status_enum" NOT NULL DEFAULT 'active',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_wallet_address" UNIQUE ("address"),
            CONSTRAINT "PK_wallet_id" PRIMARY KEY ("id")
        )`);

        // Create wallet_balance table
        await queryRunner.query(`CREATE TABLE "wallet_balance" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "wallet_id" uuid NOT NULL,
            "token_type" "public"."token_type_enum" NOT NULL,
            "balance" decimal(18,8) NOT NULL DEFAULT 0,
            "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_wallet_balance_id" PRIMARY KEY ("id")
        )`);

        // Create transaction table
        await queryRunner.query(`CREATE TABLE "transaction" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "sender_id" uuid NOT NULL,
            "recipient_id" uuid NOT NULL,
            "sender_wallet_id" uuid NOT NULL,
            "recipient_wallet_id" uuid NOT NULL,
            "amount" decimal(18,8) NOT NULL,
            "token_type" "public"."token_type_enum" NOT NULL,
            "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending',
            "solana_transaction_hash" character varying,
            "description" character varying,
            "fee" decimal(18,8) NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "confirmed_at" TIMESTAMP,
            "failed_at" TIMESTAMP,
            "failure_reason" character varying,
            CONSTRAINT "PK_transaction_id" PRIMARY KEY ("id")
        )`);

        // Create contact table
        await queryRunner.query(`CREATE TABLE "contact" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "owner_id" uuid NOT NULL,
            "contact_user_id" uuid,
            "email" character varying,
            "phone" character varying,
            "display_name" character varying(100) NOT NULL,
            "wallet_address" character varying,
            "is_app_user" boolean NOT NULL DEFAULT false,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_contact_owner_contact_user" UNIQUE ("owner_id", "contact_user_id"),
            CONSTRAINT "PK_contact_id" PRIMARY KEY ("id")
        )`);

        // Create visa_card table
        await queryRunner.query(`CREATE TABLE "visa_card" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "card_number" character varying NOT NULL,
            "card_type" "public"."card_type_enum" NOT NULL,
            "status" "public"."card_status_enum" NOT NULL DEFAULT 'pending',
            "balance" decimal(18,2) NOT NULL DEFAULT 0,
            "daily_limit" decimal(18,2) NOT NULL,
            "monthly_limit" decimal(18,2) NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "activated_at" TIMESTAMP,
            "expires_at" TIMESTAMP NOT NULL,
            CONSTRAINT "PK_visa_card_id" PRIMARY KEY ("id")
        )`);

        // Create onoff_ramp table
        await queryRunner.query(`CREATE TABLE "onoff_ramp" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NOT NULL,
            "wallet_id" uuid NOT NULL,
            "type" "public"."ramp_type_enum" NOT NULL,
            "amount" decimal(18,8) NOT NULL,
            "fiat_amount" decimal(18,2) NOT NULL,
            "fiat_currency" character varying NOT NULL,
            "token_type" "public"."token_type_enum" NOT NULL,
            "status" "public"."ramp_status_enum" NOT NULL DEFAULT 'pending',
            "provider" character varying NOT NULL,
            "provider_transaction_id" character varying,
            "exchange_rate" decimal(18,8) NOT NULL,
            "fee" decimal(18,8) NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "completed_at" TIMESTAMP,
            "failed_at" TIMESTAMP,
            "failure_reason" character varying,
            CONSTRAINT "PK_onoff_ramp_id" PRIMARY KEY ("id")
        )`);

        // Create foreign key constraints
        await queryRunner.query(
            `ALTER TABLE "wallet" ADD CONSTRAINT "FK_wallet_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet_balance" ADD CONSTRAINT "FK_wallet_balance_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_sender_id" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_recipient_id" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_sender_wallet_id" FOREIGN KEY ("sender_wallet_id") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_recipient_wallet_id" FOREIGN KEY ("recipient_wallet_id") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" ADD CONSTRAINT "FK_contact_owner_id" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" ADD CONSTRAINT "FK_contact_contact_user_id" FOREIGN KEY ("contact_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "visa_card" ADD CONSTRAINT "FK_visa_card_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" ADD CONSTRAINT "FK_onoff_ramp_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" ADD CONSTRAINT "FK_onoff_ramp_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        // Create indexes for performance
        await queryRunner.query(
            `CREATE INDEX "IDX_user_email" ON "user" ("email")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_user_phone" ON "user" ("phone")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_wallet_address" ON "wallet" ("address")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_wallet_user_id" ON "wallet" ("user_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_sender_id" ON "transaction" ("sender_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_recipient_id" ON "transaction" ("recipient_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_created_at" ON "transaction" ("created_at")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_contact_owner_id" ON "contact" ("owner_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_wallet_balance_wallet_id" ON "wallet_balance" ("wallet_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_sender_created" ON "transaction" ("sender_id", "created_at")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_recipient_created" ON "transaction" ("recipient_id", "created_at")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_transaction_status_created" ON "transaction" ("status", "created_at")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_wallet_balance_wallet_token" ON "wallet_balance" ("wallet_id", "token_type")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" DROP CONSTRAINT "FK_onoff_ramp_wallet_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" DROP CONSTRAINT "FK_onoff_ramp_user_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "visa_card" DROP CONSTRAINT "FK_visa_card_user_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" DROP CONSTRAINT "FK_contact_contact_user_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" DROP CONSTRAINT "FK_contact_owner_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_recipient_wallet_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_sender_wallet_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_recipient_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_sender_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet_balance" DROP CONSTRAINT "FK_wallet_balance_wallet_id"`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" DROP CONSTRAINT "FK_wallet_user_id"`,
        );

        // Drop tables
        await queryRunner.query(`DROP TABLE "onoff_ramp"`);
        await queryRunner.query(`DROP TABLE "visa_card"`);
        await queryRunner.query(`DROP TABLE "contact"`);
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP TABLE "wallet_balance"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
        await queryRunner.query(`DROP TABLE "user"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "public"."ramp_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ramp_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."card_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."card_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."token_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."language_enum"`);
        await queryRunner.query(`DROP TYPE "public"."auth_provider_enum"`);
    }
}
