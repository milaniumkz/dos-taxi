import { Currency, ServiceType } from "@dos/shared-types";

export type TariffDefaultDefinition = {
  serviceType: ServiceType;
  vehicleClass: string | null;
  nameRu: string;
  nameKk: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMinute: number;
  minimumPrice: number;
  paidWaitingPerMinute: number;
};

export const TAXI_TARIFF_CLASSES = [
  "economy",
  "comfort",
  "comfort_plus",
  "business",
] as const;

export function buildDefaultTariffs(): TariffDefaultDefinition[] {
  return [
    {
      serviceType: ServiceType.TAXI,
      vehicleClass: "economy",
      nameRu: "Такси Эконом",
      nameKk: "Такси Эконом",
      basePrice: 600,
      pricePerKm: 120,
      pricePerMinute: 35,
      minimumPrice: 900,
      paidWaitingPerMinute: 25,
    },
    {
      serviceType: ServiceType.TAXI,
      vehicleClass: "comfort",
      nameRu: "Такси Комфорт",
      nameKk: "Такси Комфорт",
      basePrice: 750,
      pricePerKm: 145,
      pricePerMinute: 42,
      minimumPrice: 1100,
      paidWaitingPerMinute: 30,
    },
    {
      serviceType: ServiceType.TAXI,
      vehicleClass: "comfort_plus",
      nameRu: "Такси Комфорт+",
      nameKk: "Такси Комфорт+",
      basePrice: 900,
      pricePerKm: 170,
      pricePerMinute: 50,
      minimumPrice: 1350,
      paidWaitingPerMinute: 35,
    },
    {
      serviceType: ServiceType.TAXI,
      vehicleClass: "business",
      nameRu: "Такси Бизнес",
      nameKk: "Такси Бизнес",
      basePrice: 1200,
      pricePerKm: 220,
      pricePerMinute: 65,
      minimumPrice: 1800,
      paidWaitingPerMinute: 45,
    },
    {
      serviceType: ServiceType.DELIVERY,
      vehicleClass: null,
      nameRu: "Доставка",
      nameKk: "Жеткізу",
      basePrice: 650,
      pricePerKm: 110,
      pricePerMinute: 24,
      minimumPrice: 850,
      paidWaitingPerMinute: 18,
    },
    {
      serviceType: ServiceType.INTERCITY,
      vehicleClass: null,
      nameRu: "Межгород",
      nameKk: "Қалааралық",
      basePrice: 1500,
      pricePerKm: 175,
      pricePerMinute: 34,
      minimumPrice: 3200,
      paidWaitingPerMinute: 35,
    },
  ];
}

export function normalizeTariffVehicleClass(
  serviceType: ServiceType,
  vehicleClass: string | null | undefined,
): string | null {
  if (
    serviceType === ServiceType.DELIVERY ||
    serviceType === ServiceType.INTERCITY
  ) {
    return null;
  }

  return vehicleClass?.trim() || "economy";
}

export function isAllowedTariffKey(
  serviceType: ServiceType,
  vehicleClass: string | null,
): boolean {
  if (serviceType === ServiceType.TAXI) {
    return TAXI_TARIFF_CLASSES.includes(
      vehicleClass as (typeof TAXI_TARIFF_CLASSES)[number],
    );
  }

  return (
    (serviceType === ServiceType.DELIVERY ||
      serviceType === ServiceType.INTERCITY) &&
    vehicleClass === null
  );
}

export function tariffKey(
  serviceType: ServiceType,
  vehicleClass: string | null,
): string {
  return `${serviceType}:${vehicleClass ?? "default"}`;
}

export function cityCurrencyOrDefault(
  currency: Currency | null | undefined,
): Currency {
  return currency ?? Currency.KZT;
}
