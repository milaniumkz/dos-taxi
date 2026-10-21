import { MigrationInterface, QueryRunner } from "typeorm";
export class TopUpCurrencySnapshots1710000000037 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE executor_balance_topups ADD COLUMN IF NOT EXISTS payment_currency varchar(3), ADD COLUMN IF NOT EXISTS credited_amount numeric(12,2), ADD COLUMN IF NOT EXISTS credited_currency varchar(3), ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,4), ADD COLUMN IF NOT EXISTS fx_corrected_at timestamptz`,
    );
  }
  async down(): Promise<void> {
    /* Keep financial snapshots and correction history. */
  }
}
