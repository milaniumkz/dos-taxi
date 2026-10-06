import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedPavlodarCity1710000000022 implements MigrationInterface {
  name = "SeedPavlodarCity1710000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cities" (
        "name_ru",
        "name_kk",
        "country_code",
        "currency",
        "timezone",
        "is_active",
        "service_zone"
      )
      VALUES (
        'Павлодар',
        'Павлодар',
        'KZ',
        'KZT',
        'Asia/Almaty',
        true,
        '{
          "type": "Polygon",
          "coordinates": [[
            [76.55, 52.55],
            [77.35, 52.55],
            [77.35, 52.00],
            [76.55, 52.00],
            [76.55, 52.55]
          ]]
        }'::jsonb
      )
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "cities"
      SET
        "country_code" = 'KZ',
        "currency" = 'KZT',
        "timezone" = 'Asia/Almaty',
        "is_active" = true,
        "service_zone" = '{
          "type": "Polygon",
          "coordinates": [[
            [76.55, 52.55],
            [77.35, 52.55],
            [77.35, 52.00],
            [76.55, 52.00],
            [76.55, 52.55]
          ]]
        }'::jsonb
      WHERE "name_ru" = 'Павлодар'
    `);

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
        tariff."service_type"::service_type_enum,
        tariff."vehicle_class",
        tariff."name_ru",
        tariff."name_kk",
        tariff."base_price",
        tariff."price_per_km",
        tariff."price_per_minute",
        tariff."minimum_price",
        180,
        tariff."paid_waiting_per_minute",
        'KZT',
        NOW(),
        NULL,
        true,
        NULL
      FROM "cities"
      CROSS JOIN (
        VALUES
          ('taxi', 'economy', 'Такси Эконом', 'Такси Эконом', 550.00, 110.0000, 30.0000, 800.00, 25.0000),
          ('intercity', 'economy', 'Межгород Эконом', 'Қалааралық Эконом', 1200.00, 145.0000, 28.0000, 2500.00, 30.0000),
          ('delivery', 'bicycle', 'Доставка Велосипед', 'Жеткізу Велосипед', 450.00, 85.0000, 18.0000, 650.00, 15.0000),
          ('delivery', 'moped', 'Доставка Мопед', 'Жеткізу Мопед', 600.00, 105.0000, 22.0000, 800.00, 18.0000),
          ('delivery', 'scooter', 'Доставка Самокат', 'Жеткізу Самокат', 500.00, 90.0000, 20.0000, 720.00, 16.0000),
          ('delivery', 'car', 'Доставка Авто', 'Жеткізу Авто', 750.00, 130.0000, 30.0000, 1050.00, 22.0000)
      ) AS tariff(
        "service_type",
        "vehicle_class",
        "name_ru",
        "name_kk",
        "base_price",
        "price_per_km",
        "price_per_minute",
        "minimum_price",
        "paid_waiting_per_minute"
      )
      WHERE "cities"."name_ru" = 'Павлодар'
        AND NOT EXISTS (
          SELECT 1
          FROM "tariffs"
          WHERE "tariffs"."city_id" = "cities"."id"
            AND "tariffs"."service_type" = tariff."service_type"::service_type_enum
            AND "tariffs"."vehicle_class" = tariff."vehicle_class"
            AND "tariffs"."is_active" = true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "tariffs"
      USING "cities"
      WHERE "tariffs"."city_id" = "cities"."id"
        AND "cities"."name_ru" = 'Павлодар'
        AND "tariffs"."name_ru" IN (
          'Такси Эконом',
          'Межгород Эконом',
          'Доставка Велосипед',
          'Доставка Мопед',
          'Доставка Самокат',
          'Доставка Авто'
        )
    `);
  }
}
