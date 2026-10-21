import { createRequire } from "node:module";
import { balanceTopUpCredit } from "../../src/modules/executors/balance-top-up-credit";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { ExecutorBalanceTopUpEntity } from "../../src/modules/executors/entities/executor-balance-top-up.entity";
import { ConfigService } from "@nestjs/config";
import { PricingService } from "../../src/modules/pricing/pricing.service";
import { CurrencyService } from "../../src/modules/pricing/currency.service";
import { RedisStoreService } from "../../src/shared/cache/redis-store.service";
import { TariffDeletion1710000000033 } from "../../src/database/migrations/1710000000033-TariffDeletion";
import { randomUUID } from "node:crypto";
import { Currency, ServiceType, ExecutorType } from "@dos/shared-types";
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
        ].map((service) => ({
          provide: service,
          useValue:
            service === NotificationsService
              ? { send: jest.fn(async () => {}) }
              : {},
        })),
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
  it("converts KZT topups once using the confirmation rate and keeps confirmed amounts immutable", async () => {
    const actor = randomUUID();
    for (const currency of [Currency.KZT, Currency.RUB]) {
      const city = await admin.createCity(actor, {
        nameRu: "Курс " + currency,
        nameKk: "Бағам",
        countryCode: "KZ",
        currency,
        timezone: "Asia/Almaty",
        rideExchangeRate: "7",
      });
      const user = await db.getRepository(UserEntity).save({
        phone: currency === Currency.RUB ? "+77900000001" : "+77900000002",
      });
      const driver = await db.getRepository(ExecutorEntity).save({
        userId: user.id,
        cityId: city.id,
        executorType: ExecutorType.DRIVER,
        balance: "0",
      });
      const topup = await db.getRepository(ExecutorBalanceTopUpEntity).save({
        executorId: driver.id,
        amount: "1000.00",
        phone: user.phone,
        status: "pending",
        paymentCurrency: "KZT",
      });
      await Promise.all([
        admin.updateExecutorBalanceTopUp(
          topup.id,
          { status: "confirmed" },
          actor,
        ),
        admin.updateExecutorBalanceTopUp(
          topup.id,
          { status: "confirmed" },
          actor,
        ),
      ]);
      const credited = currency === Currency.RUB ? "142.86" : "1000.00";
      expect(
        (
          await db
            .getRepository(ExecutorEntity)
            .findOneByOrFail({ id: driver.id })
        ).balance,
      ).toBe(credited);
      const saved = await db
        .getRepository(ExecutorBalanceTopUpEntity)
        .findOneByOrFail({ id: topup.id });
      expect(saved.amount).toBe("1000.00");
      expect(saved.creditedAmount).toBe(credited);
      expect(saved.creditedCurrency).toBe(currency);
      await admin.updateCity(city.id, { rideExchangeRate: "8" }, actor);
      await admin.updateExecutorBalanceTopUp(
        topup.id,
        { status: "confirmed" },
        actor,
      );
      expect(
        (
          await db
            .getRepository(ExecutorEntity)
            .findOneByOrFail({ id: driver.id })
        ).balance,
      ).toBe(credited);
      await expect(
        admin.updateExecutorBalanceTopUp(
          topup.id,
          { status: "invoiced" },
          actor,
        ),
      ).rejects.toMatchObject({
        response: { code: "BALANCE_TOP_UP_ALREADY_CONFIRMED" },
      });
      await expect(
        admin.updateExecutorBalanceTopUp(
          topup.id,
          { status: "confirmed", amount: 2000 },
          actor,
        ),
      ).rejects.toMatchObject({
        response: { code: "BALANCE_TOP_UP_ALREADY_CONFIRMED" },
      });
      const next = await db.getRepository(ExecutorBalanceTopUpEntity).save({
        executorId: driver.id,
        amount: "1000.00",
        phone: user.phone,
        status: "pending",
      });
      const confirmed = await admin.updateExecutorBalanceTopUp(
        next.id,
        { status: "confirmed" },
        actor,
      );
      expect(confirmed.creditedAmount).toBe(
        currency === Currency.RUB ? "125.00" : "1000.00",
      );
      expect(saved.exchangeRate).toBe(
        currency === Currency.RUB ? "7.0000" : "1.0000",
      );
    }
  });
  it("corrects one inspected legacy FX overcredit by delta and refuses a repeated debit", async () => {
    const city = await db.getRepository(CityEntity).save({
      nameRu: "Байконур",
      nameKk: "Байқоңыр",
      countryCode: "KZ",
      currency: Currency.RUB,
      timezone: "Asia/Almaty",
      rideExchangeRate: "7",
      rideManualPricePolicy: {
        rubMinimum: "90.00",
        kztMinimum: "500.00",
        kztThreshold: "500.00",
      },
    });
    const user = await db
      .getRepository(UserEntity)
      .save({ phone: "+77900000003" });
    const driver = await db.getRepository(ExecutorEntity).save({
      userId: user.id,
      cityId: city.id,
      executorType: ExecutorType.DRIVER,
      balance: "995.00",
    });
    const topup = await db.getRepository(ExecutorBalanceTopUpEntity).save({
      executorId: driver.id,
      amount: "1000.00",
      phone: user.phone,
      status: "confirmed",
      confirmedAt: new Date(),
    });
    const { correctTopupFx } =
      createRequire(__filename)("../../../../deploy/vps/scripts/correct-topup-fx.cjs") as {
        correctTopupFx: (
          db: unknown,
          expected: Record<string, string>,
          convert: typeof balanceTopUpCredit,
        ) => Promise<Record<string, unknown>>;
      };
    const runner = db.createQueryRunner();
    await runner.connect();
    const client = {
      query: async (sql: string, values?: unknown[]) => ({
        rows: (await runner.query(sql, values, true)).records,
      }),
    };
    const expected = {
      topupId: topup.id,
      executorId: driver.id,
      amount: "1000.00",
      rate: "7",
    };
    try {
      await expect(
        correctTopupFx(
          client,
          { ...expected, amount: "2000.00" },
          balanceTopUpCredit,
        ),
      ).rejects.toThrow();
      const result = await correctTopupFx(client, expected, balanceTopUpCredit);
      expect(result).toMatchObject({
        delta: "-857.14",
        balance: "137.86",
        creditedAmount: "142.86",
      });
      expect(
        (await correctTopupFx(client, expected, balanceTopUpCredit))
          .alreadyCorrected,
      ).toBe(true);
    } finally {
      await runner.release();
    }
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: driver.id })
      ).balance,
    ).toBe("137.86");
    expect(
      (
        await db
          .getRepository(ExecutorBalanceTopUpEntity)
          .findOneByOrFail({ id: topup.id })
      ).amount,
    ).toBe("1000.00");
    expect(
      await db
        .getRepository(AdminActivityLogEntity)
        .countBy({ entityId: driver.id }),
    ).toBe(1);
  });
  it("persists editable KZT minima and restricts the separate RUB minimum to Baikonur", async () => {
    const actor = randomUUID();
    const city = await admin.createCity(actor, {
      nameRu: "Город минимума",
      nameKk: "Қала",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      rideMinimumOrderKzt: "600",
    });
    await admin.updateCity(city.id, { rideMinimumOrderKzt: "850" }, actor);
    expect(
      (await db.getRepository(CityEntity).findOneByOrFail({ id: city.id }))
        .rideMinimumOrderKzt,
    ).toBe("850.00");
    await expect(
      admin.updateCity(city.id, { rideMinimumOrderRub: "100" }, actor),
    ).rejects.toMatchObject({
      response: { code: "CITY_RUB_MINIMUM_NOT_ALLOWED" },
    });
    const rub = await db.getRepository(CityEntity).save({
      nameRu: "Байконур",
      nameKk: "Байқоңыр",
      countryCode: "KZ",
      currency: Currency.RUB,
      timezone: "Asia/Almaty",
      rideManualPricePolicy: {
        rubMinimum: "90.00",
        kztMinimum: "500.00",
        kztThreshold: "500.00",
      },
    });
    await admin.updateCity(
      rub.id,
      { rideMinimumOrderRub: "100", rideMinimumOrderKzt: "900" },
      actor,
    );
    const saved = await db
      .getRepository(CityEntity)
      .findOneByOrFail({ id: rub.id });
    expect(saved.rideManualPricePolicy!.rubMinimum).toBe("100.00");
    expect(saved.rideMinimumOrderKzt).toBe("900.00");
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
  it("hides removed classes from estimates despite economy fallback and stale cache, and permits intentional recreation", async () => {
    const subject = randomUUID();
    const city = await admin.createCity(subject, {
      nameRu: "Тарифы",
      nameKk: "Тарифтер",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
    });
    const tariffs = db.getRepository(TariffEntity);
    const economy = await tariffs.findOneByOrFail({
      cityId: city.id,
      vehicleClass: "economy",
    });
    const cached = { tariff: economy, vehicleMultiplier: 1.4 };
    const cache = {
      getJson: jest.fn(async (key: string) =>
        key.startsWith("pricing:") ? cached : null,
      ),
      setJson: jest.fn(),
    } as unknown as RedisStoreService;
    const pricing = new PricingService(
      db.getRepository(CityEntity),
      tariffs,
      cache,
      { getRate: jest.fn(async () => 1) } as unknown as CurrencyService,
      new ConfigService(),
    );
    const params = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      distanceMeters: 1000,
      durationSeconds: 120,
    };
    for (const carClass of ["comfort", "comfort_plus", "business"]) {
      const tariff = await tariffs.findOneByOrFail({
        cityId: city.id,
        vehicleClass: carClass,
      });
      await admin.deleteTariff(tariff.id, subject);
      await expect(
        pricing.estimate({ ...params, carClass }),
      ).rejects.toMatchObject({ response: { code: "TARIFF_NOT_FOUND" } });
    }
    expect(
      (await pricing.estimate({ ...params, carClass: "economy" })).tariffId,
    ).toBe(economy.id);
    const recreated = await admin.createTariff(subject, {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      vehicleClass: "comfort",
      nameRu: "Новый комфорт",
      nameKk: "Жаңа комфорт",
      basePrice: 500,
      pricePerKm: 100,
      pricePerMinute: 20,
      minimumPrice: 500,
      currency: Currency.KZT,
    });
    expect(
      (await pricing.estimate({ ...params, carClass: "comfort" })).tariffId,
    ).toBe(recreated.id);
  });

  it("offers only configured city classes, rejecting never-created and inactive classes even with cached economy prices", async () => {
    const subject = randomUUID();
    const city = await db.getRepository(CityEntity).save({
      nameRu: "Арал проверка",
      nameKk: "Арал",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
    });
    const dto = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      nameRu: "Тест",
      nameKk: "Тест",
      basePrice: 500,
      pricePerKm: 100,
      pricePerMinute: 20,
      minimumPrice: 500,
      currency: Currency.KZT,
    };
    const economy = await admin.createTariff(subject, {
      ...dto,
      vehicleClass: "economy",
    });
    const together = await admin.createTariff(subject, {
      ...dto,
      vehicleClass: "together",
      basePrice: 450,
    });
    await admin.createTariff(subject, {
      ...dto,
      vehicleClass: "comfort_plus",
      isActive: false,
    });
    const cache = {
      getJson: jest.fn(async (key: string) =>
        key.startsWith("pricing:")
          ? { tariff: economy, vehicleMultiplier: 1.55 }
          : null,
      ),
      setJson: jest.fn(),
    } as unknown as RedisStoreService;
    const pricing = new PricingService(
      db.getRepository(CityEntity),
      db.getRepository(TariffEntity),
      cache,
      { getRate: jest.fn(async () => 1) } as unknown as CurrencyService,
      new ConfigService(),
    );
    const params = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      distanceMeters: 1000,
      durationSeconds: 120,
    };
    for (const carClass of ["comfort", "comfort_plus", "business", "child"]) {
      await expect(
        pricing.estimate({ ...params, carClass }),
      ).rejects.toMatchObject({ response: { code: "TARIFF_NOT_FOUND" } });
    }
    expect(
      (await pricing.estimate({ ...params, carClass: "economy" })).tariffId,
    ).toBe(economy.id);
    expect(
      (await pricing.estimate({ ...params, carClass: "together" })).tariffId,
    ).toBe(together.id);
    const business = await admin.createTariff(subject, {
      ...dto,
      vehicleClass: "business",
    });
    expect(
      (await pricing.estimate({ ...params, carClass: "business" })).tariffId,
    ).toBe(business.id);
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
