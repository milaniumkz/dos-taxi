import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import { Repository } from "typeorm";

import { RedisStoreService } from "../../src/shared/cache/redis-store.service";
import { configureHttpApplication } from "../../src/shared/http/configure-http-app";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { AuthController } from "../../src/modules/auth/auth.controller";
import { AuthService } from "../../src/modules/auth/auth.service";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { NotificationDeviceTokenEntity } from "../../src/modules/notifications/entities/notification-device-token.entity";
import { NotificationTemplateEntity } from "../../src/modules/notifications/entities/notification-template.entity";
import { NotificationTemplateRenderer } from "../../src/modules/notifications/notification-template.renderer";
import { NotificationsQueueService } from "../../src/modules/notifications/notifications-queue.service";
import { NotificationsService } from "../../src/modules/notifications/notifications.service";
import { UserEntity } from "../../src/modules/users/entities/user.entity";

// Dedicated Redis DB: never flush shared application databases.
describe("SMSC OTP HTTP -> Redis worker -> provider", () => {
  let app: INestApplication;
  let queue: NotificationsQueueService;
  let cache: RedisStoreService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let templates: jest.Mock;
  const phone = "+77010000000";

  beforeEach(async () => {
    fetchMock = jest.spyOn(globalThis, "fetch");
    const config = new ConfigService({
      redisUrl: process.env.SMSC_TEST_REDIS_URL ?? "redis://127.0.0.1:6379/14",
      NOTIFICATIONS_SMS_PROVIDER: "smsc",
      NOTIFICATIONS_SMS_STUB: "false",
      SMSC_LOGIN: "test",
      SMSC_PASSWORD: "test-password",
      OTP_DEV_BYPASS: "false",
      OTP_DEBUG_RESPONSE_ENABLED: "false",
    });
    queue = new NotificationsQueueService(config);
    await queue.onModuleInit();
    cache = new RedisStoreService(config);
    await cache.delete("auth:otp:rate:::ffff:127.0.0.1");
    await cache.delete("auth:otp:rate:127.0.0.1");
    await cache.delete(`auth:otp:${phone}`);
    await cache.delete(`auth:otp:phone:${phone}`);
    await cache.delete("auth:otp:ip:::ffff:127.0.0.1");
    await cache.delete("auth:otp:ip:127.0.0.1");
    templates = jest
      .fn()
      .mockResolvedValue([{ subject: null, body: "Код входа DOS: {{code}}." }]);
    const notifications = new NotificationsService(
      {} as Repository<UserEntity>,
      { find: templates } as unknown as Repository<NotificationTemplateEntity>,
      {} as Repository<NotificationDeviceTokenEntity>,
      new NotificationTemplateRenderer(),
      queue,
    );
    const auth = new AuthService(
      {} as Repository<UserEntity>,
      {} as Repository<ExecutorEntity>,
      {} as Repository<CityEntity>,
      new JwtService({ secret: "test" }),
      config,
      cache,
      notifications,
    );
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    await queue?.onModuleDestroy();
    await cache?.delete(`auth:otp:${phone}`);
    await cache?.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it("returns success only after SMSC acceptance and keeps the OTP out of HTTP/buffers", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 42, cnt: 1 })),
    );
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/send-otp")
      .send({ phone })
      .expect(201);
    expect(response.body).toEqual({ expiresInSeconds: 300, devCode: null });
    const session = await cache.getJson<{ code: string }>(`auth:otp:${phone}`);
    const form = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(form.get("mes")).toBe(`Код входа DOS: ${session?.code}.`);
    expect(queue.getBufferedNotifications()).toEqual([
      expect.objectContaining({
        provider: "smsc",
        providerMessageId: 42,
        body: "[redacted OTP]",
      }),
    ]);
  });

  it("returns OTP_DELIVERY_FAILED and deletes the OTP when SMSC rejects it", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "test-password", error_code: 2 })),
    );
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/send-otp")
      .send({ phone })
      .expect(503);
    expect(response.body.code).toBe("OTP_DELIVERY_FAILED");
    expect(JSON.stringify(response.body)).not.toContain("test-password");
    expect(await cache.getJson(`auth:otp:${phone}`)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queue.getBufferedNotifications()).toEqual([]);
  });

  it("fails explicitly instead of pretending to send when the OTP template is absent", async () => {
    templates.mockResolvedValue([]);
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/send-otp")
      .send({ phone })
      .expect(503);
    expect(response.body.code).toBe("OTP_DELIVERY_FAILED");
    expect(await cache.getJson(`auth:otp:${phone}`)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
