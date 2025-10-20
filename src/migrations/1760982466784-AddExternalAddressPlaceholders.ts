import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalAddressPlaceholders1760982466784
    implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert external address placeholder user
        await queryRunner.query(`
            INSERT INTO "user" (
                "id", "email", "phone", "first_name", "last_name", 
                "language", "auth_provider", "auth_provider_id", "is_active", "verification_status", 
                "status", "created_at", "updated_at"
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                'external@rampa.local',
                NULL,
                'External',
                'Address',
                'en',
                'web3auth',
                'external-placeholder',
                false,
                'verified',
                'active',
                NOW(),
                NOW()
            ) ON CONFLICT (id) DO NOTHING
        `);

        // Insert external address placeholder wallet
        await queryRunner.query(`
            INSERT INTO "wallet" (
                "id", "user_id", "address", "public_key", 
                "wallet_type", "is_active", "status", 
                "created_at", "updated_at"
            ) VALUES (
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000000',
                'EXTERNAL_ADDRESS_PLACEHOLDER',
                'EXTERNAL_ADDRESS_PLACEHOLDER',
                'web3auth_mpc',
                false,
                'active',
                NOW(),
                NOW()
            ) ON CONFLICT (id) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove external address placeholder wallet
        await queryRunner.query(`
            DELETE FROM "wallet" WHERE "id" = '00000000-0000-0000-0000-000000000001'
        `);

        // Remove external address placeholder user
        await queryRunner.query(`
            DELETE FROM "user" WHERE "id" = '00000000-0000-0000-0000-000000000000'
        `);
    }
}
