import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedIntercityTariff1710000000021 implements MigrationInterface {
  name = "SeedIntercityTariff1710000000021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "tariffs" (
        "city_id",
        "service_type",
        "vehicle_class",
        "name_ru",
        "name_kk",
        "base_price",
        "price_per_km",
        "price_per_minute",
        "minimum_price",
        "free_waiting_seconds",
        "paid_waiting_per_minute",
        "currency",
        "valid_from",
        "valid_to",
        "is_active",
        "created_by"
      )
      SELECT
        "cities"."id",
        'intercity',
        'economy',
        'Межгород Эконом',
        'Қалааралық Эконом',
        1200.00,
        145.0000,
        28.0000,
        2500.00,
        180,
        30.0000,
        "cities"."currency",
        NOW(),
        NULL,
        true,
        NULL
      FROM "cities"
      WHERE "cities"."name_ru" = 'Алматы'
        AND NOT EXISTS (
          SELECT 1
          FROM "tariffs"
          WHERE "tariffs"."city_id" = "cities"."id"
            AND "tariffs"."service_type" = 'intercity'
            AND "tariffs"."vehicle_class" = 'economy'
            AND "tariffs"."is_active" = true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "tariffs"
      WHERE "service_type" = 'intercity'
        AND "vehicle_class" = 'economy'
        AND "name_ru" = 'Межгород Эконом'
        AND "name_kk" = 'Қалааралық Эконом'
    `);
  }
}
