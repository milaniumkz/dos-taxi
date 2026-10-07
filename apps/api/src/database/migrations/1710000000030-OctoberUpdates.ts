import { MigrationInterface, QueryRunner } from 'typeorm';

export class OctoberUpdates1710000000030 implements MigrationInterface {
  name = 'OctoberUpdates1710000000030';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE orders ADD COLUMN car_class varchar(50)`);
    await runner.query(`UPDATE orders o SET car_class = COALESCE(
      (SELECT e.metadata->>'carClass' FROM order_status_events e
       WHERE e.order_id=o.id AND e.to_status='draft' ORDER BY e.created_at LIMIT 1), 'economy')
      WHERE o.service_type='taxi'`);
    await runner.query(`UPDATE driver_bonus_settings SET orders_required=20, bonus_amount=5000,
      is_enabled=true, updated_at=NOW() WHERE key='default'`);
    await runner.query(`INSERT INTO tariffs(city_id, service_type, vehicle_class, name_ru, name_kk,
      base_price, price_per_km, price_per_minute, minimum_price, paid_waiting_per_minute, currency, valid_from, is_active)
      SELECT c.id, t.service::service_type_enum, t.class, t.ru, t.kk, t.base, t.km, t.minute, t.minimum, t.waiting, c.currency, NOW(), true
      FROM cities c CROSS JOIN (VALUES
        ('taxi','economy','Такси Эконом','Такси Эконом',600,120,35,900,25),
        ('taxi','comfort','Такси Комфорт','Такси Комфорт',750,145,42,1100,30),
        ('taxi','comfort_plus','Такси Комфорт+','Такси Комфорт+',900,170,50,1350,35),
        ('taxi','business','Такси Бизнес','Такси Бизнес',1200,220,65,1800,45),
        ('delivery',NULL,'Доставка','Жеткізу',650,110,24,850,18),
        ('intercity',NULL,'Межгород','Қалааралық',1500,175,34,3200,35)
      ) AS t(service,class,ru,kk,base,km,minute,minimum,waiting)
      WHERE NOT EXISTS(SELECT 1 FROM tariffs existing WHERE existing.city_id=c.id
        AND existing.service_type::text=t.service AND existing.vehicle_class IS NOT DISTINCT FROM t.class)`);
    await runner.query(`CREATE TABLE kaspi_transactions (
      id bigserial PRIMARY KEY,
      txn_id varchar(18) NOT NULL UNIQUE,
      executor_id uuid NOT NULL REFERENCES executors(id),
      account varchar(11) NOT NULL,
      amount numeric(12,2) NOT NULL CHECK(amount > 0),
      txn_date varchar(14) NOT NULL,
      topup_id uuid NOT NULL REFERENCES executor_balance_topups(id),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await runner.query(`CREATE INDEX ON kaspi_transactions(executor_id)`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE kaspi_transactions');
    await runner.query('ALTER TABLE orders DROP COLUMN car_class');
    // Bonus settings are operator data; do not restore an unknown previous value.
  }
}
