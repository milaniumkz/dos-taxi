import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExecutorVehicleDetails1710000000007 implements MigrationInterface {
  name = "AddExecutorVehicleDetails1710000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "executors"
        ADD COLUMN "vehicle_make" VARCHAR(80),
        ADD COLUMN "vehicle_model" VARCHAR(80),
        ADD COLUMN "vehicle_year" INT,
        ADD COLUMN "vehicle_plate" VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "executors"
        DROP COLUMN IF EXISTS "vehicle_plate",
        DROP COLUMN IF EXISTS "vehicle_year",
        DROP COLUMN IF EXISTS "vehicle_model",
        DROP COLUMN IF EXISTS "vehicle_make"
    `);
  }
}
