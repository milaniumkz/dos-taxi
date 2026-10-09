import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { CreateDriverBonusSettings1710000000027 } from "../../src/database/migrations/1710000000027-CreateDriverBonusSettings";
import { DailyDriverBonuses1710000000032 } from "../../src/database/migrations/1710000000032-DailyDriverBonuses";

describe("daily bonus migration preserves payment history", () => {
  const schema = `bonus_migration_test_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource;
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Use a test database");
    db = new DataSource({
      type: "postgres",
      url,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query("CREATE TABLE cities (id uuid PRIMARY KEY, timezone text)");
    await db.query(
      "CREATE TABLE executors (id uuid PRIMARY KEY, city_id uuid)",
    );
    await db.query("CREATE TABLE orders (id uuid PRIMARY KEY)");
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  it("keeps all past bonuses and allows the same threshold on a new day only", async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new CreateDriverBonusSettings1710000000027().up(runner);
      const city = randomUUID(),
        executor = randomUUID(),
        order = randomUUID();
      await runner.query("INSERT INTO cities VALUES ($1, $2)", [
        city,
        "Asia/Almaty",
      ]);
      await runner.query("INSERT INTO executors VALUES ($1, $2)", [
        executor,
        city,
      ]);
      await runner.query("INSERT INTO orders VALUES ($1)", [order]);
      for (const [threshold, at] of [
        [20, "2026-10-08T01:00:00Z"],
        [40, "2026-10-08T08:00:00Z"],
        [60, "2026-10-08T20:00:00Z"],
      ]) {
        await runner.query(
          "INSERT INTO driver_bonus_payouts (executor_id, order_id, threshold_completed_orders, amount, created_at) VALUES ($1,$2,$3,700,$4)",
          [executor, order, threshold, at],
        );
      }
      await new DailyDriverBonuses1710000000032().up(runner);
      const rows = await runner.query(
        "SELECT count(*)::int AS payments, sum(amount)::text AS amount, count(bonus_date)::int AS days FROM driver_bonus_payouts",
      );
      expect(rows[0]).toEqual({ payments: 3, amount: "2100.00", days: 2 });
      await runner.query(
        "INSERT INTO driver_bonus_payouts (executor_id, order_id, threshold_completed_orders, amount, bonus_date) VALUES ($1,$2,20,700,$3)",
        [executor, order, "2026-10-10"],
      );
      await expect(
        runner.query(
          "INSERT INTO driver_bonus_payouts (executor_id, order_id, threshold_completed_orders, amount, bonus_date) VALUES ($1,$2,40,700,$3)",
          [executor, order, "2026-10-10"],
        ),
      ).rejects.toThrow();
    } finally {
      await runner.release();
    }
  });
});
