import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransferPaymentsAndExecutorBalanceTopups1710000000023 implements MigrationInterface {
  name = "AddTransferPaymentsAndExecutorBalanceTopups1710000000023";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "payment_method_enum" ADD VALUE IF NOT EXISTS 'transfer_kaspi'
    `);
    await queryRunner.query(`
      ALTER TYPE "payment_method_enum" ADD VALUE IF NOT EXISTS 'transfer_halyk'
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "executor_balance_topups" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "executor_id" UUID NOT NULL REFERENCES "executors"("id") ON DELETE CASCADE,
        "amount" DECIMAL(12,2) NOT NULL,
        "phone" VARCHAR(32) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "invoice_provider" VARCHAR(20) NOT NULL DEFAULT 'kaspi',
        "admin_comment" TEXT,
        "confirmed_by_id" UUID REFERENCES "users"("id"),
        "confirmed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_executor_balance_topups_executor_id"
        ON "executor_balance_topups"("executor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_executor_balance_topups_status_created_at"
        ON "executor_balance_topups"("status", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "executor_balance_topups"`);
  }
}
