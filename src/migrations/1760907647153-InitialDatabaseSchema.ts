import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDatabaseSchema1760907647153 implements MigrationInterface {
    name = 'InitialDatabaseSchema1760907647153';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_wallet_type_enum" AS ENUM('web3auth_mpc')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_status_enum" AS ENUM('active', 'suspended')`,
        );
        await queryRunner.query(
            `CREATE TABLE "wallet" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "address" character varying NOT NULL, "public_key" character varying NOT NULL, "wallet_addresses" jsonb, "wallet_metadata" jsonb, "wallet_type" "public"."wallet_wallet_type_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "status" "public"."wallet_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1dcc9f5fd49e3dc52c6d2393c53" UNIQUE ("address"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id")); COMMENT ON COLUMN "wallet"."created_at" IS 'Wallet creation timestamp'; COMMENT ON COLUMN "wallet"."updated_at" IS 'Wallet last update timestamp'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."visa_card_card_type_enum" AS ENUM('physical', 'virtual')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."visa_card_status_enum" AS ENUM('pending', 'active', 'suspended', 'cancelled')`,
        );
        await queryRunner.query(
            `CREATE TABLE "visa_card" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "card_number" character varying NOT NULL, "card_type" "public"."visa_card_card_type_enum" NOT NULL, "status" "public"."visa_card_status_enum" NOT NULL DEFAULT 'pending', "balance" numeric(18,2) NOT NULL DEFAULT '0', "daily_limit" numeric(18,2) NOT NULL DEFAULT '0', "monthly_limit" numeric(18,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "activated_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_f56766ea30deb580b7fee67eb5" UNIQUE ("user_id"), CONSTRAINT "PK_3af0e93966a4768d382d1c60254" PRIMARY KEY ("id")); COMMENT ON COLUMN "visa_card"."balance" IS 'Card balance with 18,2 precision'; COMMENT ON COLUMN "visa_card"."daily_limit" IS 'Daily spending limit with 18,2 precision'; COMMENT ON COLUMN "visa_card"."monthly_limit" IS 'Monthly spending limit with 18,2 precision'; COMMENT ON COLUMN "visa_card"."created_at" IS 'VISA card creation timestamp'; COMMENT ON COLUMN "visa_card"."activated_at" IS 'Timestamp when VISA card was activated'; COMMENT ON COLUMN "visa_card"."expires_at" IS 'Timestamp when VISA card expires'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."transaction_token_type_enum" AS ENUM('USDC', 'EURC', 'SOL')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'confirmed', 'failed', 'cancelled')`,
        );
        await queryRunner.query(
            `CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sender_id" uuid NOT NULL, "recipient_id" uuid NOT NULL, "sender_wallet_id" uuid NOT NULL, "recipient_wallet_id" uuid NOT NULL, "amount" numeric(18,8) NOT NULL DEFAULT '0', "token_type" "public"."transaction_token_type_enum" NOT NULL, "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending', "solana_transaction_hash" character varying, "description" character varying, "fee" numeric(18,8) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "confirmed_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, "failure_reason" character varying, CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id")); COMMENT ON COLUMN "transaction"."amount" IS 'Transaction amount with 18,8 precision'; COMMENT ON COLUMN "transaction"."fee" IS 'Transaction fee with 18,8 precision'; COMMENT ON COLUMN "transaction"."created_at" IS 'Transaction creation timestamp'; COMMENT ON COLUMN "transaction"."confirmed_at" IS 'Timestamp when transaction was confirmed on blockchain'; COMMENT ON COLUMN "transaction"."failed_at" IS 'Timestamp when transaction failed'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."balance_history_token_type_enum" AS ENUM('USDC', 'EURC', 'SOL')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."balance_history_change_type_enum" AS ENUM('transfer_in', 'transfer_out', 'onramp', 'offramp', 'blockchain_sync', 'manual_adjustment', 'fee_deduction', 'reward', 'refund')`,
        );
        await queryRunner.query(
            `CREATE TABLE "balance_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "token_type" "public"."balance_history_token_type_enum" NOT NULL, "previous_balance" numeric(18,8) NOT NULL DEFAULT '0', "new_balance" numeric(18,8) NOT NULL DEFAULT '0', "change_amount" numeric(18,8) NOT NULL DEFAULT '0', "change_type" "public"."balance_history_change_type_enum" NOT NULL, "transaction_id" character varying, "solana_transaction_hash" character varying, "description" character varying(500), "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dc0b0a31a6896d2e4fd3f08042c" PRIMARY KEY ("id")); COMMENT ON COLUMN "balance_history"."previous_balance" IS 'Previous balance with 18,8 precision'; COMMENT ON COLUMN "balance_history"."new_balance" IS 'New balance with 18,8 precision'; COMMENT ON COLUMN "balance_history"."change_amount" IS 'Balance change amount with 18,8 precision'; COMMENT ON COLUMN "balance_history"."created_at" IS 'Balance history record creation timestamp'; COMMENT ON COLUMN "balance_history"."updated_at" IS 'Balance history record last update timestamp'`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_affa2a72354827550e3978aba4" ON "balance_history" ("created_at") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_b670ce707f325a67fd9c02fed7" ON "balance_history" ("wallet_id", "change_type", "created_at") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_0c150aa1f8c7afcee624ab0dbf" ON "balance_history" ("wallet_id", "token_type", "created_at") `,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_language_enum" AS ENUM('en', 'es')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_auth_provider_enum" AS ENUM('google', 'apple', 'web3auth', 'phantom', 'solflare')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_verification_status_enum" AS ENUM('pending_verification', 'verified', 'rejected')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_status_enum" AS ENUM('active', 'suspended', 'pending_verification')`,
        );
        await queryRunner.query(
            `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying, "phone" character varying, "first_name" character varying, "last_name" character varying, "language" "public"."user_language_enum" NOT NULL DEFAULT 'en', "auth_provider" "public"."user_auth_provider_enum" NOT NULL, "auth_provider_id" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "verification_status" "public"."user_verification_status_enum" NOT NULL DEFAULT 'pending_verification', "status" "public"."user_status_enum" NOT NULL DEFAULT 'pending_verification', "verification_completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")); COMMENT ON COLUMN "user"."verification_completed_at" IS 'Timestamp when user verification was completed'; COMMENT ON COLUMN "user"."created_at" IS 'User account creation timestamp'; COMMENT ON COLUMN "user"."updated_at" IS 'User account last update timestamp'; COMMENT ON COLUMN "user"."last_login_at" IS 'Timestamp of user last login'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."inquiry_type_enum" AS ENUM('WAITLIST', 'GENERAL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "inquiry" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "inquiry" character varying, "type" "public"."inquiry_type_enum" NOT NULL DEFAULT 'WAITLIST', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b364d0199e4d9d29ba18827b842" UNIQUE ("email"), CONSTRAINT "PK_3e226d0994e8bd24252dd65e1b6" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "contact_user_id" uuid, "email" character varying, "phone" character varying, "display_name" character varying NOT NULL, "wallet_address" character varying, "is_app_user" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0f6e0404e590d0e1c4699a4eb35" UNIQUE ("owner_id", "contact_user_id"), CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id")); COMMENT ON COLUMN "contact"."created_at" IS 'Contact creation timestamp'; COMMENT ON COLUMN "contact"."updated_at" IS 'Contact last update timestamp'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."onoff_ramp_type_enum" AS ENUM('onramp', 'offramp')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."onoff_ramp_token_type_enum" AS ENUM('USDC', 'EURC', 'SOL')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."onoff_ramp_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
        );
        await queryRunner.query(
            `CREATE TABLE "onoff_ramp" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "type" "public"."onoff_ramp_type_enum" NOT NULL, "amount" numeric(18,8) NOT NULL DEFAULT '0', "fiat_amount" numeric(18,2) NOT NULL DEFAULT '0', "fiat_currency" character varying NOT NULL, "token_type" "public"."onoff_ramp_token_type_enum" NOT NULL, "status" "public"."onoff_ramp_status_enum" NOT NULL DEFAULT 'pending', "provider" character varying NOT NULL, "provider_transaction_id" character varying, "exchange_rate" numeric(18,8) NOT NULL DEFAULT '0', "fee" numeric(18,8) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, "failure_reason" character varying, CONSTRAINT "PK_0ff9e38e7c5f2226d75de338b4b" PRIMARY KEY ("id")); COMMENT ON COLUMN "onoff_ramp"."amount" IS 'Crypto amount with 18,8 precision'; COMMENT ON COLUMN "onoff_ramp"."fiat_amount" IS 'Fiat amount with 18,2 precision'; COMMENT ON COLUMN "onoff_ramp"."exchange_rate" IS 'Exchange rate with 18,8 precision'; COMMENT ON COLUMN "onoff_ramp"."fee" IS 'Ramp fee with 18,8 precision'; COMMENT ON COLUMN "onoff_ramp"."created_at" IS 'On/Off ramp creation timestamp'; COMMENT ON COLUMN "onoff_ramp"."completed_at" IS 'Timestamp when ramp operation was completed'; COMMENT ON COLUMN "onoff_ramp"."failed_at" IS 'Timestamp when ramp operation failed'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_balance_token_type_enum" AS ENUM('USDC', 'EURC', 'SOL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "wallet_balance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "token_type" "public"."wallet_balance_token_type_enum" NOT NULL, "balance" numeric(18,8) NOT NULL DEFAULT '0', "last_updated" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9ec1589e00b6a6c09abc35b8fd0" UNIQUE ("wallet_id", "token_type"), CONSTRAINT "PK_ec31e88796415d49a1ee8d821f8" PRIMARY KEY ("id")); COMMENT ON COLUMN "wallet_balance"."balance" IS 'Token balance with 18,8 precision'`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" ADD CONSTRAINT "FK_72548a47ac4a996cd254b082522" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "visa_card" ADD CONSTRAINT "FK_f56766ea30deb580b7fee67eb55" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_91a42be8fb1ac791a24fdf65048" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_927f99917551279dea7256537a9" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_f899c6238f87a9059b5c5d1ffcc" FOREIGN KEY ("sender_wallet_id") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" ADD CONSTRAINT "FK_2df7a82ddb31d27fdc45dddf428" FOREIGN KEY ("recipient_wallet_id") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "balance_history" ADD CONSTRAINT "FK_faa71a026f2731e5a3d8c9d602d" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" ADD CONSTRAINT "FK_4b5a10d41009acc018c15447f32" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" ADD CONSTRAINT "FK_c09e0f3646834bfa129d1043dd7" FOREIGN KEY ("contact_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" ADD CONSTRAINT "FK_864a48fb6cd14e392a5b02f7839" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" ADD CONSTRAINT "FK_5de16c6c4739ee5027b36fb00c3" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet_balance" ADD CONSTRAINT "FK_624cd19fdf2efa9b27e8769fe9e" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "wallet_balance" DROP CONSTRAINT "FK_624cd19fdf2efa9b27e8769fe9e"`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" DROP CONSTRAINT "FK_5de16c6c4739ee5027b36fb00c3"`,
        );
        await queryRunner.query(
            `ALTER TABLE "onoff_ramp" DROP CONSTRAINT "FK_864a48fb6cd14e392a5b02f7839"`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" DROP CONSTRAINT "FK_c09e0f3646834bfa129d1043dd7"`,
        );
        await queryRunner.query(
            `ALTER TABLE "contact" DROP CONSTRAINT "FK_4b5a10d41009acc018c15447f32"`,
        );
        await queryRunner.query(
            `ALTER TABLE "balance_history" DROP CONSTRAINT "FK_faa71a026f2731e5a3d8c9d602d"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_2df7a82ddb31d27fdc45dddf428"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_f899c6238f87a9059b5c5d1ffcc"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_927f99917551279dea7256537a9"`,
        );
        await queryRunner.query(
            `ALTER TABLE "transaction" DROP CONSTRAINT "FK_91a42be8fb1ac791a24fdf65048"`,
        );
        await queryRunner.query(
            `ALTER TABLE "visa_card" DROP CONSTRAINT "FK_f56766ea30deb580b7fee67eb55"`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" DROP CONSTRAINT "FK_72548a47ac4a996cd254b082522"`,
        );
        await queryRunner.query(`DROP TABLE "wallet_balance"`);
        await queryRunner.query(
            `DROP TYPE "public"."wallet_balance_token_type_enum"`,
        );
        await queryRunner.query(`DROP TABLE "onoff_ramp"`);
        await queryRunner.query(`DROP TYPE "public"."onoff_ramp_status_enum"`);
        await queryRunner.query(
            `DROP TYPE "public"."onoff_ramp_token_type_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."onoff_ramp_type_enum"`);
        await queryRunner.query(`DROP TABLE "contact"`);
        await queryRunner.query(`DROP TABLE "inquiry"`);
        await queryRunner.query(`DROP TYPE "public"."inquiry_type_enum"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
        await queryRunner.query(
            `DROP TYPE "public"."user_verification_status_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."user_auth_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_language_enum"`);
        await queryRunner.query(
            `DROP INDEX "public"."IDX_0c150aa1f8c7afcee624ab0dbf"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_b670ce707f325a67fd9c02fed7"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_affa2a72354827550e3978aba4"`,
        );
        await queryRunner.query(`DROP TABLE "balance_history"`);
        await queryRunner.query(
            `DROP TYPE "public"."balance_history_change_type_enum"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."balance_history_token_type_enum"`,
        );
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
        await queryRunner.query(
            `DROP TYPE "public"."transaction_token_type_enum"`,
        );
        await queryRunner.query(`DROP TABLE "visa_card"`);
        await queryRunner.query(`DROP TYPE "public"."visa_card_status_enum"`);
        await queryRunner.query(
            `DROP TYPE "public"."visa_card_card_type_enum"`,
        );
        await queryRunner.query(`DROP TABLE "wallet"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_wallet_type_enum"`);
    }
}
