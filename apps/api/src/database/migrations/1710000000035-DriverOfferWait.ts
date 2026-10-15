import { MigrationInterface, QueryRunner } from "typeorm";
export class DriverOfferWait1710000000035 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "ALTER TABLE cities ALTER COLUMN ride_offer_ttl_seconds SET DEFAULT 30",
    );
    await runner.query("UPDATE cities SET ride_offer_ttl_seconds=30");
    await runner.query(
      "UPDATE ride_price_offers SET expires_at=LEAST(expires_at,updated_at+interval '30 seconds') WHERE status='pending'",
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    // Never extend a live proposal or rewrite an accepted fare during rollback.
    await runner.query(
      "ALTER TABLE cities ALTER COLUMN ride_offer_ttl_seconds SET DEFAULT 300",
    );
  }
}
