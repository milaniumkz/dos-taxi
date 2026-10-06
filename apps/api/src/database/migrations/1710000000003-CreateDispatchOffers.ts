import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDispatchOffers1710000000003 implements MigrationInterface {
  name = 'CreateDispatchOffers1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dispatch_offers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "executor_id" UUID NOT NULL REFERENCES "executors"("id") ON DELETE CASCADE,
        "offered_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "responded_at" TIMESTAMPTZ,
        "response" VARCHAR(20)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_dispatch_offers_order_id" ON "dispatch_offers" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dispatch_offers_executor_id" ON "dispatch_offers" ("executor_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dispatch_offers_executor_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_dispatch_offers_order_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatch_offers"`);
  }
}
