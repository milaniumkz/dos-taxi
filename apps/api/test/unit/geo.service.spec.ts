import {
  CourierVehicleType,
  ExecutorType,
  ServiceType,
} from "@dos/shared-types";
import { Repository } from "typeorm";

import { CityEntity } from "../../src/modules/admin/entities/city.entity";
import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { NominatimAdapter } from "../../src/modules/geo/adapters/nominatim.adapter";
import { OsrmAdapter } from "../../src/modules/geo/adapters/osrm.adapter";
import { YandexGeocoderAdapter } from "../../src/modules/geo/adapters/yandex-geocoder.adapter";
import { GeoService } from "../../src/modules/geo/geo.service";
import { RedisStoreService } from "../../src/shared/cache/redis-store.service";

describe("GeoService", () => {
  let geoService: GeoService;
  let citiesRepository: jest.Mocked<Repository<CityEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let nominatimAdapter: jest.Mocked<NominatimAdapter>;
  let yandexGeocoderAdapter: jest.Mocked<YandexGeocoderAdapter>;
  let osrmAdapter: jest.Mocked<OsrmAdapter>;

  beforeEach(() => {
    citiesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CityEntity>>;
    executorsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    redisStoreService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      listJsonByPattern: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;
    nominatimAdapter = {
      autocomplete: jest.fn(),
      reverseGeocode: jest.fn(),
      geocode: jest.fn(),
    } as unknown as jest.Mocked<NominatimAdapter>;
    yandexGeocoderAdapter = {
      autocomplete: jest.fn(),
    } as unknown as jest.Mocked<YandexGeocoderAdapter>;
    yandexGeocoderAdapter.autocomplete.mockResolvedValue([]);
    osrmAdapter = {
      route: jest.fn(),
    } as unknown as jest.Mocked<OsrmAdapter>;

    geoService = new GeoService(
      citiesRepository,
      executorsRepository,
      redisStoreService,
      nominatimAdapter,
      yandexGeocoderAdapter,
      osrmAdapter,
    );
  });

  it("uses cache for reverse geocoding when available", async () => {
    redisStoreService.getJson.mockResolvedValue({
      title: "Abay 10",
      subtitle: "Almaty",
      lat: 43.238949,
      lng: 76.889709,
    });

    const result = await geoService.reverse(43.238949, 76.889709);

    expect(result.title).toBe("Abay 10");
    expect(nominatimAdapter.reverseGeocode).not.toHaveBeenCalled();
  });

  it("builds autocomplete query with city context and caches the result", async () => {
    citiesRepository.findOne.mockResolvedValue({
      id: "city-1",
      nameRu: "Алматы",
    } as CityEntity);
    redisStoreService.getJson.mockResolvedValue(null);
    nominatimAdapter.autocomplete.mockResolvedValue([
      {
        title: "Абая 10",
        subtitle: "Алматы",
        lat: 43.238949,
        lng: 76.889709,
      },
    ]);

    const result = await geoService.autocomplete("Абая 10", {
      cityId: "city-1",
    });

    expect(nominatimAdapter.autocomplete).toHaveBeenCalledWith(
      "Абая 10, Алматы",
      undefined,
    );
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      "geo:autocomplete:v6:city-1:no-location:абая 10",
      result,
      86_400,
    );
  });

  it("uses Kazakhstan context by default for passenger address search", async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    nominatimAdapter.autocomplete.mockResolvedValue([
      {
        title: "проспект Абая 10",
        subtitle: "Алматы, Казахстан",
        lat: 43.238949,
        lng: 76.889709,
      },
    ]);

    await geoService.autocomplete("Абая 10");

    expect(nominatimAdapter.autocomplete).toHaveBeenCalledWith(
      "Абая 10, Казахстан",
      undefined,
    );
  });

  it("falls back to Yandex when OSM has no local suggestions", async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    nominatimAdapter.autocomplete.mockResolvedValue([]);
    yandexGeocoderAdapter.autocomplete.mockResolvedValue([
      {
        title: "улица Абая, 10",
        subtitle: "Павлодар",
        lat: 52.2873,
        lng: 76.9674,
      },
    ]);

    const result = await geoService.autocomplete("Абая 10", {
      lat: 52.2874,
      lng: 76.9675,
      radiusKm: 20,
    });

    expect(yandexGeocoderAdapter.autocomplete).toHaveBeenCalledWith(
      "Абая 10",
      {
        lat: 52.2874,
        lng: 76.9675,
        radiusKm: 20,
      },
    );
    expect(result).toEqual([
      {
        title: "улица Абая, 10",
        subtitle: "Павлодар",
        lat: 52.2873,
        lng: 76.9674,
      },
    ]);
  });

  it("falls back to Yandex when OSM local suggestion has empty title", async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    nominatimAdapter.autocomplete.mockResolvedValue([
      {
        title: "",
        subtitle: "Байконур",
        lat: 45.620132,
        lng: 63.299499,
      },
    ]);
    yandexGeocoderAdapter.autocomplete.mockResolvedValue([
      {
        title: "5-й микрорайон",
        subtitle: "Байконур",
        lat: 45.620132,
        lng: 63.299499,
      },
    ]);

    const result = await geoService.autocomplete("5 мкр Байконыр", {
      lat: 45.622,
      lng: 63.318,
      radiusKm: 50,
    });

    expect(result[0]?.title).toBe("5-й микрорайон");
  });

  it("keeps microdistrict name for house suggestions", async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    yandexGeocoderAdapter.autocomplete.mockResolvedValue([
      {
        title: "5-й микрорайон, 18",
        subtitle: "Байконур",
        lat: 45.620554,
        lng: 63.299176,
      },
    ]);

    const result = await geoService.autocomplete("5 микрорайон 18 Байконур", {
      lat: 45.622,
      lng: 63.318,
      radiusKm: 50,
    });

    expect(result[0]?.title).toBe("5-й микрорайон, 18");
  });

  it("normalizes Russian microdistrict ordinals before Yandex search", async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    yandexGeocoderAdapter.autocomplete.mockResolvedValue([
      {
        title: "5-й микрорайон, 18",
        subtitle: "Байконур",
        lat: 45.620554,
        lng: 63.299176,
      },
    ]);

    await geoService.autocomplete("пятый микрорайон 18 Байконур", {
      lat: 45.622,
      lng: 63.318,
      radiusKm: 50,
    });

    expect(yandexGeocoderAdapter.autocomplete).toHaveBeenCalledWith(
      "5 микрорайон 18 Байконур",
      {
        lat: 45.622,
        lng: 63.318,
        radiusKm: 50,
      },
    );
  });

  it("passes route points through OSRM adapter", async () => {
    osrmAdapter.route.mockResolvedValue({
      polyline: "[[76.88,43.23],[76.95,43.24]]",
      points: [
        { lat: 43.238949, lng: 76.889709 },
        { lat: 43.245, lng: 76.95 },
      ],
      distanceMeters: 5400,
      durationSeconds: 920,
    });

    const result = await geoService.route({
      from: { lat: 43.238949, lng: 76.889709 },
      to: { lat: 43.245, lng: 76.95 },
    });

    expect(result.distanceMeters).toBe(5400);
    expect(osrmAdapter.route).toHaveBeenCalledWith([
      { lat: 43.238949, lng: 76.889709 },
      { lat: 43.245, lng: 76.95 },
    ]);
  });

  it("filters nearby executors by service type, vehicle type and block status", async () => {
    redisStoreService.listJsonByPattern.mockResolvedValue([
      {
        executorId: "courier-1",
        lat: 43.2402,
        lng: 76.8921,
        isOnline: true,
      },
      {
        executorId: "driver-1",
        lat: 43.241,
        lng: 76.89,
        isOnline: true,
      },
      {
        executorId: "blocked-courier",
        lat: 43.244,
        lng: 76.891,
        isOnline: true,
      },
    ]);
    executorsRepository.find.mockResolvedValue([
      {
        id: "courier-1",
        executorType: ExecutorType.COURIER,
        vehicleType: CourierVehicleType.BICYCLE,
        isOnline: true,
        verificationStatus: "verified",
        user: { isBlocked: false },
      } as ExecutorEntity,
      {
        id: "driver-1",
        executorType: ExecutorType.DRIVER,
        vehicleType: null,
        isOnline: true,
        verificationStatus: "verified",
        user: { isBlocked: false },
      } as ExecutorEntity,
      {
        id: "blocked-courier",
        executorType: ExecutorType.COURIER,
        vehicleType: CourierVehicleType.BICYCLE,
        isOnline: true,
        verificationStatus: "verified",
        user: { isBlocked: true },
      } as ExecutorEntity,
    ]);

    const result = await geoService.findNearbyExecutors({
      lat: 43.238949,
      lng: 76.889709,
      serviceType: ServiceType.DELIVERY,
      vehicleType: CourierVehicleType.BICYCLE,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("courier-1");
    expect(result[0]?.type).toBe(ExecutorType.COURIER);
  });
});
