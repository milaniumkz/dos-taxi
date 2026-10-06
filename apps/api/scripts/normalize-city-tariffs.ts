import "reflect-metadata";

import { CityEntity } from "../src/modules/admin/entities/city.entity";
import { TariffEntity } from "../src/modules/admin/entities/tariff.entity";
import {
  buildDefaultTariffs,
  cityCurrencyOrDefault,
  tariffKey,
} from "../src/modules/admin/tariff-defaults";
import appDataSource from "../src/database/data-source";

const DEFAULT_COMMISSION_PERCENT = "10.00";
const DEFAULT_COMMISSION_FIXED = "0.00";

async function normalizeCity(city: CityEntity): Promise<{
  city: string;
  created: number;
  updated: number;
  deleted: number;
}> {
  const tariffRepository = appDataSource.getRepository(TariffEntity);
  const allTariffs = await tariffRepository.find({
    where: { cityId: city.id },
    order: { validFrom: "DESC", createdAt: "DESC" },
  });
  const activeTariffs = allTariffs.filter((tariff) => tariff.isActive);
  const keepIds = new Set<string>();
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const definition of buildDefaultTariffs()) {
    const key = tariffKey(definition.serviceType, definition.vehicleClass);
    const exactTariff =
      activeTariffs.find(
        (tariff) => tariffKey(tariff.serviceType, tariff.vehicleClass) === key,
      ) ??
      allTariffs.find(
        (tariff) => tariffKey(tariff.serviceType, tariff.vehicleClass) === key,
      );
    const sourceTariff =
      exactTariff ??
      activeTariffs.find(
        (tariff) => tariff.serviceType === definition.serviceType,
      ) ??
      allTariffs.find(
        (tariff) => tariff.serviceType === definition.serviceType,
      );

    if (exactTariff) {
      exactTariff.nameRu = definition.nameRu;
      exactTariff.nameKk = definition.nameKk;
      exactTariff.vehicleClass = definition.vehicleClass;
      exactTariff.currency = cityCurrencyOrDefault(city.currency);
      exactTariff.commissionPercent = DEFAULT_COMMISSION_PERCENT;
      exactTariff.commissionFixed = DEFAULT_COMMISSION_FIXED;
      exactTariff.isActive = true;
      exactTariff.validTo = null;
      await tariffRepository.save(exactTariff);
      keepIds.add(exactTariff.id);
      updated += 1;
      continue;
    }

    const nextTariff = tariffRepository.create({
      cityId: city.id,
      serviceType: definition.serviceType,
      vehicleClass: definition.vehicleClass,
      nameRu: definition.nameRu,
      nameKk: definition.nameKk,
      basePrice: sourceTariff?.basePrice ?? definition.basePrice.toFixed(2),
      pricePerKm: sourceTariff?.pricePerKm ?? definition.pricePerKm.toFixed(4),
      pricePerMinute:
        sourceTariff?.pricePerMinute ?? definition.pricePerMinute.toFixed(4),
      minimumPrice:
        sourceTariff?.minimumPrice ?? definition.minimumPrice.toFixed(2),
      freeWaitingSeconds: sourceTariff?.freeWaitingSeconds ?? 180,
      paidWaitingPerMinute:
        sourceTariff?.paidWaitingPerMinute ??
        definition.paidWaitingPerMinute.toFixed(4),
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      commissionFixed: DEFAULT_COMMISSION_FIXED,
      currency: cityCurrencyOrDefault(city.currency),
      validFrom: new Date(),
      validTo: null,
      isActive: true,
      createdById: sourceTariff?.createdById ?? null,
    });
    const saved = await tariffRepository.save(nextTariff);
    keepIds.add(saved.id);
    created += 1;
  }

  const deleteIds = allTariffs
    .filter((tariff) => !keepIds.has(tariff.id))
    .map((tariff) => tariff.id);
  if (deleteIds.length > 0) {
    await tariffRepository.delete(deleteIds);
    deleted = deleteIds.length;
  }

  return {
    city: city.nameRu,
    created,
    updated,
    deleted,
  };
}

async function main(): Promise<void> {
  await appDataSource.initialize();
  try {
    const cityRepository = appDataSource.getRepository(CityEntity);
    const cities = await cityRepository.find({ order: { nameRu: "ASC" } });
    const results = [];
    for (const city of cities) {
      results.push(await normalizeCity(city));
    }
    console.log(JSON.stringify({ cities: results }, null, 2));
  } finally {
    await appDataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
