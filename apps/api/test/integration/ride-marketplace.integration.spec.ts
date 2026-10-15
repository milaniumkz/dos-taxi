import { RideMarketplaceGuard } from "../../src/modules/ride-marketplace/ride-marketplace.guard";
import requestHttp from "supertest";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtStrategy } from "../../src/modules/auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { RideMarketplaceController } from "../../src/modules/ride-marketplace/ride-marketplace.controller";
import { GlobalExceptionFilter } from "../../src/shared/filters/global-exception.filter";
import { randomUUID } from "node:crypto";
import {
  UserRole,
  Currency,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { databaseEntities } from "../../src/database/entities";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { ExecutorLocationEntity } from "../../src/modules/executors/entities/executor-location.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { DriverBonusSettingEntity } from "../../src/modules/executors/entities/driver-bonus-setting.entity";
import { DriverBonusPayoutEntity } from "../../src/modules/executors/entities/driver-bonus-payout.entity";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { OrderEntity } from "../../src/modules/orders/entities/order.entity";
import { OrdersService } from "../../src/modules/orders/orders.service";
import { OrdersRealtimeService } from "../../src/modules/orders/orders-realtime.service";
import { PricingService } from "../../src/modules/pricing/pricing.service";
import { GeoService } from "../../src/modules/geo/geo.service";
import { NotificationsService } from "../../src/modules/notifications/notifications.service";
import { DispatchQueueService } from "../../src/modules/dispatch/dispatch-queue.service";
import { PromoCodesService } from "../../src/modules/promo-codes/promo-codes.service";
import { RideMarketplaceService } from "../../src/modules/ride-marketplace/ride-marketplace.service";
import { RidePriceOfferEntity } from "../../src/modules/ride-marketplace/entities/ride-price-offer.entity";

describe("Negotiated ride marketplace (real PostgreSQL)", () => {
  const schema = `rides_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource,
    market: RideMarketplaceService,
    orders: OrdersService,
    city: CityEntity;
  const notifications = {
    send: jest.fn(async () => {}),
    sendSms: jest.fn(async () => {}),
  };
  const dispatch = { enqueueDispatchOrder: jest.fn() };
  const pricing = {
    estimate: jest.fn(),
    calculateExecutorCommission: jest.fn(),
  };
  let app: INestApplication;
  const jwt = new JwtService({ secret: "test-ride-secret" });
  const token = (sub: string, role: UserRole) => jwt.sign({ sub, role });
  let sequence = 10000;
  async function user() {
    return db.getRepository(UserEntity).save({
      phone: `+7700${(++sequence).toString().padStart(7, "0")}`,
      name: "Тест",
    });
  }
  async function driver(cityId = city.id) {
    const u = await user();
    return db.getRepository(ExecutorEntity).save({
      userId: u.id,
      executorType: ExecutorType.DRIVER,
      isOnline: true,
      verificationStatus: "verified",
      cityId,
      balance: "1000",
      passengerCapacity: 4,
    });
  }
  const points = [
    { lat: 46.80123, lng: 61.675111, address: "станция Аральское море" },
    { lat: 46.813356, lng: 61.644856, address: "Толе Би 38" },
  ];
  async function request(
    clientId: string,
    opts: Partial<{
      passengerCount: number;
      priceSteps: number;
      needsChildSeat: boolean;
      sharedRide: boolean;
    }> = {},
  ) {
    const base = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      routePoints: points,
      passengerCount: opts.passengerCount ?? 1,
    };
    const quote = await market.quote(base);
    const dto = {
      ...base,
      priceSteps: opts.priceSteps ?? 0,
      paymentMethod: PaymentMethod.CASH,
      termsKey: quote.termsKey,
      pickupEntrance: "2",
      pickupComment: "У ворот",
      needsChildSeat: opts.needsChildSeat ?? false,
      sharedRide: opts.sharedRide ?? false,
    };
    const key = randomUUID();
    const order = await market.create(clientId, dto, key);
    return { order, dto, key };
  }
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Test DB only");
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
    const module = await Test.createTestingModule({
      controllers: [RideMarketplaceController],
      providers: [
        RideMarketplaceGuard,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "test-ride-secret" }),
        },
        OrdersService,
        RideMarketplaceService,
        { provide: DataSource, useValue: db },
        ...databaseEntities.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: db.getRepository(entity),
        })),
        {
          provide: OrdersRealtimeService,
          useValue: { emitOrderStatusChanged: jest.fn() },
        },
        { provide: NotificationsService, useValue: notifications },
        { provide: DispatchQueueService, useValue: dispatch },
        { provide: PricingService, useValue: pricing },
        {
          provide: GeoService,
          useValue: {
            reverse: jest.fn(async () => ({
              title: "улица",
              subtitle: "Аральск",
              lat: 46.8,
              lng: 61.67,
            })),
          },
        },
        { provide: PromoCodesService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    market = module.get(RideMarketplaceService);
    orders = module.get(OrdersService);
    city = await db.getRepository(CityEntity).save({
      nameRu: "Аральск",
      nameKk: "Арал",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
    });
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  it("quotes 500 KZT per seat and 7 KZT/RUB; salon hides quantity", async () => {
    const quote = await market.quote({
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      routePoints: points,
      passengerCount: 2,
    });
    expect(quote.minimumOrderPrice).toBe("1000.00");
    expect(quote.minimumUnitPrice).toBe("500.00");
    for (const count of [1, 2, 3]) {
      const seats = await market.quote({
        cityId: city.id,
        serviceType: ServiceType.TAXI,
        routePoints: points,
        passengerCount: count,
      });
      expect(seats.minimumUnitPrice).toBe("500.00");
      expect(seats.minimumOrderPrice).toBe((500 * count).toFixed(2));
    }
    const rub = await db.getRepository(CityEntity).save({
      nameRu: "Байконур",
      nameKk: "Байқоңыр",
      countryCode: "KZ",
      currency: Currency.RUB,
      timezone: "Asia/Almaty",
      isActive: true,
      ridePricingBasis: "salon",
    });
    const rubQuote = await market.quote({
      cityId: rub.id,
      serviceType: ServiceType.TAXI,
      routePoints: points,
      passengerCount: 4,
    });
    expect(rubQuote.minimumOrderPrice).toBe("71.43");
    expect(rubQuote.passengerCount).toBe(1);
    expect(rubQuote.pricingBasis).toBe("salon");
    await db
      .getRepository(CityEntity)
      .update(rub.id, { ridePricingBasis: "seat" });
    const rubSeats = await market.quote({
      cityId: rub.id,
      serviceType: ServiceType.TAXI,
      routePoints: points,
      passengerCount: 2,
    });
    expect(rubSeats.minimumUnitPrice).toBe("71.43");
    expect(rubSeats.minimumOrderPrice).toBe("142.86");
  });
  it("retains approved legacy drivers and resolves their missing city from fresh presence", async () => {
    const d = await driver();
    await db.getRepository(ExecutorEntity).update(d.id, { cityId: null });
    await db
      .getRepository(ExecutorLocationEntity)
      .save({ executorId: d.id, lat: 46.80123, lng: 61.675111 });
    await market.feed(d.userId, { lat: 46.80123, lng: 61.675111 });
    expect(
      await db.getRepository(ExecutorEntity).findOneByOrFail({ id: d.id }),
    ).toMatchObject({
      cityId: city.id,
      verificationStatus: "verified",
      isOnline: true,
    });
    await db.getRepository(ExecutorEntity).update(d.id, { isOnline: false });
    await expect(
      market.feed(d.userId, { lat: 46.8, lng: 61.67 }),
    ).rejects.toMatchObject({ response: { code: "RIDE_DRIVER_OFFLINE" } });
    await db
      .getRepository(ExecutorEntity)
      .update(d.id, {
        isOnline: true,
        verificationStatus: "pending",
        cityId: null,
      });
    await expect(
      market.feed(d.userId, { lat: 46.8, lng: 61.67 }),
    ).rejects.toMatchObject({ response: { code: "EXECUTOR_NOT_VERIFIED" } });
    expect(
      (await db.getRepository(ExecutorEntity).findOneByOrFail({ id: d.id }))
        .cityId,
    ).toBeNull();
  });
  it("does not guess a legacy driver's city from a default map coordinate or stale GPS", async () => {
    const d = await driver();
    await db.getRepository(ExecutorEntity).update(d.id, { cityId: null });
    await expect(
      market.feed(d.userId, { lat: 46.8, lng: 61.67 }),
    ).rejects.toMatchObject({
      response: { code: "RIDE_DRIVER_CITY_REQUIRED" },
    });
    await db
      .getRepository(ExecutorLocationEntity)
      .save({ executorId: d.id, lat: 46.80123, lng: 61.675111 });
    await db.query(
      "UPDATE executor_locations SET updated_at=now()-interval '1 hour' WHERE executor_id=$1",
      [d.id],
    );
    await expect(
      market.feed(d.userId, { lat: 46.8, lng: 61.67 }),
    ).rejects.toMatchObject({
      response: { code: "RIDE_DRIVER_CITY_REQUIRED" },
    });
    expect(
      (await db.getRepository(ExecutorEntity).findOneByOrFail({ id: d.id }))
        .verificationStatus,
    ).toBe("verified");
  });
  it("creates an idempotent unassigned request and sorts feed by pickup distance", async () => {
    const client = await user();
    const { order, dto, key } = await request(client.id, {
      passengerCount: 2,
      priceSteps: 1,
      sharedRide: true,
    });
    expect(order.estimatedPrice).toBe("1100.00");
    expect(order.executorId).toBeNull();
    expect(order.isNegotiated).toBe(true);
    expect(order.pickupEntrance).toBe("2");
    expect((await market.create(client.id, dto, key)).id).toBe(order.id);
    const reordered = {
      ...dto,
      routePoints: dto.routePoints.map(({ address, lat, lng }) => ({
        address,
        lng,
        lat,
      })),
    };
    expect((await market.create(client.id, reordered, key)).id).toBe(order.id);
    await expect(
      market.create(client.id, { ...dto, priceSteps: 2 }, key),
    ).rejects.toThrow("IDEMPOTENCY_KEY_REUSED");
    expect(dispatch.enqueueDispatchOrder).not.toHaveBeenCalled();
    const d = await driver();
    const feed = await market.feed(d.userId, { lat: 46.80123, lng: 61.675111 });
    expect(feed.items.some((item) => item.id === order.id)).toBe(true);
    expect(feed.items.map((x) => x.pickupDistanceMeters)).toEqual(
      [...feed.items.map((x) => x.pickupDistanceMeters)].sort((a, b) => a - b),
    );
    await orders.cancelOrder(client.id, order.id);
  });
  it("does not select a driver on proposal; rejects changed version and other passengers", async () => {
    const c = await user(),
      other = await user(),
      d = await driver();
    const { order } = await request(c.id, { needsChildSeat: true });
    await expect(
      market.submit(d.userId, order.id, { priceSteps: 0 }),
    ).rejects.toThrow("RIDE_CHILD_SEAT_REQUIRED");
    const offer = await market.submit(d.userId, order.id, {
      priceSteps: 1,
      hasChildSeat: true,
    });
    expect(
      (await db.getRepository(OrderEntity).findOneByOrFail({ id: order.id }))
        .executorId,
    ).toBeNull();
    expect(
      (
        await market.submit(d.userId, order.id, {
          priceSteps: 1,
          hasChildSeat: true,
        })
      ).version,
    ).toBe(offer.version);
    const revised = await market.submit(d.userId, order.id, {
      priceSteps: 2,
      hasChildSeat: true,
    });
    await expect(
      market.accept(c.id, order.id, offer.id, { version: offer.version }),
    ).rejects.toThrow("RIDE_OFFER_CHANGED");
    await expect(market.listOffers(other.id, order.id)).rejects.toThrow(
      "ORDER_NOT_FOUND",
    );
    const accepted = await market.accept(c.id, order.id, revised.id, {
      version: revised.version,
    });
    expect(accepted.executorId).toBe(d.id);
    expect(accepted.estimatedPrice).toBe("600.00");
    expect(
      (
        await market.accept(c.id, order.id, revised.id, {
          version: revised.version,
        })
      ).id,
    ).toBe(order.id);
    await orders.cancelOrder(c.id, order.id);
  });
  it("allows only one driver to win competing proposals and keeps agreed fare through concurrent completion", async () => {
    const c = await user(),
      d1 = await driver(),
      d2 = await driver();
    const { order } = await request(c.id, { passengerCount: 2 });
    const a = await market.submit(d1.userId, order.id, { priceSteps: 0 });
    const b = await market.submit(d2.userId, order.id, { priceSteps: 1 });
    const outcomes = await Promise.allSettled([
      market.accept(c.id, order.id, a.id, { version: a.version }),
      market.accept(c.id, order.id, b.id, { version: b.version }),
    ]);
    expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const selected = await db
      .getRepository(OrderEntity)
      .findOneByOrFail({ id: order.id });
    const selectedDriver = await db
      .getRepository(ExecutorEntity)
      .findOneByOrFail({ id: selected.executorId! });
    await db.getRepository(DriverBonusSettingEntity).save({
      key: "default",
      isEnabled: true,
      ordersRequired: 1,
      bonusAmount: "100",
    });
    await orders.transition(
      order.id,
      OrderStatus.IN_PROGRESS,
      selectedDriver.userId,
    );
    const finishes = await Promise.allSettled([
      orders.transition(
        order.id,
        OrderStatus.COMPLETED,
        selectedDriver.userId,
        { actualDistanceMeters: 100000 },
      ),
      orders.transition(
        order.id,
        OrderStatus.COMPLETED,
        selectedDriver.userId,
        { actualDistanceMeters: 200000 },
      ),
    ]);
    expect(finishes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const completed = await db
      .getRepository(OrderEntity)
      .findOneByOrFail({ id: order.id });
    expect(completed.finalPrice).toBe(selected.estimatedPrice);
    expect(pricing.estimate).not.toHaveBeenCalled();
    const balance = await db
      .getRepository(ExecutorEntity)
      .findOneByOrFail({ id: selectedDriver.id });
    expect(Number(balance.balance)).toBe(
      1100 - Number(selected.estimatedPrice) * 0.1,
    );
    expect(
      await db
        .getRepository(DriverBonusPayoutEntity)
        .countBy({ orderId: order.id }),
    ).toBe(1);
  });
  it("retries durable notifications after an enqueue failure", async () => {
    const c = await user(),
      d = await driver();
    const { order } = await request(c.id);
    notifications.send.mockRejectedValueOnce(new Error("Redis unavailable"));
    const offer = await market.submit(d.userId, order.id, { priceSteps: 0 });
    expect(
      (
        await db
          .getRepository(RidePriceOfferEntity)
          .findOneByOrFail({ id: offer.id })
      ).notificationSentVersion,
    ).toBe(0);
    await market.flushNotifications();
    expect(
      (
        await db
          .getRepository(RidePriceOfferEntity)
          .findOneByOrFail({ id: offer.id })
      ).notificationSentVersion,
    ).toBe(offer.version);
    await orders.cancelOrder(c.id, order.id);
  });
  it("validates real HTTP roles, price input and transfers through driver selection", async () => {
    const client = await user(),
      d = await driver();
    const base = {
      cityId: city.id,
      serviceType: ServiceType.TAXI,
      routePoints: points,
      passengerCount: 2,
    };
    const http = () => requestHttp(app.getHttpServer());
    const passenger = token(client.id, UserRole.CLIENT),
      executor = token(d.userId, UserRole.EXECUTOR);
    await http().post("/ride-requests/quote").send(base).expect(401);
    await http()
      .post("/ride-requests/quote")
      .auth(executor, { type: "bearer" })
      .send(base)
      .expect(403);
    await http()
      .post("/ride-requests/quote")
      .auth(passenger, { type: "bearer" })
      .send({ ...base, passengerCount: 9 })
      .expect(400);
    const quote = await http()
      .post("/ride-requests/quote")
      .auth(passenger, { type: "bearer" })
      .send(base)
      .expect(200);
    const data = {
      ...base,
      termsKey: quote.body.termsKey,
      priceSteps: 0,
      paymentMethod: PaymentMethod.TRANSFER_KASPI,
    };
    await http()
      .post("/ride-requests")
      .auth(passenger, { type: "bearer" })
      .send({ ...data, price: 100 })
      .expect(400);
    const created = await http()
      .post("/ride-requests")
      .auth(passenger, { type: "bearer" })
      .set("X-Idempotency-Key", randomUUID())
      .send(data)
      .expect(201);
    expect(created.body.estimatedPrice).toBe("1000.00");
    await http()
      .get("/ride-requests/feed")
      .auth(passenger, { type: "bearer" })
      .query({ lat: 46.8, lng: 61.67 })
      .expect(403);
    const proposal = await http()
      .post(`/ride-requests/${created.body.id}/offers`)
      .auth(executor, { type: "bearer" })
      .send({ priceSteps: 1 })
      .expect(201);
    await http()
      .post(
        `/ride-requests/${created.body.id}/offers/${proposal.body.id}/accept`,
      )
      .auth(executor, { type: "bearer" })
      .send({ version: 1 })
      .expect(403);
    const chosen = await http()
      .post(
        `/ride-requests/${created.body.id}/offers/${proposal.body.id}/accept`,
      )
      .auth(passenger, { type: "bearer" })
      .send({ version: proposal.body.version })
      .expect(201);
    expect(chosen.body.executorId).toBe(d.id);
    expect(chosen.body.estimatedPrice).toBe("1100.00");
    await orders.transition(
      created.body.id,
      OrderStatus.CANCELLED_CLIENT,
      client.id,
    );
  });

  it("serializes selection with legacy/admin assignment to the same driver", async () => {
    const client = await user(),
      legacyClient = await user(),
      d = await driver();
    const { order } = await request(client.id);
    const offer = await market.submit(d.userId, order.id, { priceSteps: 0 });
    const legacy = await db.getRepository(OrderEntity).save({
      clientId: legacyClient.id,
      cityId: city.id,
      currency: Currency.KZT,
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      paymentMethod: PaymentMethod.CASH,
      estimatedPrice: "800",
    });
    const result = await Promise.allSettled([
      market.accept(client.id, order.id, offer.id, { version: offer.version }),
      orders.acceptExecutorAssignment(legacy.id, d.id, d.userId, {
        source: "dispatch_accept",
      }),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const id of [order.id, legacy.id])
      await orders.transition(
        id,
        OrderStatus.CANCELLED_CLIENT,
        id === order.id ? client.id : legacyClient.id,
      );
  });
  it("does not let canceled requests block new offer notifications", async () => {
    const client = await user(),
      d = await driver();
    const { order } = await request(client.id);
    await orders.transition(order.id, OrderStatus.CANCELLED_CLIENT, client.id);
    const closed = await db
      .getRepository(OrderEntity)
      .findOneByOrFail({ id: order.id });
    const stale = await db.getRepository(OrderEntity).save(
      Array.from({ length: 50 }, () => ({
        ...closed,
        id: randomUUID(),
        rideRequestKey: randomUUID(),
      })),
    );
    await db.getRepository(RidePriceOfferEntity).save(
      stale.map((o) => ({
        orderId: o.id,
        executorId: d.id,
        unitPrice: "500",
        totalPrice: "500",
        priceSteps: 0,
        status: "pending" as const,
        version: 1,
        notificationSentVersion: 0,
        expiresAt: new Date(Date.now() + 300000),
      })),
    );
    const { order: open } = await request(client.id);
    const live = await market.submit(d.userId, open.id, { priceSteps: 0 });
    const stored = await db
      .getRepository(RidePriceOfferEntity)
      .findOneByOrFail({ id: live.id });
    expect(stored.notificationSentVersion).toBe(live.version);
    await orders.transition(open.id, OrderStatus.CANCELLED_CLIENT, client.id);
  });
});
