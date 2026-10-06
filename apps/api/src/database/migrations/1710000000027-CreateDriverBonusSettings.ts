import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDriverBonusSettings1710000000027
  implements MigrationInterface
{
  name = "CreateDriverBonusSettings1710000000027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_bonus_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(40) UNIQUE NOT NULL DEFAULT 'default',
        "is_enabled" BOOLEAN NOT NULL DEFAULT true,
        "orders_required" INT NOT NULL DEFAULT 20,
        "bonus_amount" DECIMAL(12,2) NOT NULL DEFAULT 5000,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "driver_bonus_settings" ("key", "is_enabled", "orders_required", "bonus_amount")
      VALUES ('default', true, 20, 5000)
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_bonus_payouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "executor_id" UUID NOT NULL REFERENCES "executors"("id") ON DELETE CASCADE,
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "threshold_completed_orders" INT NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_driver_bonus_payouts_executor_threshold"
          UNIQUE ("executor_id", "threshold_completed_orders")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_driver_bonus_payouts_executor_id"
        ON "driver_bonus_payouts"("executor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_bonus_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_bonus_settings"`);
  }
}
