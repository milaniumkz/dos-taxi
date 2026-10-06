import {
  CourierVehicleType,
  Currency,
  DeliveryStatus,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
} from "@dos/shared-types";
import { MigrationInterface, QueryRunner } from "typeorm";

const enumValues = (values: string[]) =>
  values.map((value) => `'${value}'`).join(", ");

export class CreateCoreSchema1710000000000 implements MigrationInterface {
  name = "CreateCoreSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(
      `CREATE TYPE "service_type_enum" AS ENUM(${enumValues(Object.values(ServiceType))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "executor_type_enum" AS ENUM(${enumValues(Object.values(ExecutorType))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "courier_vehicle_type_enum" AS ENUM(${enumValues(Object.values(CourierVehicleType))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "order_status_enum" AS ENUM(${enumValues(Object.values(OrderStatus))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "delivery_status_enum" AS ENUM(${enumValues(Object.values(DeliveryStatus))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "payment_method_enum" AS ENUM(${enumValues(Object.values(PaymentMethod))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "payment_status_enum" AS ENUM(${enumValues(Object.values(PaymentStatus))})`,
    );
    await queryRunner.query(
      `CREATE TYPE "currency_enum" AS ENUM(${enumValues(Object.values(Currency))})`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" VARCHAR(20) NOT NULL UNIQUE,
        "name" VARCHAR(100),
        "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'ru',
        "preferred_currency" "currency_enum" NOT NULL DEFAULT 'KZT',
        "bonus_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "is_blocked" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name_ru" VARCHAR(100) NOT NULL,
        "name_kk" VARCHAR(100) NOT NULL,
        "country_code" VARCHAR(3) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "timezone" VARCHAR(50) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT false,
        "service_zone" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "discount_type" VARCHAR(20) NOT NULL DEFAULT 'fixed',
        "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "max_uses" INT,
        "valid_to" TIMESTAMPTZ,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "executors" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id"),
        "executor_type" "executor_type_enum" NOT NULL,
        "vehicle_type" "courier_vehicle_type_enum",
        "car_class" VARCHAR(50),
        "is_online" BOOLEAN NOT NULL DEFAULT false,
        "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
        "cancel_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "city_id" UUID REFERENCES "cities"("id"),
        "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "executor_locations" (
        "executor_id" UUID PRIMARY KEY REFERENCES "executors"("id"),
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "heading" SMALLINT,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" UUID NOT NULL REFERENCES "users"("id"),
        "executor_id" UUID REFERENCES "executors"("id"),
        "service_type" "service_type_enum" NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'draft',
        "city_id" UUID NOT NULL REFERENCES "cities"("id"),
        "currency" "currency_enum" NOT NULL,
        "estimated_price" DECIMAL(12,2),
        "final_price" DECIMAL(12,2),
        "distance_meters" INT,
        "duration_seconds" INT,
        "payment_method" "payment_method_enum" NOT NULL,
        "promo_code_id" UUID REFERENCES "promo_codes"("id"),
        "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "scheduled_at" TIMESTAMPTZ,
        "accepted_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "cancelled_at" TIMESTAMPTZ,
        "cancel_reason" TEXT,
        "client_rating" SMALLINT CHECK ("client_rating" BETWEEN 1 AND 5),
        "executor_rating" SMALLINT CHECK ("executor_rating" BETWEEN 1 AND 5),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "route_points" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "sequence_index" SMALLINT NOT NULL,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "address" TEXT NOT NULL,
        "contact_name" VARCHAR(100),
        "contact_phone" VARCHAR(20),
        "arrived_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "notes" TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "delivery_details" (
        "order_id" UUID PRIMARY KEY REFERENCES "orders"("id"),
        "courier_vehicle_type" "courier_vehicle_type_enum" NOT NULL,
        "package_description" TEXT,
        "package_photo_url" TEXT,
        "declared_value" DECIMAL(12,2),
        "is_fragile" BOOLEAN NOT NULL DEFAULT false,
        "requires_return" BOOLEAN NOT NULL DEFAULT false,
        "cash_on_delivery" DECIMAL(12,2),
        "delivery_status" "delivery_status_enum" NOT NULL DEFAULT 'pending_pickup',
        "proof_photo_url" TEXT,
        "proof_signature_url" TEXT,
        "recipient_code" VARCHAR(10),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID REFERENCES "orders"("id"),
        "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "method" "payment_method_enum" NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "exchange_rate" DECIMAL(12,6),
        "amount_base" DECIMAL(12,2),
        "provider" VARCHAR(50),
        "provider_transaction_id" VARCHAR(255),
        "idempotency_key" VARCHAR(255) UNIQUE,
        "captured_at" TIMESTAMPTZ,
        "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tariffs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "city_id" UUID NOT NULL REFERENCES "cities"("id"),
        "service_type" "service_type_enum" NOT NULL,
        "vehicle_class" VARCHAR(50),
        "name_ru" VARCHAR(100) NOT NULL,
        "name_kk" VARCHAR(100) NOT NULL,
        "base_price" DECIMAL(12,2) NOT NULL,
        "price_per_km" DECIMAL(12,4) NOT NULL,
        "price_per_minute" DECIMAL(12,4) NOT NULL,
        "minimum_price" DECIMAL(12,2) NOT NULL,
        "free_waiting_seconds" INT NOT NULL DEFAULT 180,
        "paid_waiting_per_minute" DECIMAL(12,4) NOT NULL DEFAULT 0,
        "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
        "commission_fixed" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "currency" "currency_enum" NOT NULL,
        "valid_from" TIMESTAMPTZ NOT NULL,
        "valid_to" TIMESTAMPTZ,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_orders_client_id" ON "orders" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_executor_id" ON "orders" ("executor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_city_id" ON "orders" ("city_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_executor_locations_executor_id" ON "executor_locations" ("executor_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_executor_locations_executor_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_city_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_executor_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_client_id"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "tariffs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_details"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_points"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "executor_locations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "executors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "currency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "courier_vehicle_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "executor_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "service_type_enum"`);
  }
}
