import { MigrationInterface, QueryRunner } from "typeorm";

export class DriverIdentity1710000000043 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE users
      ADD COLUMN last_name varchar(100),
      ADD COLUMN first_name varchar(100),
      ADD COLUMN middle_name varchar(100)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE users
      DROP COLUMN middle_name, DROP COLUMN first_name, DROP COLUMN last_name`);
  }
}
