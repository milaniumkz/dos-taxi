import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrderChatMessages1710000000020 implements MigrationInterface {
  name = "CreateOrderChatMessages1710000000020";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_chat_messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "sender_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "sender_role" VARCHAR(20) NOT NULL,
        "body" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_order_chat_messages_order_id_created_at" ON "order_chat_messages" ("order_id", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_chat_messages_order_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "order_chat_messages"`);
  }
}
