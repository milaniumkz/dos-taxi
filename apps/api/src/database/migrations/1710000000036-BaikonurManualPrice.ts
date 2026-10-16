import { MigrationInterface, QueryRunner } from "typeorm";
export class BaikonurManualPrice1710000000036 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE cities ADD COLUMN IF NOT EXISTS ride_manual_price_policy jsonb`,
    );
    await runner.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS ride_balance_currency varchar(3), ADD COLUMN IF NOT EXISTS ride_exchange_rate numeric(12,4)`,
    );
    await runner.query(
      `UPDATE cities SET ride_manual_price_policy='{"rubMinimum":"90.00","kztMinimum":"500.00","kztThreshold":"500.00"}'::jsonb WHERE lower(trim(name_ru)) IN ('байконур','байқоңыр','baikonur') OR lower(trim(name_kk)) IN ('байконур','байқоңыр','baikonur')`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    // Keep currency snapshots on already-created orders for accurate settlement.
    await runner.query(`UPDATE cities SET ride_manual_price_policy=NULL WHERE ride_manual_price_policy='{"rubMinimum":"90.00","kztMinimum":"500.00","kztThreshold":"500.00"}'::jsonb AND (lower(trim(name_ru)) IN ('байконур','байқоңыр','baikonur') OR lower(trim(name_kk)) IN ('байконур','байқоңыр','baikonur'))`);
  }
}
