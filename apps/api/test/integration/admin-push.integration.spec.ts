import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { UserRole, ExecutorType } from "@dos/shared-types";
import { databaseEntities } from "../../src/database/entities";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { AdminPushController } from "../../src/modules/notifications/admin-push.controller";
import { AdminPushService } from "../../src/modules/notifications/admin-push.service";
import { NotificationsQueueService } from "../../src/modules/notifications/notifications-queue.service";
import { NotificationDeviceTokenEntity } from "../../src/modules/notifications/entities/notification-device-token.entity";
import { PushCampaignEntity } from "../../src/modules/notifications/entities/push-campaign.entity";
import { AdminActivityLogEntity } from "../../src/modules/admin/entities/admin-activity-log.entity";

describe("admin push campaigns (no external push delivery)", () => {
  const schema = `push_${randomUUID().replaceAll("-", "")}`;
  let db: DataSource, app: INestApplication, actorId: string;
  const queue = { enqueuePush: jest.fn(async () => {}) };
  beforeAll(async () => {
    const url =
      process.env.PROMO_TEST_DATABASE_URL ??
      "postgresql://platform:platform@localhost:5432/platform_test";
    if (!new URL(url).pathname.endsWith("_test"))
      throw new Error("Test database required");
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
    const actor = await db
      .getRepository(UserEntity)
      .save({ phone: "+77001234001" });
    actorId = actor.id;
    const passenger = await db
      .getRepository(UserEntity)
      .save({ phone: "+77001234002" });
    const driver = await db
      .getRepository(UserEntity)
      .save({ phone: "+77001234003" });
    const blocked = await db
      .getRepository(UserEntity)
      .save({ phone: "+77001234004", isBlocked: true });
    await db
      .getRepository(ExecutorEntity)
      .save({ userId: driver.id, executorType: ExecutorType.DRIVER });
    await db.getRepository(NotificationDeviceTokenEntity).save([
      {
        userId: passenger.id,
        token: "passenger-active",
        role: UserRole.CLIENT,
      },
      {
        userId: passenger.id,
        token: "passenger-inactive",
        role: UserRole.CLIENT,
        isActive: false,
      },
      { userId: driver.id, token: "driver-active", role: UserRole.EXECUTOR },
      { userId: driver.id, token: "driver-legacy", role: null },
      { userId: blocked.id, token: "blocked", role: UserRole.CLIENT },
    ]);
    const module = await Test.createTestingModule({
      controllers: [AdminPushController],
      providers: [
        AdminPushService,
        RolesGuard,
        { provide: DataSource, useValue: db },
        { provide: NotificationsQueueService, useValue: queue },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): {
            getRequest(): { user: unknown; headers: Record<string, string> };
          };
        }) {
          const req = context.switchToHttp().getRequest();
          req.user = {
            sub: actorId,
            role: req.headers["x-role"] ?? UserRole.ADMIN,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  beforeEach(() => queue.enqueuePush.mockClear());
  it("counts only reachable, unblocked passenger/driver devices and restricts sending to admins", async () => {
    const result = await request(app.getHttpServer())
      .get("/admin/push-notifications")
      .set("x-role", UserRole.SUPPORT)
      .expect(200);
    expect(result.body.devices).toEqual({ passenger: 1, driver: 2, all: 3 });
    await request(app.getHttpServer())
      .get("/admin/push-notifications")
      .set("x-role", UserRole.CLIENT)
      .expect(403);
    await request(app.getHttpServer())
      .post("/admin/push-notifications")
      .set("x-role", UserRole.OPERATOR)
      .send({ id: randomUUID(), audience: "all", title: "Test", body: "Test" })
      .expect(403);
    expect(queue.enqueuePush).not.toHaveBeenCalled();
  });
  it("queues the selected audience once across concurrent retries and records campaign/audit history", async () => {
    const body = {
      id: randomUUID(),
      audience: "driver",
      title: "Driver news",
      body: "Test campaign",
    };
    const result = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post("/admin/push-notifications")
          .send(body)
          .expect(201),
      ),
    );
    expect(result[0].body).toMatchObject({
      id: body.id,
      queuedDevices: 2,
      status: "queued",
    });
    expect(queue.enqueuePush).toHaveBeenCalledTimes(2);
    const calls = queue.enqueuePush.mock.calls as unknown as Array<
      [{ token: string; type: string }, string]
    >;
    expect(calls.map(([job]) => job.token).sort()).toEqual([
      "driver-active",
      "driver-legacy",
    ]);
    expect(
      calls.every(
        ([job, key]) =>
          job.type === "admin_broadcast" && key.startsWith(`admin-${body.id}-`),
      ),
    ).toBe(true);
    expect(
      await db.getRepository(PushCampaignEntity).countBy({ id: body.id }),
    ).toBe(1);
    expect(
      await db
        .getRepository(AdminActivityLogEntity)
        .countBy({ entityId: body.id }),
    ).toBe(1);
    await request(app.getHttpServer())
      .post("/admin/push-notifications")
      .send({ ...body, title: "Changed" })
      .expect(409);
  });
  it("retains an interrupted campaign and resumes with the same per-device job IDs", async () => {
    const body = {
      id: randomUUID(),
      audience: "driver",
      title: "Retry test",
      body: "Same content",
    };
    queue.enqueuePush
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Queue unavailable"));
    await request(app.getHttpServer())
      .post("/admin/push-notifications")
      .send(body)
      .expect(500);
    expect(
      (
        await db
          .getRepository(PushCampaignEntity)
          .findOneByOrFail({ id: body.id })
      ).status,
    ).toBe("processing");
    await request(app.getHttpServer())
      .post("/admin/push-notifications")
      .send(body)
      .expect(201);
    const calls = queue.enqueuePush.mock.calls as unknown as Array<
      [unknown, string]
    >;
    expect(calls[0][1]).toBe(calls[2][1]);
    expect(calls[1][1]).toBe(calls[3][1]);
    expect(
      (
        await db
          .getRepository(PushCampaignEntity)
          .findOneByOrFail({ id: body.id })
      ).status,
    ).toBe("queued");
  });
  it("rejects empty messages and unsupported audiences before queueing", async () => {
    for (const patch of [
      { title: "  " },
      { audience: "staff" },
      { body: "x".repeat(1001) },
    ]) {
      await request(app.getHttpServer())
        .post("/admin/push-notifications")
        .send({
          id: randomUUID(),
          audience: "passenger",
          title: "News",
          body: "Message",
          ...patch,
        })
        .expect(400);
    }
    expect(queue.enqueuePush).not.toHaveBeenCalled();
  });
});
