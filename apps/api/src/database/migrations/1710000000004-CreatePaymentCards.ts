import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentCards1710000000004 implements MigrationInterface {
  name = 'CreatePaymentCards1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_cards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider" VARCHAR(50) NOT NULL,
        "provider_card_id" VARCHAR(255) NOT NULL,
        "last4" VARCHAR(4) NOT NULL,
        "brand" VARCHAR(50) NOT NULL,
        "holder_name" VARCHAR(100),
        "exp_month" SMALLINT,
        "exp_year" SMALLINT,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_cards_user_id" ON "payment_cards" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_cards_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_cards"`);
  }
}
