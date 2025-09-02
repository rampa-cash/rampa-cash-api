import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContactTable1756855442271 implements MigrationInterface {
    name = 'CreateContactTable1756855442271'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ContactType enum
        await queryRunner.query(`CREATE TYPE "public"."contact_type_enum" AS ENUM('WAITLIST', 'CONTACT')`);
        
        // Create contacts table
        await queryRunner.query(`CREATE TABLE "contact" (
            "id" SERIAL NOT NULL,
            "name" character varying NOT NULL,
            "email" character varying NOT NULL,
            "inquiry" character varying,
            "type" "public"."contact_type_enum" NOT NULL DEFAULT 'WAITLIST',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_b633abc648f559dfde2dc552701" PRIMARY KEY ("id")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop contacts table
        await queryRunner.query(`DROP TABLE "contact"`);
        
        // Drop ContactType enum
        await queryRunner.query(`DROP TYPE "public"."contact_type_enum"`);
    }
}
