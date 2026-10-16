import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPsbPayment1710000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "payment_method_enum" ADD VALUE IF NOT EXISTS 'transfer_psb'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot remove an enum value without rebuilding the type and
    // changing historical orders. Keep the value when reverting application code.
  }
}
