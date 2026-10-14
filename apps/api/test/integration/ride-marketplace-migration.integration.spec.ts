import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { RideMarketplace1710000000034 } from "../../src/database/migrations/1710000000034-RideMarketplace";

describe("ride marketplace migration preserves existing cities and finances", () => {
  const schema = `ride_migration_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource;
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Test database required");
    db = new DataSource({
      type: "postgres",
      url,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  it("sets every city minimum and rate, copies its commission, and keeps historical fares and balances", async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        "CREATE TABLE cities(id uuid PRIMARY KEY,currency text NOT NULL)",
      );
      await runner.query(
        "CREATE TABLE executors(id uuid PRIMARY KEY,balance numeric(12,2) NOT NULL)",
      );
      await runner.query(
        "CREATE TABLE orders(id uuid PRIMARY KEY,client_id uuid,city_id uuid,executor_id uuid,status text,created_at timestamptz DEFAULT now(),estimated_price numeric(12,2),final_price numeric(12,2))",
      );
      await runner.query(
        "CREATE TABLE tariffs(city_id uuid,service_type text,is_active boolean,deleted_at timestamptz,currency text,vehicle_class text,created_at timestamptz,commission_percent numeric(12,2),commission_fixed numeric(12,2))",
      );
      await runner.query(
        "CREATE TABLE notification_templates(type text,channel text,lang text,subject text,body text,is_active boolean,UNIQUE(type,channel,lang))",
      );
      const kzt = randomUUID(),
        rub = randomUUID(),
        driver = randomUUID(),
        order = randomUUID();
      await runner.query("INSERT INTO cities VALUES ($1,'KZT'),($2,'RUB')", [
        kzt,
        rub,
      ]);
      await runner.query("INSERT INTO executors VALUES ($1,1234.56)", [driver]);
      await runner.query(
        "INSERT INTO orders VALUES ($1,$2,$3,$4,'completed',now(),999,1050)",
        [order, randomUUID(), kzt, driver],
      );
      await runner.query(
        "INSERT INTO tariffs VALUES ($1,'taxi',true,NULL,'KZT','economy',now(),12,70),($2,'taxi',true,NULL,'KZT','economy',now(),15,70)",
        [kzt, rub],
      );
      await new RideMarketplace1710000000034().up(runner);
      expect(
        await runner.query(
          "SELECT currency,ride_pricing_basis,ride_minimum_order_kzt,ride_exchange_rate,ride_commission_percent,ride_commission_fixed FROM cities ORDER BY currency",
        ),
      ).toEqual([
        {
          currency: "KZT",
          ride_pricing_basis: "seat",
          ride_minimum_order_kzt: "500.00",
          ride_exchange_rate: "7.00",
          ride_commission_percent: "12.00",
          ride_commission_fixed: "70.00",
        },
        {
          currency: "RUB",
          ride_pricing_basis: "seat",
          ride_minimum_order_kzt: "500.00",
          ride_exchange_rate: "7.00",
          ride_commission_percent: "15.00",
          ride_commission_fixed: "10.00",
        },
      ]);
      expect(
        await runner.query("SELECT balance,passenger_capacity FROM executors"),
      ).toEqual([{ balance: "1234.56", passenger_capacity: 4 }]);
      expect(
        await runner.query(
          "SELECT estimated_price,final_price,is_negotiated FROM orders",
        ),
      ).toEqual([
        {
          estimated_price: "999.00",
          final_price: "1050.00",
          is_negotiated: false,
        },
      ]);
      await expect(new RideMarketplace1710000000034().down()).rejects.toThrow(
        "preserves financial",
      );
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  });
});
