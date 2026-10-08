import { MigrationInterface, QueryRunner } from "typeorm";
export class CreateApplicationErrorMessages1710000000031 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE application_error_messages (
      code VARCHAR(80) PRIMARY KEY,
      message_ru VARCHAR(1000) NOT NULL CHECK (length(trim(message_ru)) > 0),
      message_kk VARCHAR(1000) NOT NULL CHECK (length(trim(message_kk)) > 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE application_error_messages");
  }
}
