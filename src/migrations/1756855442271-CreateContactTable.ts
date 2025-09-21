import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInquiryTable1756855442271 implements MigrationInterface {
    name = 'CreateInquiryTable1756855442271'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create InquiryType enum
        await queryRunner.query(`CREATE TYPE "public"."inquiry_type_enum" AS ENUM('WAITLIST', 'GENERAL')`);

        // Create inquiry table
        await queryRunner.query(`CREATE TABLE "inquiry" (
            "id" SERIAL NOT NULL,
            "name" character varying NOT NULL,
            "email" character varying NOT NULL,
            "inquiry" character varying,
            "type" "public"."inquiry_type_enum" NOT NULL DEFAULT 'WAITLIST',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_b633abc648f559dfde2dc552701" PRIMARY KEY ("id")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop inquiry table
        await queryRunner.query(`DROP TABLE "inquiry"`);

        // Drop InquiryType enum
        await queryRunner.query(`DROP TYPE "public"."inquiry_type_enum"`);
    }
}
