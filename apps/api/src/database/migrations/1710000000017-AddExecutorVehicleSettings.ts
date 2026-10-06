import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExecutorVehicleSettings1710000000017 implements MigrationInterface {
  name = "AddExecutorVehicleSettings1710000000017";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "executors"
        ADD COLUMN IF NOT EXISTS "vehicle_color" VARCHAR(40),
        ADD COLUMN IF NOT EXISTS "enabled_tariffs" TEXT[] NOT NULL DEFAULT ARRAY['economy','comfort','comfort_plus','business']::TEXT[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "executors"
        DROP COLUMN IF EXISTS "enabled_tariffs",
        DROP COLUMN IF EXISTS "vehicle_color"
    `);
  }
}
