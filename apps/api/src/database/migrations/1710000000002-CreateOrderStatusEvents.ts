import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderStatusEvents1710000000002
  implements MigrationInterface
{
  name = 'CreateOrderStatusEvents1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_status_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "from_status" "order_status_enum",
        "to_status" "order_status_enum" NOT NULL,
        "actor_id" UUID,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_order_status_events_order_id" ON "order_status_events" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_status_events_order_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_events"`);
  }
}
