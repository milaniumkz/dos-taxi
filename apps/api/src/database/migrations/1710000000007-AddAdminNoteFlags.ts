import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminNoteFlags1710000000007 implements MigrationInterface {
  name = 'AddAdminNoteFlags1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "kind" VARCHAR(20) NOT NULL DEFAULT 'context'
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_kind"
      ON "admin_notes" ("kind")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_pinned_created_at"
      ON "admin_notes" ("is_pinned", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admin_notes_pinned_created_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_notes_kind"`);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "is_pinned"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notes"
      DROP COLUMN IF EXISTS "kind"
    `);
  }
}
