import { MigrationInterface, QueryRunner } from "typeorm";

export class DriverTopUpSettings1710000000044 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE driver_topup_settings (
      id uuid PRIMARY KEY,
      mode varchar(20) NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'kaspi_link', 'disabled')),
      kaspi_url varchar(2048) NOT NULL DEFAULT '',
      CHECK (mode <> 'kaspi_link' OR length(kaspi_url) > 0)
    )`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE driver_topup_settings`);
  }
}
