import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { SetGlobalCommissionSevenPercent1710000000038 } from "../../src/database/migrations/1710000000038-SetGlobalCommissionSevenPercent";

describe("global seven percent commission migration", () => {
  const schema = `commission_test_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource;

  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test")) {
      throw new Error("Use an isolated _test database");
    }
    db = new DataSource({
      type: "postgres",
      url,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`CREATE TABLE cities (
      ride_commission_percent numeric(12,2) DEFAULT 10,
      ride_commission_fixed numeric(12,2) DEFAULT 0)`);
    await db.query(`CREATE TABLE tariffs (
      commission_percent numeric(5,2) DEFAULT 10,
      commission_fixed numeric(12,2) DEFAULT 0)`);
    await db.query(
      `CREATE TABLE orders (ride_commission_percent numeric(12,2))`,
    );
    await db.query(`INSERT INTO cities VALUES (10,0),(15,100),(0,50)`);
    await db.query(`INSERT INTO tariffs VALUES (10,0),(12,200),(0,50)`);
    await db.query(`INSERT INTO orders VALUES (10)`);
  });

  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it("updates every city and tariff, sets new defaults and preserves order snapshots", async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new SetGlobalCommissionSevenPercent1710000000038().up(runner);
      await runner.query(`INSERT INTO cities DEFAULT VALUES`);
      await runner.query(`INSERT INTO tariffs DEFAULT VALUES`);
      const cities = await runner.query(`SELECT * FROM cities`);
      const tariffs = await runner.query(`SELECT * FROM tariffs`);
      expect(cities).toHaveLength(4);
      expect(tariffs).toHaveLength(4);
      for (const city of cities) {
        expect(city).toEqual({
          ride_commission_percent: "7.00",
          ride_commission_fixed: "0.00",
        });
      }
      for (const tariff of tariffs) {
        expect(tariff).toEqual({
          commission_percent: "7.00",
          commission_fixed: "0.00",
        });
      }
      expect(await runner.query(`SELECT * FROM orders`)).toEqual([
        { ride_commission_percent: "10.00" },
      ]);
    } finally {
      await runner.release();
    }
  });
});
