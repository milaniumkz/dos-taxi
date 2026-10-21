import { randomUUID } from "node:crypto";
import {
  Currency,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  ServiceType,
  UserRole,
} from "@dos/shared-types";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { DataSource } from "typeorm";
import { databaseEntities } from "../../src/database/entities";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { OrderEntity } from "../../src/modules/orders/entities/order.entity";
import { DriverStatisticsService } from "../../src/modules/executors/driver-statistics.service";
import { DriverStatisticsController } from "../../src/modules/executors/driver-statistics.controller";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{
        headers: Record<string, string | undefined>;
        user?: { sub: string; role: string };
      }>();
    if (!req.headers["x-user-id"]) throw new UnauthorizedException();
    req.user = {
      sub: req.headers["x-user-id"]!,
      role: req.headers["x-role"] ?? UserRole.EXECUTOR,
    };
    return true;
  }
}

describe("Real driver profile statistics", () => {
  let db: DataSource;
  let app: INestApplication;
  let driver: ExecutorEntity;
  let other: ExecutorEntity;
  let cityId: string;
  let clientId: string;
  const schema = `driver_stats_${randomUUID().replaceAll("-", "")}`;
  const endpoint = "/api/v1/executor/statistics";

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
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    const module = await Test.createTestingModule({
      controllers: [DriverStatisticsController],
      providers: [
        DriverStatisticsService,
        RolesGuard,
        {
          provide: getRepositoryToken(ExecutorEntity),
          useValue: db.getRepository(ExecutorEntity),
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: db.getRepository(OrderEntity),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await db.query(`TRUNCATE "${schema}".users, "${schema}".cities CASCADE`);
    cityId = (
      await db
        .getRepository(CityEntity)
        .save({
          nameRu: "Алматы",
          nameKk: "Алматы",
          countryCode: "KZ",
          currency: Currency.KZT,
          timezone: "Asia/Almaty",
          isActive: true,
        })
    ).id;
    const users = await db
      .getRepository(UserEntity)
      .save([
        { phone: "+77010000000" },
        { phone: "+77010000001" },
        { phone: "+77010000002" },
      ]);
    clientId = users[2].id;
    [driver, other] = await db
      .getRepository(ExecutorEntity)
      .save(
        users
          .slice(0, 2)
          .map((user) => ({
            userId: user.id,
            executorType: ExecutorType.DRIVER,
            rating: "5.00",
          })),
      );
  });

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  const read = (userId: string) =>
    request(app.getHttpServer()).get(endpoint).set("x-user-id", userId);
  const order = (
    status: OrderStatus,
    executorRating: number | null = null,
    serviceType = ServiceType.TAXI,
    executorId?: string,
  ) =>
    db.getRepository(OrderEntity).save({
      clientId,
      cityId,
      executorId: executorId ?? driver.id,
      status,
      executorRating,
      serviceType,
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CASH,
      completedAt:
        status === OrderStatus.COMPLETED
          ? new Date("2025-01-01T00:00:00Z")
          : null,
    });

  it("does not invent a 5-star rating or activity for an executor without orders", async () => {
    const response = await read(driver.userId).expect(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      completedOrders: 0,
      cancelledByDriver: 0,
      ratedOrders: 0,
      rating: null,
      activityPercent: null,
    });
  });

  it("counts actual completed orders across services, excludes other drivers and unrelated statuses, and refreshes ratings", async () => {
    await order(OrderStatus.COMPLETED, 5);
    const delivery = await order(
      OrderStatus.COMPLETED,
      3,
      ServiceType.DELIVERY,
    );
    await order(OrderStatus.COMPLETED, null, ServiceType.INTERCITY);
    await order(OrderStatus.CANCELLED_EXECUTOR);
    for (const status of [
      OrderStatus.CANCELLED_CLIENT,
      OrderStatus.CANCELLED_SYSTEM,
      OrderStatus.FAILED,
      OrderStatus.IN_PROGRESS,
      OrderStatus.ACCEPTED,
    ])
      await order(status, 1);
    await order(OrderStatus.COMPLETED, 1, ServiceType.TAXI, other.id);
    await read(driver.userId).expect(200, {
      completedOrders: 3,
      cancelledByDriver: 1,
      ratedOrders: 2,
      rating: 4,
      activityPercent: 75,
    });
    await db
      .getRepository(OrderEntity)
      .update(delivery.id, { executorRating: 1 });
    await order(OrderStatus.COMPLETED, 4);
    await read(driver.userId).expect(200, {
      completedOrders: 4,
      cancelledByDriver: 1,
      ratedOrders: 3,
      rating: 3.33,
      activityPercent: 80,
    });
    await read(other.userId).expect(200, {
      completedOrders: 1,
      cancelledByDriver: 0,
      ratedOrders: 1,
      rating: 1,
      activityPercent: 100,
    });
  });

  it("keeps unrated trips and zero-percent activity distinct from missing data", async () => {
    await order(OrderStatus.CANCELLED_EXECUTOR);
    await read(driver.userId).expect(200, {
      completedOrders: 0,
      cancelledByDriver: 1,
      ratedOrders: 0,
      rating: null,
      activityPercent: 0,
    });
    await order(OrderStatus.COMPLETED);
    await read(driver.userId).expect(200, {
      completedOrders: 1,
      cancelledByDriver: 1,
      ratedOrders: 0,
      rating: null,
      activityPercent: 50,
    });
  });

  it("uses all historical orders rather than the first history page or today only", async () => {
    for (let i = 0; i < 51; i++) await order(OrderStatus.COMPLETED);
    const response = await read(driver.userId).expect(200);
    expect(response.body.completedOrders).toBe(51);
    expect(response.body.rating).toBeNull();
  });

  it("requires an executor identity and does not accept another user ID from the query", async () => {
    await request(app.getHttpServer()).get(endpoint).expect(401);
    await read(clientId).set("x-role", UserRole.CLIENT).expect(403);
    await read(clientId).expect(404);
    await order(OrderStatus.COMPLETED, 5, ServiceType.TAXI, other.id);
    const response = await read(driver.userId)
      .query({ userId: other.userId, executorId: other.id })
      .expect(200);
    expect(response.body.completedOrders).toBe(0);
  });
});
