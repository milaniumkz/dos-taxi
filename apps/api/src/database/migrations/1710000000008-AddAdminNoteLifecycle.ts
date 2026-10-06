import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminNoteLifecycle1710000000008
  implements MigrationInterface
{
  name = 'AddAdminNoteLifecycle1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "state" VARCHAR(20) NOT NULL DEFAULT 'open'
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "assigned_to_id" UUID REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "resolved_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "archived_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_state"
      ON "admin_notes" ("state")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_assigned_to_id"
      ON "admin_notes" ("assigned_to_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_notes_assigned_to_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_notes_state"`);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "archived_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "resolved_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "assigned_to_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "state"
    `);
  }
}
