import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminActivityLogs1710000000009
  implements MigrationInterface
{
  name = 'CreateAdminActivityLogs1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_activity_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action" VARCHAR(64) NOT NULL,
        "entity_type" VARCHAR(32) NOT NULL,
        "entity_id" UUID NOT NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_activity_logs_entity"
      ON "admin_activity_logs" ("entity_type", "entity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_activity_logs_actor_id"
      ON "admin_activity_logs" ("actor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_activity_logs_action"
      ON "admin_activity_logs" ("action")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_activity_logs_created_at"
      ON "admin_activity_logs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_activity_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_activity_logs_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_activity_logs_actor_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_activity_logs_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_activity_logs"`);
  }
}
