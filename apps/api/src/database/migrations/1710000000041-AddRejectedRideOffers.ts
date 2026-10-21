import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectedRideOffers1710000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ride_price_offers"
      DROP CONSTRAINT IF EXISTS "ride_price_offers_status_check"
    `);
    await queryRunner.query(`
      ALTER TABLE "ride_price_offers"
      ADD CONSTRAINT "ride_price_offers_status_check"
      CHECK (status IN ('pending','accepted','withdrawn','superseded','rejected'))
    `);
  }

  public async down(): Promise<void> {
    // Retain rejected offers and their history when reverting application code.
  }
}
