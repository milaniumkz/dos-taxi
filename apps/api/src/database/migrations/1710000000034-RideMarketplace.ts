import { MigrationInterface, QueryRunner } from "typeorm";
export class RideMarketplace1710000000034 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_pricing_basis varchar(20) NOT NULL DEFAULT 'seat'",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_minimum_order_kzt numeric(12,2) NOT NULL DEFAULT 500",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_exchange_rate numeric(12,2) NOT NULL DEFAULT 7",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_price_step_kzt numeric(12,2) NOT NULL DEFAULT 50",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_commission_percent numeric(12,2) NOT NULL DEFAULT 10",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_minimum_driver_balance numeric(12,2) NOT NULL DEFAULT 100",
    );
    await runner.query(
      "ALTER TABLE cities ADD COLUMN ride_offer_ttl_seconds integer NOT NULL DEFAULT 300",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN is_negotiated boolean NOT NULL DEFAULT false",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_request_key uuid NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_payload_hash varchar(64) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN passenger_count integer NOT NULL DEFAULT 1",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_pricing_basis varchar(20) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_unit_price numeric(12,2) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_minimum_unit_price numeric(12,2) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_price_step numeric(12,2) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN ride_commission_percent numeric(12,2) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN pickup_entrance varchar(100) NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN pickup_comment text NULL",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN needs_child_seat boolean NOT NULL DEFAULT false",
    );
    await runner.query(
      "ALTER TABLE orders ADD COLUMN shared_ride boolean NOT NULL DEFAULT false",
    );
    await runner.query(
      "ALTER TABLE executors ADD COLUMN passenger_capacity integer NOT NULL DEFAULT 4",
    );
    await runner.query(
      "ALTER TABLE executors ADD CONSTRAINT CHK_ride_capacity CHECK(passenger_capacity BETWEEN 1 AND 8)",
    );
    await runner.query(
      "CREATE UNIQUE INDEX IDX_ride_request_key ON orders(client_id, ride_request_key) WHERE ride_request_key IS NOT NULL",
    );
    await runner.query(
      "CREATE INDEX IDX_ride_feed ON orders(city_id, created_at) WHERE is_negotiated=true AND status='searching' AND executor_id IS NULL",
    );
    await runner.query(
      "ALTER TABLE cities ADD CONSTRAINT CHK_ride_city_settings CHECK (ride_pricing_basis IN ('seat','salon') AND ride_minimum_order_kzt > 0 AND ride_exchange_rate > 0 AND ride_price_step_kzt > 0 AND ride_commission_percent BETWEEN 0 AND 100 AND ride_minimum_driver_balance >= 0 AND ride_offer_ttl_seconds BETWEEN 30 AND 3600)",
    );
    await runner.query(
      "ALTER TABLE orders ADD CONSTRAINT CHK_ride_request_fields CHECK (NOT is_negotiated OR (passenger_count BETWEEN 1 AND 8 AND ride_unit_price IS NOT NULL AND ride_minimum_unit_price IS NOT NULL AND ride_price_step IS NOT NULL AND ride_commission_percent IS NOT NULL AND ride_pricing_basis IS NOT NULL AND ride_pricing_basis IN ('seat','salon') AND ride_unit_price > 0 AND ride_minimum_unit_price > 0 AND ride_price_step > 0 AND ride_commission_percent BETWEEN 0 AND 100))",
    );
    await runner.query(
      "CREATE TABLE ride_price_offers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), executor_id uuid NOT NULL REFERENCES executors(id), unit_price numeric(12,2) NOT NULL CHECK(unit_price>0), total_price numeric(12,2) NOT NULL CHECK(total_price>0), price_steps integer NOT NULL, has_child_seat boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1, notification_sent_version integer NOT NULL DEFAULT 0, status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','withdrawn','superseded')), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,executor_id))",
    );
    await runner.query(
      "CREATE UNIQUE INDEX IDX_one_accepted_ride_offer ON ride_price_offers(order_id) WHERE status='accepted'",
    );
    await runner.query(
      "CREATE INDEX IDX_ride_offers_order ON ride_price_offers(order_id, status)",
    );
    await runner.query(
      `ALTER TABLE cities ADD COLUMN ride_commission_fixed numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await runner.query(
      `ALTER TABLE orders ADD COLUMN ride_commission_fixed numeric(12,2) NULL`,
    );
    await runner.query(`UPDATE cities c SET (ride_commission_percent,ride_commission_fixed) =
      (SELECT t.commission_percent, round(t.commission_fixed * CASE WHEN t.currency=c.currency THEN 1 WHEN c.currency='RUB' THEN 1/c.ride_exchange_rate ELSE c.ride_exchange_rate END,2)
       FROM tariffs t WHERE t.city_id=c.id AND t.service_type='taxi' AND t.is_active=true AND t.deleted_at IS NULL
       ORDER BY (t.currency=c.currency) DESC,(t.vehicle_class='economy') DESC,t.created_at DESC LIMIT 1)
      WHERE EXISTS (SELECT 1 FROM tariffs t WHERE t.city_id=c.id AND t.service_type='taxi' AND t.is_active=true AND t.deleted_at IS NULL)`);
    await runner.query(`INSERT INTO notification_templates(type,channel,lang,subject,body,is_active) VALUES
      ('ride_price_offer','push','ru','Новое предложение водителя','{{driverName}} предлагает {{totalPrice}} {{currency}} за поездку.',true),
      ('ride_price_offer','push','kk','Жүргізушіден жаңа ұсыныс','{{driverName}} жолға {{totalPrice}} {{currency}} ұсынады.',true)
      ON CONFLICT (type,channel,lang) DO NOTHING`);
  }
  async down(): Promise<void> {
    throw new Error(
      "Ride marketplace migration preserves financial and offer history; use a forward migration to change it",
    );
  }
}
