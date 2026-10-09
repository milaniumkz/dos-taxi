import { CourierVehicleType, Currency, ServiceType } from "@dos/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { CityEntity } from "../admin/entities/city.entity";
import { TariffEntity } from "../admin/entities/tariff.entity";

import { CurrencyService } from "./currency.service";
import { EstimateResultDto } from "./dto/estimate-result.dto";

type EstimatePricingParams = {
  cityId?: string;
  serviceType: ServiceType;
  vehicleType?: CourierVehicleType;
  carClass?: string;
  distanceMeters: number;
  durationSeconds: number;
  isFragile?: boolean;
  requiresReturn?: boolean;
  declaredValue?: number;
  cashOnDelivery?: number;
  requestedAt?: Date;
};

type TariffSnapshot = {
  id: string;
  cityId: string;
  serviceType: ServiceType;
  vehicleClass: string | null;
  nameRu: string;
  nameKk: string;
  basePrice: string;
  pricePerKm: string;
  pricePerMinute: string;
  minimumPrice: string;
  freeWaitingSeconds: number;
  paidWaitingPerMinute: string;
  commissionPercent: string;
  commissionFixed: string;
  currency: Currency;
  validFrom: string | Date;
  validTo: string | Date | null;
  isActive: boolean;
  createdById: string | null;
  createdAt: string | Date;
};

type CommissionPricingParams = {
  cityId?: string;
  serviceType: ServiceType;
  vehicleType?: CourierVehicleType;
  carClass?: string;
  orderAmount: number;
  requestedAt?: Date;
};

