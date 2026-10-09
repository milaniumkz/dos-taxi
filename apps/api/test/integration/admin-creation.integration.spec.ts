import { UserRole } from "@dos/shared-types";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AdminController } from "../../src/modules/admin/admin.controller";
import { AdminCreationController } from "../../src/modules/admin/admin-creation.controller";
import { AdminService } from "../../src/modules/admin/admin.service";
import { AdminBookingService } from "../../src/modules/admin/admin-booking.service";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { ROLES_KEY } from "../../src/shared/decorators/roles.decorator";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

class TestAuth implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (!req.headers["x-role"]) throw new UnauthorizedException();
    req.user = { sub: "staff-1", role: req.headers["x-role"] };
    return true;
  }
}
describe("Admin creation and full staff access", () => {
  let app: INestApplication;
  const booking = { create: jest.fn(async () => ({ id: "order-1" })) };
  const admin = {
    deleteTariff: jest.fn(async () => ({ deleted: true })),
    createTariff: jest.fn(async () => ({ id: "tariff-1" })),
  };
  const key = "10000000-0000-4000-8000-000000000001";
  const order = {
    cityId: key,
    serviceType: "taxi",
    paymentMethod: "cash",
    clientPhone: "+77010000000",
    routePoints: [
      { sequenceIndex: 0, lat: 43.23, lng: 76.9, address: "A" },
      { sequenceIndex: 1, lat: 43.24, lng: 76.91, address: "B" },
    ],
  };
  const tariff = {
    cityId: key,
    serviceType: "taxi",
    vehicleClass: "economy",
    nameRu: "Тест",
    nameKk: "Тест",
    basePrice: 500,
    pricePerKm: 100,
    pricePerMinute: 20,
    minimumPrice: 600,
    currency: "KZT",
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminCreationController, AdminController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: AdminBookingService, useValue: booking },
        { provide: AdminService, useValue: admin },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuth)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each([UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT])(
    "%s can create orders and tariffs",
    async (role) => {
      await request(app.getHttpServer())
        .post("/api/v1/admin/orders")
        .set("x-role", role)
        .set("X-Idempotency-Key", key)
        .send(order)
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/v1/admin/tariffs")
        .set("x-role", role)
        .set("X-Idempotency-Key", key)
        .send(tariff)
        .expect(201);
    },
  );
  it.each([UserRole.CLIENT, UserRole.EXECUTOR])(
    "%s cannot create orders or tariffs",
    async (role) => {
      for (const path of ["orders", "tariffs"])
        await request(app.getHttpServer())
          .post(`/api/v1/admin/${path}`)
          .set("x-role", role)
          .set("X-Idempotency-Key", key)
          .send(path === "orders" ? order : tariff)
          .expect(403);
    },
  );
  it.each([UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT])(
    "%s can delete a tariff",
    async (role) => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/tariffs/${key}`)
        .set("x-role", role)
        .expect(200);
      expect(admin.deleteTariff).toHaveBeenCalledWith(key, "staff-1");
    },
  );
  it.each([UserRole.CLIENT, UserRole.EXECUTOR])(
    "%s cannot delete tariffs",
    async (role) => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/tariffs/${key}`)
        .set("x-role", role)
        .expect(403);
    },
  );
  it("rejects unauthenticated deletion", async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/tariffs/${key}`)
      .expect(401);
  });
  it("rejects unauthenticated, invalid recipient, invalid coordinates, and missing idempotency key", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/admin/orders")
      .send(order)
      .expect(401);
    for (const body of [
      { ...order, clientPhone: "705" },
      {
        ...order,
        routePoints: [
          ...order.routePoints,
          { sequenceIndex: 2, lat: 200, lng: 0, address: "bad" },
        ],
      },
    ])
      await request(app.getHttpServer())
        .post("/api/v1/admin/orders")
        .set("x-role", "admin")
        .set("X-Idempotency-Key", key)
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .post("/api/v1/admin/orders")
      .set("x-role", "admin")
      .send(order)
      .expect(400);
  });
  it("all existing administrative operations grant admin, operator and support access", () => {
    const prototype = AdminController.prototype;
    for (const name of Object.getOwnPropertyNames(prototype)) {
      const handler = Object.getOwnPropertyDescriptor(prototype, name)?.value;
      const roles = Reflect.getMetadata(ROLES_KEY, handler);
      if (name === "constructor" || !roles) continue;
      for (const role of [UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT])
        expect(roles).toContain(role);
      expect(roles).not.toContain(UserRole.CLIENT);
      expect(roles).not.toContain(UserRole.EXECUTOR);
    }
  });
});
