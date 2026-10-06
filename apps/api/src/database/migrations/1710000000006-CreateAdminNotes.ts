import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminNotes1710000000006 implements MigrationInterface {
  name = 'CreateAdminNotes1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_notes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" VARCHAR(20) NOT NULL,
        "entity_id" UUID NOT NULL,
        "body" TEXT NOT NULL,
        "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_entity"
      ON "admin_notes" ("entity_type", "entity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notes_created_by_id"
      ON "admin_notes" ("created_by_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admin_notes_created_by_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_notes_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_notes"`);
  }
}
