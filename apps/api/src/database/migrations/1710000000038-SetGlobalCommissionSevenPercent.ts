import { MigrationInterface, QueryRunner } from "typeorm";

export class SetGlobalCommissionSevenPercent1710000000038 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE cities ALTER COLUMN ride_commission_percent SET DEFAULT 7
    `);
    await runner.query(`
      ALTER TABLE tariffs ALTER COLUMN commission_percent SET DEFAULT 7
    `);
    await runner.query(`
      UPDATE cities
      SET ride_commission_percent = 7.00, ride_commission_fixed = 0.00
    `);
    await runner.query(`
      UPDATE tariffs
      SET commission_percent = 7.00, commission_fixed = 0.00
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    // Preserve configured rates and historical order commission snapshots.
    await runner.query(`
      ALTER TABLE cities ALTER COLUMN ride_commission_percent SET DEFAULT 10
    `);
    await runner.query(`
      ALTER TABLE tariffs ALTER COLUMN commission_percent SET DEFAULT 10
    `);
  }
}
