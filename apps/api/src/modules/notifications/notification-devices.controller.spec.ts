import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { NotificationDevicesController } from "./notification-devices.controller";
import { NotificationsService } from "./notifications.service";

describe("Notification device registration HTTP boundary", () => {
  let app: INestApplication;
  const registerDeviceToken = jest.fn(async () => {});
  const jwt = new JwtService({ secret: "notification-device-test" });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NotificationDevicesController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: "notification-device-test",
          }),
        },
        { provide: NotificationsService, useValue: { registerDeviceToken } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => registerDeviceToken.mockClear());
  it("requires authentication", async () => {
    await request(app.getHttpServer())
      .post("/notifications/devices")
      .send({ token: "token", platform: "web" })
      .expect(401);
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });
  it("uses JWT identity and trims tokens without requiring login again", async () => {
    await request(app.getHttpServer())
      .post("/notifications/devices")
      .auth(jwt.sign({ sub: "passenger", role: "client" }), { type: "bearer" })
      .send({ token: "  device-token  ", platform: "web" })
      .expect(204);
    expect(registerDeviceToken).toHaveBeenCalledWith(
      "passenger",
      "device-token",
      "web",
      "client",
    );
  });
  it.each([
    { token: " ", platform: "web" },
    { token: "a".repeat(513), platform: "web" },
    { token: "token", platform: "other" },
    { token: "token", platform: "web", userId: "someone-else" },
  ])("rejects invalid token metadata and identity injection", async (body) => {
    await request(app.getHttpServer())
      .post("/notifications/devices")
      .auth(jwt.sign({ sub: "passenger", role: "client" }), { type: "bearer" })
      .send(body)
      .expect(400);
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });
});
