import { TariffDeletion1710000000033 } from "../../src/database/migrations/1710000000033-TariffDeletion";
import { randomUUID } from "node:crypto";
import { Currency, ServiceType } from "@dos/shared-types";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, IsNull } from "typeorm";
import { databaseEntities } from "../../src/database/entities";
import { AdminService } from "../../src/modules/admin/admin.service";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { TariffEntity } from "../../src/modules/admin/entities/tariff.entity";
import { AdminActivityLogEntity } from "../../src/modules/admin/entities/admin-activity-log.entity";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { OrdersService } from "../../src/modules/orders/orders.service";
import { PaymentsService } from "../../src/modules/payments/payments.service";
import { DispatchService } from "../../src/modules/dispatch/dispatch.service";
import { NotificationsService } from "../../src/modules/notifications/notifications.service";

describe("tariff creation with service and registered admin subjects", () => {
  const schema = `tariff_creator_test_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource;
  let admin: AdminService;
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Use a test database");
    db = new DataSource({
      type: "postgres",
      url,
      schema,
      entities: databaseEntities,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    const runner = db.createQueryRunner();
    await runner.query("ALTER TABLE tariffs DROP COLUMN deleted_at");
    await new TariffDeletion1710000000033().up(runner);
    await runner.release();
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DataSource, useValue: db },
        ...databaseEntities.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: db.getRepository(entity),
        })),
        ...[
          OrdersService,
          PaymentsService,
          DispatchService,
          NotificationsService,
        ].map((service) => ({ provide: service, useValue: {} })),
      ],
    }).compile();
    admin = module.get(AdminService);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  it("creates city defaults and a manual tariff for a service identity, retaining audit and idempotency", async () => {
    const subject = randomUUID();
    const city = await admin.createCity(subject, {
      nameRu: "Аральск",
      nameKk: "Арал",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
    });
    const defaults = await db
      .getRepository(TariffEntity)
      .findBy({ cityId: city.id });
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults.every((tariff) => tariff.createdById === null)).toBe(true);
    const dto = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      vehicleClass: "economy",
      nameRu: "Тест",
      nameKk: "Тест",
      basePrice: 500,
      pricePerKm: 100,
      pricePerMinute: 20,
      minimumPrice: 500,
      currency: Currency.KZT,
    };
    const key = randomUUID();
    const tariff = await admin.createTariff(subject, dto, key);
    expect(tariff.createdById).toBeNull();
    expect((await admin.createTariff(subject, dto, key)).id).toBe(tariff.id);
    const activity = await db
      .getRepository(AdminActivityLogEntity)
      .findOneByOrFail({ entityId: tariff.id, action: "tariff.created" });
    expect(activity.actorId).toBeNull();
    expect(activity.metadata).toMatchObject({
      actorSubject: subject,
      requestKey: `${subject}:${key}`,
    });
    expect(
      await db.getRepository(TariffEntity).countBy({
        cityId: city.id,
        serviceType: ServiceType.TAXI,
        vehicleClass: "economy",
        isActive: true,
      }),
    ).toBe(1);
  });
  it("retains genuine user attribution for registered admins", async () => {
    const user = await db
      .getRepository(UserEntity)
      .save({ phone: "+77000009876", name: "Test admin" });
    const city = await db.getRepository(CityEntity).save({
      nameRu: "Тест",
      nameKk: "Тест",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
    });
    const tariff = await admin.createTariff(user.id, {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      vehicleClass: "economy",
      nameRu: "Тест",
      nameKk: "Тест",
      basePrice: 500,
      pricePerKm: 100,
      pricePerMinute: 20,
      minimumPrice: 500,
      currency: Currency.KZT,
    });
    expect(tariff.createdById).toBe(user.id);
    const otherCityTariff = await db
      .getRepository(TariffEntity)
      .findOneByOrFail({ nameRu: "Тест", createdById: IsNull() });
    await Promise.all([
      admin.deleteTariff(tariff.id, user.id),
      admin.deleteTariff(tariff.id, user.id),
    ]);
    expect(
      await db.getRepository(TariffEntity).findOneBy({ id: tariff.id }),
    ).toBeNull();
    expect(
      (await admin.listTariffs({ cityId: city.id })).some(
        (row) => row.id === tariff.id,
      ),
    ).toBe(false);
    const retained = await db
      .getRepository(TariffEntity)
      .findOne({ where: { id: tariff.id }, withDeleted: true });
    expect(retained?.deletedAt).toBeInstanceOf(Date);
    expect(retained?.isActive).toBe(false);
    expect(retained?.basePrice).toBe(tariff.basePrice);
    expect(
      await db
        .getRepository(TariffEntity)
        .findOneBy({ id: otherCityTariff.id }),
    ).not.toBeNull();
    expect(
      await db
        .getRepository(AdminActivityLogEntity)
        .countBy({ entityId: tariff.id, action: "tariff.deleted" }),
    ).toBe(1);
    await expect(
      admin.updateTariff(tariff.id, user.id, { isActive: true }),
    ).rejects.toThrow();

    expect(
      (
        await db
          .getRepository(AdminActivityLogEntity)
          .findOneByOrFail({ entityId: tariff.id, action: "tariff.created" })
      ).actorId,
    ).toBe(user.id);
  });
});
