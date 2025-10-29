import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInquiryTable1761256125845 implements MigrationInterface {
    name = 'RemoveInquiryTable1761256125845';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop inquiry table and related enum
        await queryRunner.query(`DROP TABLE "inquiry"`);
        await queryRunner.query(`DROP TYPE "public"."inquiry_type_enum"`);

        // Update wallet table
        await queryRunner.query(
            `ALTER TABLE "wallet" ADD "external_wallet_id" character varying`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_kyc_status_enum" AS ENUM('pending_verification', 'verified', 'rejected')`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ADD "kyc_status" "public"."user_kyc_status_enum" NOT NULL DEFAULT 'pending_verification'`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ADD "kyc_verified_at" TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."wallet_wallet_type_enum" RENAME TO "wallet_wallet_type_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_wallet_type_enum" AS ENUM('para_mpc', 'web3auth_mpc')`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" ALTER COLUMN "wallet_type" TYPE "public"."wallet_wallet_type_enum" USING "wallet_type"::"text"::"public"."wallet_wallet_type_enum"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."wallet_wallet_type_enum_old"`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."user_auth_provider_enum" RENAME TO "user_auth_provider_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."user_auth_provider_enum" AS ENUM('para', 'google', 'apple', 'email', 'phone', 'web3auth', 'phantom', 'solflare')`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "auth_provider" TYPE "public"."user_auth_provider_enum" USING "auth_provider"::"text"::"public"."user_auth_provider_enum"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."user_auth_provider_enum_old"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate inquiry table and enum
        await queryRunner.query(
            `CREATE TYPE "public"."inquiry_type_enum" AS ENUM('WAITLIST', 'GENERAL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "inquiry" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "inquiry" character varying, "type" "public"."inquiry_type_enum" NOT NULL DEFAULT 'WAITLIST', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b364d0199e4d9d29ba18827b842" UNIQUE ("email"), CONSTRAINT "PK_3e226d0994e8bd24252dd65e1b6" PRIMARY KEY ("id"))`,
        );

        // Revert user and wallet changes
        await queryRunner.query(
            `CREATE TYPE "public"."user_auth_provider_enum_old" AS ENUM('google', 'apple', 'web3auth', 'phantom', 'solflare')`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "auth_provider" TYPE "public"."user_auth_provider_enum_old" USING "auth_provider"::"text"::"public"."user_auth_provider_enum_old"`,
        );
        await queryRunner.query(`DROP TYPE "public"."user_auth_provider_enum"`);
        await queryRunner.query(
            `ALTER TYPE "public"."user_auth_provider_enum_old" RENAME TO "user_auth_provider_enum"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."wallet_wallet_type_enum_old" AS ENUM('web3auth_mpc')`,
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" ALTER COLUMN "wallet_type" TYPE "public"."wallet_wallet_type_enum_old" USING "wallet_type"::"text"::"public"."wallet_wallet_type_enum_old"`,
        );
        await queryRunner.query(`DROP TYPE "public"."wallet_wallet_type_enum"`);
        await queryRunner.query(
            `ALTER TYPE "public"."wallet_wallet_type_enum_old" RENAME TO "wallet_wallet_type_enum"`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" DROP COLUMN "kyc_verified_at"`,
        );
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "kyc_status"`);
        await queryRunner.query(`DROP TYPE "public"."user_kyc_status_enum"`);
        await queryRunner.query(
            `ALTER TABLE "wallet" DROP COLUMN "external_wallet_id"`,
        );
    }
}
