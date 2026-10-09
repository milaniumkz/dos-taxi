import { MigrationInterface, QueryRunner } from "typeorm";

export class TariffDeletion1710000000033 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tariffs ADD COLUMN deleted_at timestamptz NULL`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tariffs DROP COLUMN deleted_at`);
  }
}
