import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { GeoController } from "../../src/modules/geo/geo.controller";
import { GeoService } from "../../src/modules/geo/geo.service";
import { NominatimAdapter } from "../../src/modules/geo/adapters/nominatim.adapter";
import { YandexGeocoderAdapter } from "../../src/modules/geo/adapters/yandex-geocoder.adapter";
import { OsrmAdapter } from "../../src/modules/geo/adapters/osrm.adapter";
import { RedisStoreService } from "../../src/shared/cache/redis-store.service";
import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { getRepositoryToken } from "@nestjs/typeorm";
describe("reverse geocoding HTTP resilience", () => {
  let app: INestApplication;
  const primary = { reverseGeocode: jest.fn() };
  const secondary = { reverseGeocode: jest.fn() };
  const cache = {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GeoController],
      providers: [
        GeoService,
        { provide: getRepositoryToken(CityEntity), useValue: {} },
        { provide: getRepositoryToken(ExecutorEntity), useValue: {} },
        { provide: RedisStoreService, useValue: cache },
        { provide: NominatimAdapter, useValue: primary },
        { provide: YandexGeocoderAdapter, useValue: secondary },
        { provide: OsrmAdapter, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });
  afterAll(async () => app.close());
  it("returns a usable exact pin during an upstream outage without changing the existing contract", async () => {
    primary.reverseGeocode.mockRejectedValue(new Error("HTTP 403"));
    secondary.reverseGeocode.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get("/geo/reverse")
      .query({ lat: 52.323063965246035, lng: 77.12787442989858, lang: "ru" })
      .expect(200);
    expect(response.body).toEqual({
      title: "52.323064, 77.127874",
      subtitle: "",
      lat: 52.323063965246035,
      lng: 77.12787442989858,
    });
    primary.reverseGeocode.mockResolvedValue({
      title: "Ауэзова 8",
      subtitle: "Жетекши",
      lat: 52.3231,
      lng: 77.128,
    });
    const restored = await request(app.getHttpServer())
      .get("/geo/reverse")
      .query({ lat: 52.323063965246035, lng: 77.12787442989858 })
      .expect(200);
    expect(restored.body).toMatchObject({
      title: "Ауэзова 8",
      lat: 52.323063965246035,
      lng: 77.12787442989858,
    });
    await request(app.getHttpServer())
      .get("/geo/reverse")
      .query({ lat: "not-a-number", lng: 77 })
      .expect(400);
  });
});
