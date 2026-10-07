import { randomUUID } from "node:crypto";
import {
  Currency,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";

import { databaseEntities } from "../../src/database/entities";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { DeliveryDetailEntity } from "../../src/modules/delivery/entities/delivery-detail.entity";
import { DispatchQueueService } from "../../src/modules/dispatch/dispatch-queue.service";
import { KaspiService } from "../../src/modules/payments/kaspi/kaspi.service";
import { DriverBonusesService } from "../../src/modules/executors/driver-bonuses.service";
import { DriverBonusSettingEntity } from "../../src/modules/executors/entities/driver-bonus-setting.entity";
import { DriverBonusPayoutEntity } from "../../src/modules/executors/entities/driver-bonus-payout.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { ExecutorsController } from "../../src/modules/executors/executors.controller";
import { ExecutorsService } from "../../src/modules/executors/executors.service";
import { GeoService } from "../../src/modules/geo/geo.service";
import { NotificationsService } from "../../src/modules/notifications/notifications.service";
import { OrderEntity } from "../../src/modules/orders/entities/order.entity";
import { OrderStatusEventEntity } from "../../src/modules/orders/entities/order-status-event.entity";
import { RoutePointEntity } from "../../src/modules/orders/entities/route-point.entity";
import { OrderChatService } from "../../src/modules/orders/order-chat.service";
import { OrdersController } from "../../src/modules/orders/orders.controller";
import { OrdersRealtimeService } from "../../src/modules/orders/orders-realtime.service";
import { OrdersService } from "../../src/modules/orders/orders.service";
import { PricingService } from "../../src/modules/pricing/pricing.service";
import { PromoCodeEntity } from "../../src/modules/promo-codes/entities/promo-code.entity";
import { PromoCodesService } from "../../src/modules/promo-codes/promo-codes.service";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

// Real PostgreSQL, isolated schema in an explicitly named test database.
describe("Promo redemption and driver bonus progress", () => {
  let db: DataSource;
  let app: INestApplication;
  let orders: OrdersService;
  let promos: PromoCodesService;
  let client: UserEntity;
  let driver: UserEntity;
  let city: CityEntity;
  const schema = `promo_test_${randomUUID().replaceAll("-", "")}`;
  const estimate = {
    tariffId: randomUUID(),
    serviceType: ServiceType.TAXI,
    vehicleClass: "economy",
    estimatedPrice: 1200,
    basePrice: 1200,
    surchargeAmount: 0,
    currency: Currency.KZT,
    surgeCoefficient: 1,
    nightCoefficient: 1,
    distanceMeters: 2000,
    durationSeconds: 300,
    etaSeconds: 300,
  };
  const pricing = {
    estimate: jest.fn(async () => estimate),
    calculateExecutorCommission: jest.fn(async () => ({
      amount: 120,
      percent: 10,
      fixed: 0,
      currency: Currency.KZT,
      tariffId: estimate.tariffId,
    })),
  };
  const dispatch = { enqueueDispatchOrder: jest.fn() };
  const routePoints = [
    { sequenceIndex: 0, lat: 43.23, lng: 76.9, address: "A" },
    { sequenceIndex: 1, lat: 43.24, lng: 76.91, address: "B" },
  ];

  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Use an isolated _test database");
    db = new DataSource({
      type: "postgres",
      url,
      schema,
      entities: databaseEntities,
      synchronize: false,
      extra: { options: `-c search_path=${schema},public` },
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    const repo = <T extends import("typeorm").ObjectLiteral>(
      entity: import("typeorm").EntityTarget<T>,
    ) => db.getRepository(entity);
    promos = new PromoCodesService(repo(PromoCodeEntity), repo(OrderEntity));
    const bonuses = new DriverBonusesService(
      repo(ExecutorEntity),
      repo(OrderEntity),
      repo(DriverBonusSettingEntity),
    );
    orders = new OrdersService(
      repo(CityEntity),
      repo(OrderEntity),
      repo(RoutePointEntity),
      repo(OrderStatusEventEntity),
      repo(DeliveryDetailEntity),
      repo(ExecutorEntity),
      repo(DriverBonusSettingEntity),
      repo(DriverBonusPayoutEntity),
      repo(UserEntity),
      {} as GeoService,
      pricing as unknown as PricingService,
      {
        send: jest.fn(),
        sendSms: jest.fn(),
      } as unknown as NotificationsService,
      { emitOrderStatusChanged: jest.fn() } as unknown as OrdersRealtimeService,
      dispatch as unknown as DispatchQueueService,
      promos,
    );
    const module = await Test.createTestingModule({
      controllers: [OrdersController, ExecutorsController],
      providers: [
        { provide: OrderChatService, useValue: {} },
        { provide: OrdersService, useValue: orders },
        { provide: ExecutorsService, useValue: {} },
        { provide: DriverBonusesService, useValue: bonuses },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const id = req.headers["x-user-id"];
          if (!id) throw new UnauthorizedException();
          req.user = { sub: id, role: "client" };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  beforeEach(async () => {
    await db.query(
      `TRUNCATE "${schema}"."orders", "${schema}"."promo_codes", "${schema}"."users", "${schema}"."cities", "${schema}"."driver_bonus_settings" CASCADE`,
    );
    client = await db.getRepository(UserEntity).save({ phone: "+77000000101" });
    driver = await db.getRepository(UserEntity).save({ phone: "+77000000102" });
    city = await db
      .getRepository(CityEntity)
      .save({
        nameRu: "Алматы",
        nameKk: "Алматы",
        countryCode: "KZ",
        currency: Currency.KZT,
        timezone: "Asia/Almaty",
        isActive: true,
      });
    pricing.estimate.mockResolvedValue(estimate);
    dispatch.enqueueDispatchOrder.mockClear();
  });
  async function coupon(values: Partial<PromoCodeEntity> = {}) {
    return db
      .getRepository(PromoCodeEntity)
      .save({
        code: "WELCOME",
        discountType: "fixed",
        discountValue: "200",
        isActive: true,
        maxUses: null,
        validTo: null,
        ...values,
      });
  }
  function draft() {
    return db
      .getRepository(OrderEntity)
      .create({
        clientId: client.id,
        cityId: city.id,
        serviceType: ServiceType.TAXI,
        status: OrderStatus.DRAFT,
        currency: Currency.KZT,
        estimatedPrice: "1200.00",
        paymentMethod: PaymentMethod.CASH,
      });
  }
  function body() {
    return {
      cityId: city.id,
      serviceType: "taxi",
      carClass: "economy",
      paymentMethod: "cash",
      distanceMeters: 2000,
      durationSeconds: 300,
      routePoints,
    };
  }

  it("previews a case-insensitive promo without consuming a use", async () => {
    await coupon({ discountType: "percent", discountValue: "25", maxUses: 1 });
    for (let i = 0; i < 2; i++) {
      const result = await request(app.getHttpServer())
        .post("/api/v1/orders/estimate")
        .set("x-user-id", client.id)
        .send({
          cityId: city.id,
          serviceType: "taxi",
          carClass: "economy",
          distanceMeters: 2000,
          durationSeconds: 300,
          routePoints: routePoints.map((point) => ({
            lat: point.lat,
            lng: point.lng,
            address: point.address,
          })),
          promoCode: " welcome ",
        });
      expect(result.status).toBe(201);
      expect(result.body).toMatchObject({
        originalPrice: 1200,
        estimatedPrice: 900,
        discountAmount: 300,
      });
    }
    expect(await db.getRepository(OrderEntity).count()).toBe(0);
  });
  it("creates a discounted order and retains the promo for admin analytics", async () => {
    const promo = await coupon();
    const result = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("x-user-id", client.id)
      .send({ ...body(), promoCode: "welcome" });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      estimatedPrice: "1000.00",
      discountAmount: "200.00",
      promoCodeId: promo.id,
      status: "searching",
    });
    expect(dispatch.enqueueDispatchOrder).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid, disabled, expired and exhausted promos before persisting an order", async () => {
    const cases = [
      { values: null, code: "PROMO_CODE_NOT_FOUND" },
      { values: { isActive: false }, code: "PROMO_CODE_INACTIVE" },
      {
        values: { validTo: new Date(Date.now() - 1000) },
        code: "PROMO_CODE_EXPIRED",
      },
      { values: { maxUses: 1 }, code: "PROMO_CODE_LIMIT_REACHED" },
    ];
    for (const test of cases) {
      if (test.values) {
        const promo = await coupon(test.values);
        if (test.code.endsWith("LIMIT_REACHED"))
          await db
            .getRepository(OrderEntity)
            .save({ ...draft(), promoCodeId: promo.id });
      }
      const before = await db.getRepository(OrderEntity).count();
      const result = await request(app.getHttpServer())
        .post("/api/v1/orders")
        .set("x-user-id", client.id)
        .send({ ...body(), promoCode: "WELCOME" });
      expect(result.status).toBe(400);
      expect(result.body.code).toBe(test.code);
      expect(await db.getRepository(OrderEntity).count()).toBe(before);
      await db
        .getRepository(OrderEntity)
        .delete({
          promoCodeId:
            (
              await db
                .getRepository(PromoCodeEntity)
                .findOne({ where: { code: "WELCOME" } })
            )?.id ?? randomUUID(),
        });
      await db.getRepository(PromoCodeEntity).delete({ code: "WELCOME" });
    }
    expect(dispatch.enqueueDispatchOrder).not.toHaveBeenCalled();
  });
  it("limits concurrent redemptions with a real PostgreSQL row lock", async () => {
    await coupon({ maxUses: 1 });
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => promos.saveOrder(draft(), "WELCOME")),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await db.getRepository(OrderEntity).count()).toBe(1);
  });
  it("caps the discount at the fare and never creates a negative price", async () => {
    await coupon({ discountValue: "2000" });
    const order = await promos.saveOrder(draft(), "WELCOME");
    expect(order.estimatedPrice).toBe("0.00");
    expect(order.discountAmount).toBe("1200.00");
  });
  it("preserves the redeemed discount when the taxi meter calculates the final fare", async () => {
    await coupon();
    const order = await promos.saveOrder(draft(), "WELCOME");
    await db
      .getRepository(OrderEntity)
      .update(order.id, {
        status: OrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      });
    await db
      .getRepository(RoutePointEntity)
      .save(routePoints.map((point) => ({ ...point, orderId: order.id })));
    pricing.estimate.mockResolvedValue({ ...estimate, estimatedPrice: 2000 });
    const completed = await orders.transition(
      order.id,
      OrderStatus.COMPLETED,
      client.id,
      { actualDistanceMeters: 2000 },
    );
    expect(completed.finalPrice).toBe("1800.00");
    expect(completed.discountAmount).toBe("200.00");
  });
  it("returns current bonus conditions and counts only the driver's completed orders", async () => {
    const executor = await db
      .getRepository(ExecutorEntity)
      .save({
        userId: driver.id,
        cityId: city.id,
        executorType: ExecutorType.DRIVER,
      });
    await db
      .getRepository(DriverBonusSettingEntity)
      .save({
        key: "default",
        isEnabled: true,
        ordersRequired: 20,
        bonusAmount: "5000",
      });
    await db
      .getRepository(OrderEntity)
      .save(
        Array.from({ length: 7 }, () => ({
          ...draft(),
          executorId: executor.id,
          status: OrderStatus.COMPLETED,
        })),
      );
    await db
      .getRepository(OrderEntity)
      .save({
        ...draft(),
        executorId: executor.id,
        status: OrderStatus.CANCELLED_CLIENT,
      });
    const result = await request(app.getHttpServer())
      .get("/api/v1/executor/bonuses/progress")
      .set("x-user-id", driver.id);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      isEnabled: true,
      ordersRequired: 20,
      bonusAmount: 5000,
      completedInCycle: 7,
      remainingOrders: 13,
      totalCompletedOrders: 7,
      nextThreshold: 20,
    });
    expect(
      (
        await request(app.getHttpServer())
          .get("/api/v1/executor/bonuses/progress")
          .set("x-user-id", client.id)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer()).get(
          "/api/v1/executor/bonuses/progress",
        )
      ).status,
    ).toBe(401);
  });
  it("keeps concurrent Kaspi credits, commissions and a single milestone bonus", async () => {
    const executor = await db.getRepository(ExecutorEntity).save({
      userId: driver.id,
      cityId: city.id,
      executorType: ExecutorType.DRIVER,
      verificationStatus: "verified",
      balance: "1000.00",
    });
    await db.getRepository(DriverBonusSettingEntity).save({
      key: "default",
      isEnabled: true,
      ordersRequired: 2,
      bonusAmount: "700.00",
    });
    const rides = await db.getRepository(OrderEntity).save(
      Array.from({ length: 2 }, () => ({
        ...draft(),
        executorId: executor.id,
        status: OrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      })),
    );
    await db
      .getRepository(RoutePointEntity)
      .save(
        rides.flatMap((ride) =>
          routePoints.map((point) => ({ ...point, orderId: ride.id })),
        ),
      );
    const results = await Promise.all([
      ...rides.map((ride) =>
        orders.transition(ride.id, OrderStatus.COMPLETED, client.id, {
          actualDistanceMeters: 2000,
        }),
      ),
      new KaspiService(db).handle({
        command: "pay",
        txn_id: "123456789012345678",
        account: driver.phone.slice(1),
        sum: "5000.00",
        txn_date: "20261007140000",
      }),
    ]);
    expect(results[2]).toMatchObject({ result: 0 });
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: executor.id })
      ).balance,
    ).toBe("6460.00");
    expect(await db.getRepository(DriverBonusPayoutEntity).count()).toBe(1);
  });
  it("starts the next bonus cycle at a completed milestone", async () => {
    const executor = await db
      .getRepository(ExecutorEntity)
      .save({
        userId: driver.id,
        cityId: city.id,
        executorType: ExecutorType.DRIVER,
      });
    await db
      .getRepository(DriverBonusSettingEntity)
      .save({
        key: "default",
        isEnabled: true,
        ordersRequired: 2,
        bonusAmount: "700",
      });
    await db
      .getRepository(OrderEntity)
      .save(
        Array.from({ length: 2 }, () => ({
          ...draft(),
          executorId: executor.id,
          status: OrderStatus.COMPLETED,
        })),
      );
    const result = await request(app.getHttpServer())
      .get("/api/v1/executor/bonuses/progress")
      .set("x-user-id", driver.id);
    expect(result.body).toMatchObject({
      completedInCycle: 0,
      remainingOrders: 2,
      totalCompletedOrders: 2,
      nextThreshold: 4,
    });
  });
  it("persists the selected special tariff instead of replacing it with the driver's car class", async () => {
    const created = await orders.createOrder(client.id, {
      serviceType: ServiceType.TAXI,
      paymentMethod: PaymentMethod.CASH,
      cityId: city.id,
      carClass: "together",
      routePoints,
      distanceMeters: 2000,
      durationSeconds: 300,
    });
    const stored = await db
      .getRepository(OrderEntity)
      .findOneByOrFail({ id: created.id });
    expect(stored.carClass).toBe("together");
    const executor = await db
      .getRepository(ExecutorEntity)
      .save({
        userId: driver.id,
        cityId: city.id,
        executorType: ExecutorType.DRIVER,
        carClass: "economy",
      });
    await db
      .getRepository(OrderEntity)
      .update(created.id, { executorId: executor.id });
    expect((await orders.getOrder(client.id, created.id)).carClass).toBe(
      "together",
    );
  });
});
