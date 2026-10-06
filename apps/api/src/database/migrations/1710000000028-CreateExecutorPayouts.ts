import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExecutorPayouts1710000000028
  implements MigrationInterface
{
  name = "CreateExecutorPayouts1710000000028";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS executor_payouts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        executor_id uuid NOT NULL REFERENCES executors(id) ON DELETE CASCADE,
        amount numeric(12,2) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        method varchar(20) NOT NULL DEFAULT 'kaspi',
        admin_comment text,
        paid_by_id uuid REFERENCES users(id),
        paid_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_executor_payouts_executor
      ON executor_payouts(executor_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_executor_payouts_status
      ON executor_payouts(status)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_executor_payouts_status");
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_executor_payouts_executor",
    );
    await queryRunner.query("DROP TABLE IF EXISTS executor_payouts");
  }
}
