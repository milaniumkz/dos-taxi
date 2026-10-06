import { MigrationInterface, QueryRunner } from "typeorm";

export class SetGlobalTariffCommissionTenPercent1710000000026
  implements MigrationInterface
{
  name = "SetGlobalTariffCommissionTenPercent1710000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tariffs"
      ALTER COLUMN "commission_percent" SET DEFAULT 10
    `);
    await queryRunner.query(`
      UPDATE "tariffs"
      SET
        "commission_percent" = 10.00,
        "commission_fixed" = 0.00
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tariffs"
      ALTER COLUMN "commission_percent" SET DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "tariffs"
      SET "commission_percent" = 0.00
    `);
  }
}
