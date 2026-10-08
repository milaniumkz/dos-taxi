import { randomUUID } from "node:crypto";
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { CreateApplicationErrorMessages1710000000031 } from "../../src/database/migrations/1710000000031-CreateApplicationErrorMessages";
import {
  AdminErrorMessagesController,
  PublicErrorMessagesController,
} from "../../src/modules/error-messages/error-messages.controller";
import { ErrorMessagesService } from "../../src/modules/error-messages/error-messages.service";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

describe("persistent error message administration", () => {
  const schema = `errors_test_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource;
  let app: INestApplication;
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Use an isolated _test database");
    db = new DataSource({
      type: "postgres",
      url,
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    const runner = db.createQueryRunner();
    await runner.connect();
    await new CreateApplicationErrorMessages1710000000031().up(runner);
    await runner.release();
    const module = await Test.createTestingModule({
      controllers: [
        AdminErrorMessagesController,
        PublicErrorMessagesController,
      ],
      providers: [
        ErrorMessagesService,
        RolesGuard,
        { provide: DataSource, useValue: db },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers["x-test-role"]) throw new UnauthorizedException();
          req.user = { role: req.headers["x-test-role"] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app, {
      errorMessages: module.get(ErrorMessagesService),
    });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  it("makes public texts readable before login and restricts editing to admins", async () => {
    const server = app.getHttpAdapter().getInstance();
    const response = await request(server)
      .get("/api/v1/config/error-messages")
      .expect(200);
    expect(response.body.messages.ru.TARIFF_NOT_FOUND).toContain("тариф");
    await request(server).get("/api/v1/admin/error-messages").expect(401);
    await request(server)
      .put("/api/v1/admin/error-messages/TARIFF_NOT_FOUND")
      .set("x-test-role", "client")
      .send({ ru: "x", kk: "y" })
      .expect(403);
  });
  it("persists edits, rejects empty translations, and immediately changes HTTP error text", async () => {
    const server = app.getHttpAdapter().getInstance();
    await request(server)
      .put("/api/v1/admin/error-messages/VALIDATION_ERROR")
      .set("x-test-role", "admin")
      .send({
        ru: "Проверьте данные заказа",
        kk: "Тапсырыс деректерін тексеріңіз",
      })
      .expect(200);
    const invalid = await request(server)
      .put("/api/v1/admin/error-messages/TARIFF_NOT_FOUND")
      .set("x-test-role", "admin")
      .send({ ru: "  ", kk: "valid" })
      .expect(400);
    expect(invalid.body.message).toBe("Проверьте данные заказа");
    const freshService = new ErrorMessagesService(db);
    expect(
      await freshService.message("VALIDATION_ERROR", "fallback", "kk"),
    ).toBe("Тапсырыс деректерін тексеріңіз");
    const publicResponse = await request(server)
      .get("/api/v1/config/error-messages")
      .expect(200);
    expect(publicResponse.body.messages.ru.VALIDATION_ERROR).toBe(
      "Проверьте данные заказа",
    );
  });
});