type ResolvedTariff = {
  tariff: TariffSnapshot;
  vehicleMultiplier: number;
};

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    @InjectRepository(TariffEntity)
    private readonly tariffsRepository: Repository<TariffEntity>,
    private readonly redisStoreService: RedisStoreService,
    private readonly currencyService: CurrencyService,
    private readonly configService: ConfigService,
  ) {}

  async estimate(params: EstimatePricingParams): Promise<EstimateResultDto> {
    const city = await this.resolveCity(params.cityId);
    const requestedAt = params.requestedAt ?? new Date();
    const requestedVehicleClass = this.resolveVehicleClass(params);
    const resolvedTariff = await this.resolveTariff({
      cityId: city.id,
      serviceType: params.serviceType,
      vehicleClass: requestedVehicleClass,
      requestedAt,
    });

    const baseFare = this.calculateBaseFare(
      resolvedTariff.tariff,
      params.distanceMeters,
      params.durationSeconds,
    );
    const surgeCoefficient = await this.getSurgeCoefficient(
      city.id,
      params.serviceType,
      requestedVehicleClass,
    );
    const nightCoefficient = this.getNightCoefficient(
      city.timezone,
      requestedAt,
    );
    const optionSurcharge =
      params.serviceType === ServiceType.DELIVERY
        ? this.calculateDeliveryOptionSurcharge(params)
        : 0;

    const tariffCurrency = resolvedTariff.tariff.currency;
    const cityCurrency = city.currency;
    const conversionRate = await this.currencyService.getRate(
      tariffCurrency,
      cityCurrency,
    );

    const estimatedPriceBeforeConversion =
      baseFare *
        surgeCoefficient *
        nightCoefficient *
        resolvedTariff.vehicleMultiplier +
      optionSurcharge;
    const estimatedPrice = Number(
      (estimatedPriceBeforeConversion * conversionRate).toFixed(2),
    );

    return {
      tariffId: resolvedTariff.tariff.id,
      serviceType: params.serviceType,
      vehicleClass: requestedVehicleClass,
      estimatedPrice,
      basePrice: Number(baseFare.toFixed(2)),
      surchargeAmount: Number(optionSurcharge.toFixed(2)),
      currency: cityCurrency,
      surgeCoefficient,
      nightCoefficient,
      distanceMeters: params.distanceMeters,
      durationSeconds: params.durationSeconds,
      etaSeconds: params.durationSeconds,
    };
  }

  async calculateExecutorCommission(params: CommissionPricingParams): Promise<{
    tariffId: string;
    amount: number;
    percent: number;
    fixed: number;
    currency: Currency;
  }> {
    const city = await this.resolveCity(params.cityId);
    const requestedAt = params.requestedAt ?? new Date();
    const resolvedTariff = await this.resolveTariff({
      cityId: city.id,
      serviceType: params.serviceType,
      vehicleClass: this.resolveVehicleClass({
        ...params,
        distanceMeters: 0,
        durationSeconds: 0,
      }),
      requestedAt,
    });
    const percent = Number(resolvedTariff.tariff.commissionPercent);
    const fixed = Number(resolvedTariff.tariff.commissionFixed);
    const conversionRate = await this.currencyService.getRate(
      resolvedTariff.tariff.currency,
      city.currency,
    );
    const fixedInCityCurrency = fixed * conversionRate;
    const amount = Math.max(
      0,
      (params.orderAmount * (Number.isFinite(percent) ? percent : 0)) / 100 +
        (Number.isFinite(fixedInCityCurrency) ? fixedInCityCurrency : 0),
    );

    return {
      tariffId: resolvedTariff.tariff.id,
      amount: Number(amount.toFixed(2)),
      percent: Number.isFinite(percent) ? percent : 0,
      fixed: Number.isFinite(fixed) ? fixed : 0,
      currency: city.currency,
    };
  }

  private async resolveCity(cityId?: string): Promise<CityEntity> {
    if (cityId) {
      const city = await this.citiesRepository.findOne({
        where: { id: cityId },
      });
      if (city) {
        return city;
      }
    }

    const activeCity = await this.citiesRepository.findOne({
      where: { isActive: true },
    });
    if (activeCity) {
      return activeCity;
    }

    throw new NotFoundException({
      code: "CITY_NOT_FOUND",
      message: "Active city not found for pricing",
    });
  }

  private resolveVehicleClass(params: EstimatePricingParams): string | null {
    if (params.serviceType === ServiceType.TAXI) {
      return params.carClass?.trim() || "economy";
    }

    return null;
  }

  private calculateBaseFare(
    tariff: TariffSnapshot,
    distanceMeters: number,
    durationSeconds: number,
  ): number {
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;
    const basePrice = Number(tariff.basePrice);
    const minimumPrice = Number(tariff.minimumPrice);
    const pricePerKm = Number(tariff.pricePerKm);
    const pricePerMinute = Number(tariff.pricePerMinute);

    return Math.max(
      minimumPrice,
      basePrice + distanceKm * pricePerKm + durationMinutes * pricePerMinute,
    );
  }

  private calculateDeliveryOptionSurcharge(
    params: EstimatePricingParams,
  ): number {
    let surcharge = 0;

    if (params.isFragile) {
      surcharge += 250;
    }

    if (params.requiresReturn) {
      surcharge += 400;
    }

    if ((params.cashOnDelivery ?? 0) > 0) {
      surcharge += 180;
    }

    if ((params.declaredValue ?? 0) > 0) {
      surcharge += Math.min(350, (params.declaredValue ?? 0) * 0.005);
    }

    return surcharge;
  }

  private async resolveTariff({
    cityId,
    serviceType,
    vehicleClass,
    requestedAt,
  }: {
    cityId: string;
    serviceType: ServiceType;
    vehicleClass: string | null;
    requestedAt: Date;
  }): Promise<ResolvedTariff> {
    const cacheKey = `pricing:tariff:v2:${cityId}:${serviceType}:${vehicleClass ?? "default"}`;
    const cached =
      await this.redisStoreService.getJson<ResolvedTariff>(cacheKey);

    const candidates = await this.tariffsRepository.find({
      withDeleted: true,
      where: [
        { cityId, serviceType, isActive: true },
        { cityId, serviceType, deletedAt: Not(IsNull()) },
      ],
      order: {
        validFrom: "DESC",
      },
    });

    const activeCandidates = candidates.filter(
      (tariff) =>
        !tariff.deletedAt &&
        tariff.validFrom <= requestedAt &&
        (!tariff.validTo || tariff.validTo > requestedAt),
    );

    const exactMatch = activeCandidates.find(
      (tariff) => (tariff.vehicleClass ?? null) === vehicleClass,
    );
    // A removed class must not be recreated implicitly from another class's price,
    // including cached fallback estimates created before deletion.
    if (
      !exactMatch &&
      candidates.some(
        (tariff) =>
          tariff.deletedAt && (tariff.vehicleClass ?? null) === vehicleClass,
      )
    ) {
      throw new NotFoundException({
        code: "TARIFF_NOT_FOUND",
        message: "No active tariff found for the requested estimate",
      });
    }

    if (
      cached?.tariff?.id &&
      (!exactMatch || cached.tariff.id === exactMatch.id) &&
      activeCandidates.some((tariff) => tariff.id === cached.tariff.id)
    ) {
      return cached;
    }

    if (exactMatch) {
      const result = {
        tariff: this.toTariffSnapshot(exactMatch),
        vehicleMultiplier: 1,
      };
      await this.redisStoreService.setJson(cacheKey, result, 300);
      return result;
    }

    if (
      serviceType === ServiceType.TAXI &&
      vehicleClass !== "together" &&
      vehicleClass !== "child"
    ) {
      const fallbackTaxiTariff =
        activeCandidates.find((tariff) => tariff.vehicleClass === "economy") ??
        activeCandidates.find(
          (tariff) =>
            tariff.vehicleClass !== "together" &&
            tariff.vehicleClass !== "child",
        );
      if (fallbackTaxiTariff) {
        const result = {
          tariff: this.toTariffSnapshot(fallbackTaxiTariff),
          vehicleMultiplier: this.getTaxiClassMultiplier(vehicleClass),
        };
        await this.redisStoreService.setJson(cacheKey, result, 300);
        return result;
      }
    }

    if (
      (serviceType === ServiceType.DELIVERY ||
        serviceType === ServiceType.INTERCITY) &&
      activeCandidates[0]
    ) {
      const result = {
        tariff: this.toTariffSnapshot(activeCandidates[0]),
        vehicleMultiplier: 1,
      };
      await this.redisStoreService.setJson(cacheKey, result, 300);
      return result;
    }

    throw new NotFoundException({
      code: "TARIFF_NOT_FOUND",
      message: "No active tariff found for the requested estimate",
    });
  }

  private toTariffSnapshot(tariff: TariffEntity): TariffSnapshot {
    return {
      id: tariff.id,
      cityId: tariff.cityId,
      serviceType: tariff.serviceType,
      vehicleClass: tariff.vehicleClass,
      nameRu: tariff.nameRu,
      nameKk: tariff.nameKk,
      basePrice: tariff.basePrice,
      pricePerKm: tariff.pricePerKm,
      pricePerMinute: tariff.pricePerMinute,
      minimumPrice: tariff.minimumPrice,
      freeWaitingSeconds: tariff.freeWaitingSeconds,
      paidWaitingPerMinute: tariff.paidWaitingPerMinute,
      commissionPercent: tariff.commissionPercent,
      commissionFixed: tariff.commissionFixed,
      currency: tariff.currency,
      validFrom: tariff.validFrom,
      validTo: tariff.validTo,
      isActive: tariff.isActive,
      createdById: tariff.createdById,
      createdAt: tariff.createdAt,
    };
  }

  private getTaxiClassMultiplier(vehicleClass: string | null): number {
    switch (vehicleClass) {
      case "business":
        return 1.8;
      case "comfort_plus":
        return 1.55;
      case "comfort":
        return 1.35;
      case "economy":
      case null:
        return 1;
      default:
        return 1.15;
    }
  }

  private isDriverRideService(serviceType: ServiceType): boolean {
    return (
      serviceType === ServiceType.TAXI || serviceType === ServiceType.INTERCITY
    );
  }

  private async getSurgeCoefficient(
    cityId: string,
    serviceType: ServiceType,
    vehicleClass: string | null,
  ): Promise<number> {
    const keys = [
      `demand_zones:${cityId}:${serviceType}:${vehicleClass ?? "default"}`,
      `demand_zones:${cityId}:${serviceType}`,
      `demand_zones:${cityId}`,
    ];

    for (const key of keys) {
      const payload = await this.redisStoreService.getJson<
        | number
        | string
        | {
            surgeCoefficient?: number;
          }
      >(key);

      if (typeof payload === "number" && payload > 0) {
        return payload;
      }

      if (typeof payload === "string") {
        const parsed = Number(payload);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }

      if (
        payload &&
        typeof payload === "object" &&
        typeof payload.surgeCoefficient === "number" &&
        payload.surgeCoefficient > 0
      ) {
        return payload.surgeCoefficient;
      }
    }

    return 1;
  }

  private getNightCoefficient(timezone: string, requestedAt: Date): number {
    const configuredNightCoefficient = Number(
      this.configService.get<string>("PRICING_NIGHT_COEFFICIENT") ?? "1",
    );
    if (configuredNightCoefficient <= 1) {
      return 1;
    }

    const startHour = Number(
      this.configService.get<string>("PRICING_NIGHT_START_HOUR") ?? "23",
    );
    const endHour = Number(
      this.configService.get<string>("PRICING_NIGHT_END_HOUR") ?? "6",
    );

    try {
      const formattedHour = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: timezone,
      }).format(requestedAt);
      const localHour = Number(formattedHour);
      const isNight =
        startHour > endHour
          ? localHour >= startHour || localHour < endHour
          : localHour >= startHour && localHour < endHour;

      return isNight ? configuredNightCoefficient : 1;
    } catch {
      return 1;
    }
  }
}
