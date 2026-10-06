import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTariffCommissions1710000000024 implements MigrationInterface {
  name = "AddTariffCommissions1710000000024";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tariffs"
        ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "commission_fixed" DECIMAL(12,2) NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tariffs"
        DROP COLUMN IF EXISTS "commission_fixed",
        DROP COLUMN IF EXISTS "commission_percent"
    `);
  }
}
