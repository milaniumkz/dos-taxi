import { MigrationInterface, QueryRunner } from "typeorm";
export class DailyDriverBonuses1710000000032 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "ALTER TABLE driver_bonus_payouts ADD COLUMN bonus_date DATE",
    );
    // Keep every historical payment; mark one per day to avoid paying again today.
    await runner.query(`WITH dated AS (
      SELECT p.id, (p.created_at AT TIME ZONE coalesce(tz.name, 'Asia/Almaty'))::date AS day,
        row_number() OVER (PARTITION BY p.executor_id, (p.created_at AT TIME ZONE coalesce(tz.name, 'Asia/Almaty'))::date ORDER BY p.created_at DESC, p.id) AS ordinal
      FROM driver_bonus_payouts p JOIN executors e ON e.id = p.executor_id
      LEFT JOIN cities c ON c.id = e.city_id LEFT JOIN pg_timezone_names tz ON tz.name = c.timezone
    ) UPDATE driver_bonus_payouts p SET bonus_date = dated.day FROM dated WHERE dated.id = p.id AND dated.ordinal = 1`);
    await runner.query(
      'ALTER TABLE driver_bonus_payouts DROP CONSTRAINT IF EXISTS "UQ_driver_bonus_payouts_executor_threshold"',
    );
    await runner.query(
      'DROP INDEX IF EXISTS "IDX_driver_bonus_payouts_executor_threshold"',
    );
    await runner.query(
      'CREATE UNIQUE INDEX "IDX_driver_bonus_payouts_executor_day" ON driver_bonus_payouts (executor_id, bonus_date) WHERE bonus_date IS NOT NULL',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    // Daily thresholds repeat. A lifetime uniqueness constraint cannot be restored safely.
    await runner.query('DROP INDEX "IDX_driver_bonus_payouts_executor_day"');
    await runner.query(
      "ALTER TABLE driver_bonus_payouts DROP COLUMN bonus_date",
    );
    await runner.query(
      'CREATE INDEX "IDX_driver_bonus_payouts_executor_threshold" ON driver_bonus_payouts (executor_id, threshold_completed_orders)',
    );
  }
}
