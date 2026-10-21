import { randomUUID } from "node:crypto";
import { UserRole } from "@dos/shared-types";
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
import { DriverTopUpSettings1710000000044 } from "../../src/database/migrations/1710000000044-DriverTopUpSettings";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { AdminActivityLogEntity } from "../../src/modules/admin/entities/admin-activity-log.entity";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import {
  AdminTopUpSettingsController,
  ExecutorTopUpSettingsController,
} from "../../src/modules/topup-settings/topup-settings.controller";
import { TopUpSettingsEntity } from "../../src/modules/topup-settings/topup-settings.entity";
import { TopUpSettingsService } from "../../src/modules/topup-settings/topup-settings.service";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.headers["x-test-role"]) throw new UnauthorizedException();
    req.user = {
      sub: req.headers["x-test-user"],
      role: req.headers["x-test-role"],
    };
    return true;
  }
}

describe("Remote driver top-up settings", () => {
  let app: INestApplication;
  let db: DataSource;
  let service: TopUpSettingsService;
  let adminId: string;
  const schema = `topup_settings_${randomUUID().replaceAll("-", "")}`;
  const adminPath = "/api/v1/admin/settings/driver-topup";
  const driverPath = "/api/v1/executor/topup-settings";
  const kaspiUrl = "https://kaspi.kz/pay/test-link?service=dos";

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
    // Verify the actual production migration rather than relying only on synchronize.
    await db.query(`DROP TABLE "${schema}".driver_topup_settings`);
    const runner = db.createQueryRunner();
    await runner.connect();
    await new DriverTopUpSettings1710000000044().up(runner);
    await runner.release();
    adminId = (
      await db.getRepository(UserEntity).save({ phone: "+77010000000" })
    ).id;
    const module = await Test.createTestingModule({
      controllers: [
        AdminTopUpSettingsController,
        ExecutorTopUpSettingsController,
      ],
      providers: [
        TopUpSettingsService,
        RolesGuard,
        {
          provide: getRepositoryToken(TopUpSettingsEntity),
          useValue: db.getRepository(TopUpSettingsEntity),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
    service = app.get(TopUpSettingsService);
  }, 30000);

  beforeEach(async () => {
    await db.getRepository(TopUpSettingsEntity).clear();
    await db.getRepository(AdminActivityLogEntity).clear();
  });

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it("keeps manual mode on migration and requires authentication and correct roles", async () => {
    await request(app.getHttpServer()).get(driverPath).expect(401);
    await request(app.getHttpServer())
      .get(driverPath)
      .set("x-test-role", UserRole.CLIENT)
      .expect(403);
    await request(app.getHttpServer())
      .get(driverPath)
      .set("x-test-role", UserRole.EXECUTOR)
      .expect(200, { mode: "manual", kaspiUrl: "" });
    for (const role of [
      UserRole.CLIENT,
      UserRole.EXECUTOR,
      UserRole.SUPPORT,
      UserRole.OPERATOR,
    ]) {
      await request(app.getHttpServer())
        .patch(adminPath)
        .set("x-test-role", role)
        .send({ mode: "disabled", kaspiUrl: "" })
        .expect(403);
    }
    expect(await db.getRepository(TopUpSettingsEntity).count()).toBe(0);
  });

  it("switches the existing button immediately, audits changes and restores manual mode", async () => {
    for (const mode of ["kaspi_link", "disabled", "manual"] as const) {
      await request(app.getHttpServer())
        .patch(adminPath)
        .set("x-test-role", UserRole.ADMIN)
        .set("x-test-user", adminId)
        .send({ mode, kaspiUrl: ` ${kaspiUrl} ` })
        .expect(200, { mode, kaspiUrl });
      const driver = await request(app.getHttpServer())
        .get(driverPath)
        .set("x-test-role", UserRole.EXECUTOR)
        .expect(200);
      expect(driver.headers["cache-control"]).toBe("no-store");
      expect(driver.body).toEqual({ mode, kaspiUrl });
      if (mode === "manual")
        await expect(service.assertManualEnabled()).resolves.toBeUndefined();
      else
        await expect(service.assertManualEnabled()).rejects.toThrow(
          "Manual top-up requests are disabled",
        );
    }
    const audit = await db.getRepository(AdminActivityLogEntity).find();
    expect(audit).toHaveLength(3);
    expect(
      audit.every(
        (entry) =>
          entry.actorId === adminId &&
          entry.action === "driver.topup.settings.updated",
      ),
    ).toBe(true);
    const reloaded = new TopUpSettingsService(
      db.getRepository(TopUpSettingsEntity),
    );
    expect(await reloaded.get()).toEqual({ mode: "manual", kaspiUrl });
  });

  it("rejects incomplete or unsafe link settings without altering the saved mode", async () => {
    for (const data of [
      { mode: "kaspi_link", kaspiUrl: "" },
      { mode: "kaspi_link", kaspiUrl: " " },
      { mode: "other", kaspiUrl: "" },
      { mode: "kaspi_link" },
      ...[
        "http://kaspi.kz/pay",
        "javascript:alert(1)",
        "https://user:pass@kaspi.kz/pay",
        "kaspi://pay",
        "https://",
      ].map((kaspiUrl) => ({ mode: "kaspi_link", kaspiUrl })),
    ]) {
      await request(app.getHttpServer())
        .patch(adminPath)
        .set("x-test-role", UserRole.ADMIN)
        .set("x-test-user", adminId)
        .send(data)
        .expect(400);
    }
    expect(await service.get()).toEqual({ mode: "manual", kaspiUrl: "" });
    expect(await db.getRepository(AdminActivityLogEntity).count()).toBe(0);
  });
});
