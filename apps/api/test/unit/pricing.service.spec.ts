import {
  CourierVehicleType,
  Currency,
  ServiceType,
} from '@dos/shared-types';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { CityEntity } from '../../src/modules/admin/entities/city.entity';
import { TariffEntity } from '../../src/modules/admin/entities/tariff.entity';
import { CurrencyService } from '../../src/modules/pricing/currency.service';
import { PricingService } from '../../src/modules/pricing/pricing.service';
import { RedisStoreService } from '../../src/shared/cache/redis-store.service';

describe('PricingService', () => {
  let pricingService: PricingService;
  let citiesRepository: jest.Mocked<Repository<CityEntity>>;
  let tariffsRepository: jest.Mocked<Repository<TariffEntity>>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let currencyService: jest.Mocked<CurrencyService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    citiesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CityEntity>>;
    tariffsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<TariffEntity>>;
    redisStoreService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;
    currencyService = {
      getRate: jest.fn(),
    } as unknown as jest.Mocked<CurrencyService>;
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'PRICING_NIGHT_COEFFICIENT':
          return '1';
        case 'PRICING_NIGHT_START_HOUR':
          return '23';
        case 'PRICING_NIGHT_END_HOUR':
          return '6';
        default:
          return undefined;
      }
    });

    currencyService.getRate.mockResolvedValue(1);
    redisStoreService.setJson.mockResolvedValue();

    pricingService = new PricingService(
      citiesRepository,
      tariffsRepository,
      redisStoreService,
      currencyService,
      configService,
    );
  });

  it('estimates taxi with base tariff formula', async () => {
    citiesRepository.findOne.mockResolvedValue({
      id: 'city-1',
      currency: Currency.KZT,
      timezone: 'Asia/Almaty',
      isActive: true,
    } as CityEntity);
    redisStoreService.getJson.mockResolvedValue(null);
    tariffsRepository.find.mockResolvedValue([
      {
        id: 'tariff-economy',
        cityId: 'city-1',
        serviceType: ServiceType.TAXI,
        vehicleClass: 'economy',
        basePrice: '600.00',
        pricePerKm: '120.0000',
        pricePerMinute: '35.0000',
        minimumPrice: '900.00',
        paidWaitingPerMinute: '0',
        freeWaitingSeconds: 180,
        currency: Currency.KZT,
        validFrom: new Date('2024-01-01T00:00:00Z'),
        validTo: null,
        isActive: true,
      } as TariffEntity,
    ]);

    const result = await pricingService.estimate({
      cityId: 'city-1',
      serviceType: ServiceType.TAXI,
      carClass: 'economy',
      distanceMeters: 5000,
      durationSeconds: 600,
      requestedAt: new Date('2025-02-01T12:00:00Z'),
    });

    expect(result.estimatedPrice).toBe(1550);
    expect(result.basePrice).toBe(1550);
    expect(result.surgeCoefficient).toBe(1);
    expect(result.currency).toBe(Currency.KZT);
  });

  it('applies surge and taxi class multiplier when only economy tariff exists', async () => {
    citiesRepository.findOne.mockResolvedValue({
      id: 'city-1',
      currency: Currency.KZT,
      timezone: 'Asia/Almaty',
      isActive: true,
    } as CityEntity);
    redisStoreService.getJson.mockImplementation(async (key: string) => {
      if (key.startsWith('demand_zones:city-1:taxi')) {
        return { surgeCoefficient: 1.25 };
      }

      return null;
    });
    tariffsRepository.find.mockResolvedValue([
      {
        id: 'tariff-economy',
        cityId: 'city-1',
        serviceType: ServiceType.TAXI,
        vehicleClass: 'economy',
        basePrice: '600.00',
        pricePerKm: '120.0000',
        pricePerMinute: '35.0000',
        minimumPrice: '900.00',
        paidWaitingPerMinute: '0',
        freeWaitingSeconds: 180,
        currency: Currency.KZT,
        validFrom: new Date('2024-01-01T00:00:00Z'),
        validTo: null,
        isActive: true,
      } as TariffEntity,
    ]);

    const result = await pricingService.estimate({
      cityId: 'city-1',
      serviceType: ServiceType.TAXI,
      carClass: 'business',
      distanceMeters: 5000,
      durationSeconds: 600,
      requestedAt: new Date('2025-02-01T12:00:00Z'),
    });

    expect(result.basePrice).toBe(1550);
    expect(result.surgeCoefficient).toBe(1.25);
    expect(result.estimatedPrice).toBe(3487.5);
  });

  it('adds delivery surcharges for fragile, return and COD scenarios', async () => {
    citiesRepository.findOne.mockResolvedValue({
      id: 'city-1',
      currency: Currency.KZT,
      timezone: 'Asia/Almaty',
      isActive: true,
    } as CityEntity);
    redisStoreService.getJson.mockResolvedValue(null);
    tariffsRepository.find.mockResolvedValue([
      {
        id: 'delivery-bicycle',
        cityId: 'city-1',
        serviceType: ServiceType.DELIVERY,
        vehicleClass: CourierVehicleType.BICYCLE,
        basePrice: '500.00',
        pricePerKm: '90.0000',
        pricePerMinute: '20.0000',
        minimumPrice: '700.00',
        paidWaitingPerMinute: '0',
        freeWaitingSeconds: 180,
        currency: Currency.KZT,
        validFrom: new Date('2024-01-01T00:00:00Z'),
        validTo: null,
        isActive: true,
      } as TariffEntity,
    ]);

    const result = await pricingService.estimate({
      cityId: 'city-1',
      serviceType: ServiceType.DELIVERY,
      vehicleType: CourierVehicleType.BICYCLE,
      distanceMeters: 3000,
      durationSeconds: 900,
      isFragile: true,
      requiresReturn: true,
      cashOnDelivery: 10000,
      declaredValue: 100000,
      requestedAt: new Date('2025-02-01T12:00:00Z'),
    });

    expect(result.basePrice).toBe(1070);
    expect(result.surchargeAmount).toBe(1180);
    expect(result.estimatedPrice).toBe(2250);
  });
});
