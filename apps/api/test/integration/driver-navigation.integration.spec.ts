import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@dos/shared-types";
import request from "supertest";
import { GeoController } from "../../src/modules/geo/geo.controller";
import { GeoService } from "../../src/modules/geo/geo.service";
import { JwtStrategy } from "../../src/modules/auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../../src/modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/modules/auth/guards/roles.guard";
describe("driver navigation HTTP contract", () => {
  let app: INestApplication;
  const service = {
    route: jest.fn(async () => ({
      polyline: "[]",
      points: [
        { lat: 46.8, lng: 61.67 },
        { lat: 46.81, lng: 61.64 },
      ],
      distanceMeters: 1000,
      durationSeconds: 120,
      maneuvers: [
        { type: "depart", distanceFromStartMeters: 0 },
        { type: "arrive", distanceFromStartMeters: 1000 },
      ],
    })),
  };
  const jwt = new JwtService({ secret: "navigation-test-secret" });
  const body = {
    from: { lat: 46.8, lng: 61.67 },
    to: { lat: 46.81, lng: 61.64 },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "navigation-test-secret" }),
        },
        { provide: GeoService, useValue: service },
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
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it("requires an executor identity and validates coordinates", async () => {
    const http = request(app.getHttpServer());
    await http.post("/geo/navigation").send(body).expect(401);
    await http
      .post("/geo/navigation")
      .auth(jwt.sign({ sub: "client", role: UserRole.CLIENT }), {
        type: "bearer",
      })
      .send(body)
      .expect(403);
    const token = jwt.sign({ sub: "driver", role: UserRole.EXECUTOR });
    await http
      .post("/geo/navigation")
      .auth(token, { type: "bearer" })
      .send({ ...body, from: { lat: 100, lng: 61 } })
      .expect(400);
    await http
      .post("/geo/navigation")
      .auth(token, { type: "bearer" })
      .send({ to: body.to })
      .expect(400);
    const response = await http
      .post("/geo/navigation")
      .auth(token, { type: "bearer" })
      .send(body)
      .expect(200);
    expect(service.route).toHaveBeenCalledWith(body, true);
    expect(response.body.maneuvers).toHaveLength(2);
  });
});
