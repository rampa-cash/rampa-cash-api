import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSumsubApplicant1762904926403 implements MigrationInterface {
    name = 'CreateSumsubApplicant1762904926403';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."sumsub_applicant_review_status_enum" AS ENUM('initiated', 'pending', 'review', 'completed', 'on_hold', 'rejected')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."sumsub_applicant_source_enum" AS ENUM('rampa', 'transak')`,
        );
        await queryRunner.query(
            `CREATE TABLE "sumsub_applicant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "applicant_id" character varying, "external_user_id" character varying, "level_name" character varying, "review_status" "public"."sumsub_applicant_review_status_enum" NOT NULL DEFAULT 'initiated', "review_result" jsonb, "source" "public"."sumsub_applicant_source_enum" NOT NULL DEFAULT 'rampa', "metadata" jsonb, "last_synced_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a92d28f7ec1e3c3c20f4e63e499" PRIMARY KEY ("id"), CONSTRAINT "UQ_6f66cb41f3a9539df585aaa5de5" UNIQUE ("user_id"), CONSTRAINT "UQ_babc0aab3699d20b2893b9ca69c" UNIQUE ("applicant_id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_6f66cb41f3a9539df585aaa5de" ON "sumsub_applicant" ("user_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_babc0aab3699d20b2893b9ca69" ON "sumsub_applicant" ("applicant_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f3b6082480fd319fd1a12cde45" ON "sumsub_applicant" ("review_status") `,
        );
        await queryRunner.query(
            `ALTER TABLE "sumsub_applicant" ADD CONSTRAINT "FK_6f66cb41f3a9539df585aaa5de5" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "sumsub_applicant" DROP CONSTRAINT "FK_6f66cb41f3a9539df585aaa5de5"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_f3b6082480fd319fd1a12cde45"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_babc0aab3699d20b2893b9ca69"`,
        );
        await queryRunner.query(
            `DROP INDEX "public"."IDX_6f66cb41f3a9539df585aaa5de"`,
        );
        await queryRunner.query(`DROP TABLE "sumsub_applicant"`);
        await queryRunner.query(
            `DROP TYPE "public"."sumsub_applicant_source_enum"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."sumsub_applicant_review_status_enum"`,
        );
    }
}
