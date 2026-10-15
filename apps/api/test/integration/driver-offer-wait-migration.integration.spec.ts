import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { DriverOfferWait1710000000035 } from "../../src/database/migrations/1710000000035-DriverOfferWait";
describe("30 second driver offer migration", () => {
  let db: DataSource;
  const schema = "offer_wait_" + randomUUID().replaceAll("-", "");
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test")) throw Error("Test DB only");
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
  it("changes existing/new city defaults and clamps only pending proposals", async () => {
    await db.query(
      "CREATE TABLE cities(id integer PRIMARY KEY,ride_offer_ttl_seconds integer DEFAULT 300)",
    );
    await db.query(
      "CREATE TABLE ride_price_offers(id integer PRIMARY KEY,status text,updated_at timestamptz,expires_at timestamptz)",
    );
    await db.query("INSERT INTO cities VALUES(1,300),(2,90)");
    await db.query(
      "INSERT INTO ride_price_offers VALUES(1,'pending',now(),now()+interval '300 seconds'),(2,'accepted',now(),now()+interval '300 seconds'),(3,'pending',now()-interval '60 seconds',now()+interval '240 seconds')",
    );
    const runner = db.createQueryRunner();
    await new DriverOfferWait1710000000035().up(runner);
    await db.query("INSERT INTO cities(id) VALUES(3)");
    expect(
      await db.query(
        "SELECT ride_offer_ttl_seconds AS ttl FROM cities ORDER BY id",
      ),
    ).toEqual([{ ttl: 30 }, { ttl: 30 }, { ttl: 30 }]);
    const rows = await db.query(
      "SELECT id,extract(epoch from(expires_at-updated_at))::integer AS seconds,expires_at<now() AS expired FROM ride_price_offers ORDER BY id",
    );
    expect(rows).toEqual([
      { id: 1, seconds: 30, expired: false },
      { id: 2, seconds: 300, expired: false },
      { id: 3, seconds: 30, expired: true },
    ]);
    await runner.release();
  });
});
