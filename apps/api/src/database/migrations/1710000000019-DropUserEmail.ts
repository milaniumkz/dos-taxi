import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUserEmail1710000000019 implements MigrationInterface {
  name = "DropUserEmail1710000000019";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "email"`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
