import { ExecutorType, ServiceType } from "@dos/shared-types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { CityEntity } from "../admin/entities/city.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { UserEntity } from "../users/entities/user.entity";

import { NominatimAdapter } from "./adapters/nominatim.adapter";
import { OsrmAdapter } from "./adapters/osrm.adapter";
import { YandexGeocoderAdapter } from "./adapters/yandex-geocoder.adapter";
import { NearbyExecutorsQueryDto } from "./dto/nearby-executors-query.dto";
import { RouteRequestDto } from "./dto/route-request.dto";
import {
  GeoAddressSuggestion,
  GeoPoint,
  GeoRouteResult,
} from "./interfaces/geo.types";

type ExecutorLocationRecord = {
  executorId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  isOnline?: boolean;
};

type AutocompleteOptions = {
  cityId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    private readonly redisStoreService: RedisStoreService,
    private readonly nominatimAdapter: NominatimAdapter,
    private readonly yandexGeocoderAdapter: YandexGeocoderAdapter,
    private readonly osrmAdapter: OsrmAdapter,
  ) {}

  async autocomplete(
    query: string,
    options: AutocompleteOptions = {},
  ): Promise<GeoAddressSuggestion[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      throw new BadRequestException({
        code: "GEO_QUERY_TOO_SHORT",
        message: "Query must contain at least 2 characters",
      });
    }

    const hasLocationBias = this.hasLocationBias(options);
    const radiusKm = this.normalizeRadiusKm(options.radiusKm);
    const locationCachePart = hasLocationBias
      ? `${options.lat!.toFixed(3)}:${options.lng!.toFixed(3)}:${radiusKm}`
      : "no-location";
    const cacheKey = `geo:autocomplete:v6:${options.cityId ?? "all"}:${locationCachePart}:${normalizedQuery.toLowerCase()}`;
    const cached =
      await this.redisStoreService.getJson<GeoAddressSuggestion[]>(cacheKey);
    if (cached) {
      return cached.map((item) => this.compactAddressSuggestion(item));
    }

    const contextualQuery = await this.buildContextualQuery(
      normalizedQuery,
      options.cityId,
      hasLocationBias,
    );
    const suggestions = await this.searchAutocompleteSuggestions({
      query: contextualQuery,
      normalizedQuery,
      hasLocationBias,
      lat: options.lat,
      lng: options.lng,
      radiusKm,
    });
    await this.redisStoreService.setJson(cacheKey, suggestions, 86_400);
    return suggestions;
  }

  private async searchAutocompleteSuggestions(params: {
    query: string;
    normalizedQuery: string;
    hasLocationBias: boolean;
    lat?: number;
    lng?: number;
    radiusKm: number;
  }): Promise<GeoAddressSuggestion[]> {
    const { query, normalizedQuery, hasLocationBias, lat, lng, radiusKm } =
      params;
    if (!hasLocationBias) {
      return this.searchKazakhstanVariants(query);
    }

    if (this.isMicrodistrictQuery(normalizedQuery)) {
      const microdistrictQuery =
        this.normalizeMicrodistrictOrdinal(normalizedQuery);
      const yandexMicrodistrictSuggestions = await this.searchYandexNearby(
        microdistrictQuery,
        lat!,
        lng!,
        radiusKm,
      );
      if (yandexMicrodistrictSuggestions.length > 0) {
        return yandexMicrodistrictSuggestions;
      }
    }

    const localSuggestions = await this.safeAutocomplete(query, {
      lat,
      lng,
      radiusKm,
    }).then((items) =>
      items
        .map((item) => this.compactAddressSuggestion(item))
        .filter((item) => item.title.length > 0)
        .filter((item) =>
          this.distanceMeters(
            { lat: lat!, lng: lng! },
            { lat: item.lat, lng: item.lng },
          ) <=
          radiusKm * 1000,
        )
        .sort((left, right) => {
          const origin = { lat: lat!, lng: lng! };
          return (
            this.distanceMeters(origin, { lat: left.lat, lng: left.lng }) -
            this.distanceMeters(origin, { lat: right.lat, lng: right.lng })
          );
        }),
    );

    if (localSuggestions.length > 0) {
      return localSuggestions;
    }

    const yandexLocalSuggestions = await this.safeYandexAutocomplete(
      normalizedQuery,
      { lat, lng, radiusKm },
    ).then((items) =>
      items
        .map((item) => this.compactAddressSuggestion(item))
        .filter((item) => item.title.length > 0)
        .filter((item) =>
          this.distanceMeters(
            { lat: lat!, lng: lng! },
            { lat: item.lat, lng: item.lng },
          ) <=
          radiusKm * 1000,
        )
        .sort((left, right) => {
          const origin = { lat: lat!, lng: lng! };
          return (
            this.distanceMeters(origin, { lat: left.lat, lng: left.lng }) -
            this.distanceMeters(origin, { lat: right.lat, lng: right.lng })
          );
        }),
    );

    if (yandexLocalSuggestions.length > 0) {
      return yandexLocalSuggestions;
    }

    return this.searchKazakhstanVariants(normalizedQuery);
  }

  private async searchYandexNearby(
    query: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<GeoAddressSuggestion[]> {
    return this.safeYandexAutocomplete(query, { lat, lng, radiusKm }).then(
      (items) =>
        items
          .map((item) => this.compactAddressSuggestion(item))
          .filter((item) => item.title.length > 0)
          .filter(
            (item) =>
              this.distanceMeters(
                { lat, lng },
                { lat: item.lat, lng: item.lng },
              ) <=
              radiusKm * 1000,
          )
          .sort(
            (left, right) =>
              this.distanceMeters({ lat, lng }, left) -
              this.distanceMeters({ lat, lng }, right),
          ),
    );
  }

  async reverse(lat: number, lng: number): Promise<GeoAddressSuggestion> {
    const cacheKey = `geo:reverse:${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cached =
      await this.redisStoreService.getJson<GeoAddressSuggestion>(cacheKey);
    if (cached) {
      return this.compactAddressSuggestion(cached);
    }

    const result = this.compactAddressSuggestion(
      await this.nominatimAdapter.reverseGeocode(lat, lng),
    );
    await this.redisStoreService.setJson(cacheKey, result, 86_400);
    return result;
  }

  async route(dto: RouteRequestDto): Promise<GeoRouteResult> {
    const points: GeoPoint[] = [dto.from, ...(dto.waypoints ?? []), dto.to];
    return this.osrmAdapter.route(points);
  }

  async findNearbyExecutors(query: NearbyExecutorsQueryDto): Promise<
    Array<{
      id: string;
      lat: number;
      lng: number;
      heading?: number | null;
      label: string;
      type?: string;
      vehicleType?: string | null;
      distanceMeters: number;
    }>
  > {
    const locationRecords =
      await this.redisStoreService.listJsonByPattern<ExecutorLocationRecord>(
        "executor:location:*",
      );

    const onlineRecords = locationRecords.filter(
      (record) => record.isOnline !== false,
    );
    const executorIds = [
      ...new Set(onlineRecords.map((item) => item.executorId)),
    ];

    if (executorIds.length === 0) {
      return [];
    }

    const executors = await this.executorsRepository.find({
      where: { id: In(executorIds) },
      relations: ["user"],
    });

    const filteredExecutors = executors.filter((executor) =>
      this.matchesExecutorFilters(executor, query),
    );
    const allowedExecutors = new Map(
      filteredExecutors.map((executor) => [executor.id, executor]),
    );

    return onlineRecords
      .filter((record) => allowedExecutors.has(record.executorId))
      .map((record) => {
        const executor = allowedExecutors.get(record.executorId)!;
        return {
          id: record.executorId,
          lat: record.lat,
          lng: record.lng,
          heading: record.heading ?? null,
          label: this.buildExecutorLabel(executor),
          type: executor.executorType,
          vehicleType: executor.vehicleType,
          distanceMeters: Math.round(
            this.distanceMeters(
              { lat: query.lat, lng: query.lng },
              { lat: record.lat, lng: record.lng },
            ),
          ),
        };
      })
      .sort((left, right) => left.distanceMeters - right.distanceMeters)
      .slice(0, 30);
  }

  private async buildContextualQuery(
    query: string,
    cityId?: string,
    hasLocationBias = false,
  ): Promise<string> {
    if (!cityId) {
      const lowerQuery = query.toLowerCase();
      if (this.hasCountryOrCityHint(lowerQuery)) {
        return query;
      }

      if (hasLocationBias) {
        return this.buildKazakhstanQuery(query);
      }

      return this.buildKazakhstanQuery(query);
    }

    const city = await this.citiesRepository.findOne({ where: { id: cityId } });
    if (!city) {
      throw new NotFoundException({
        code: "CITY_NOT_FOUND",
        message: "City not found",
      });
    }

    return `${query}, ${city.nameRu}`;
  }

  private hasLocationBias(options: AutocompleteOptions): boolean {
    return (
      typeof options.lat === "number" &&
      Number.isFinite(options.lat) &&
      typeof options.lng === "number" &&
      Number.isFinite(options.lng)
    );
  }

  private buildKazakhstanQuery(query: string): string {
    return `${query}, Казахстан`;
  }

  private async searchKazakhstanVariants(
    query: string,
  ): Promise<GeoAddressSuggestion[]> {
    const results: GeoAddressSuggestion[] = [];
    const seen = new Set<string>();

    for (const variant of this.buildKazakhstanSearchVariants(query)) {
      const suggestions = await this.safeAutocomplete(variant);
      for (const suggestion of suggestions) {
        const compact = this.compactAddressSuggestion(suggestion);
        const key = `${compact.title.toLowerCase()}|${compact.subtitle.toLowerCase()}|${compact.lat.toFixed(5)}|${compact.lng.toFixed(5)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        results.push(compact);
      }

      if (results.length >= 10) {
        return results.slice(0, 10);
      }
    }

    for (const variant of this.buildKazakhstanSearchVariants(query)) {
      const suggestions = await this.safeYandexAutocomplete(variant);
      for (const suggestion of suggestions) {
        const compact = this.compactAddressSuggestion(suggestion);
        const key = `${compact.title.toLowerCase()}|${compact.subtitle.toLowerCase()}|${compact.lat.toFixed(5)}|${compact.lng.toFixed(5)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        results.push(compact);
      }

      if (results.length >= 10) {
        return results.slice(0, 10);
      }
    }

    return results;
  }

  private async safeAutocomplete(
    query: string,
    options?: Parameters<NominatimAdapter["autocomplete"]>[1],
  ): Promise<GeoAddressSuggestion[]> {
    try {
      return await this.nominatimAdapter.autocomplete(query, options);
    } catch {
      return [];
    }
  }

  private async safeYandexAutocomplete(
    query: string,
    options?: Parameters<YandexGeocoderAdapter["autocomplete"]>[1],
  ): Promise<GeoAddressSuggestion[]> {
    try {
      const suggestions = await this.yandexGeocoderAdapter.autocomplete(
        query,
        options,
      );
      return Array.isArray(suggestions) ? suggestions : [];
    } catch {
      return [];
    }
  }

  private buildKazakhstanSearchVariants(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    if (this.hasCountryOrCityHint(lowerQuery)) {
      return [query];
    }

    if (this.hasStreetTypeHint(lowerQuery)) {
      return [this.buildKazakhstanQuery(query)];
    }

    const houseNumberMatch = query.match(/^(.+?)\s+(\d+[A-Za-zА-Яа-я0-9/-]*)$/);
    if (houseNumberMatch) {
      const streetName = houseNumberMatch[1].trim();
      const houseNumber = houseNumberMatch[2].trim();
      return [
        this.buildKazakhstanQuery(`${streetName} улица ${houseNumber}`),
        this.buildKazakhstanQuery(`${streetName} проспект ${houseNumber}`),
        this.buildKazakhstanQuery(`${streetName} улица`),
        this.buildKazakhstanQuery(`${streetName} проспект`),
        this.buildKazakhstanQuery(query),
      ];
    }

    return [
      this.buildKazakhstanQuery(`${query} улица`),
      this.buildKazakhstanQuery(`${query} проспект`),
      this.buildKazakhstanQuery(query),
    ];
  }

  private hasStreetTypeHint(lowerQuery: string): boolean {
    return (
      lowerQuery.includes("улица") ||
      lowerQuery.includes("ул.") ||
      lowerQuery.includes("проспект") ||
      lowerQuery.includes("пр.") ||
      lowerQuery.includes("street") ||
      lowerQuery.includes("avenue")
    );
  }

  private isMicrodistrictQuery(lowerQuery: string): boolean {
    return (
      lowerQuery.includes("микрорайон") ||
      lowerQuery.includes("мкр") ||
      lowerQuery.includes("шағын аудан")
    );
  }

  private normalizeMicrodistrictOrdinal(query: string): string {
    const replacements: Array<[RegExp, string]> = [
      [/(^|\s)перв(ый|ого|ом|ому)(?=\s|$)/giu, "1"],
      [/(^|\s)втор(ой|ого|ом|ому)(?=\s|$)/giu, "2"],
      [/(^|\s)трет(ий|ьего|ьем|ьему)(?=\s|$)/giu, "3"],
      [/(^|\s)четверт(ый|ого|ом|ому)(?=\s|$)/giu, "4"],
      [/(^|\s)пят(ый|ого|ом|ому)(?=\s|$)/giu, "5"],
      [/(^|\s)шест(ой|ого|ом|ому)(?=\s|$)/giu, "6"],
      [/(^|\s)седьм(ой|ого|ом|ому)(?=\s|$)/giu, "7"],
      [/(^|\s)восьм(ой|ого|ом|ому)(?=\s|$)/giu, "8"],
      [/(^|\s)девят(ый|ого|ом|ому)(?=\s|$)/giu, "9"],
      [/(^|\s)десят(ый|ого|ом|ому)(?=\s|$)/giu, "10"],
    ];

    return replacements.reduce(
      (value, [pattern, replacement]) =>
        value.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`),
      query,
    );
  }

  private hasCountryOrCityHint(lowerQuery: string): boolean {
    return (
      lowerQuery.includes("алматы") ||
      lowerQuery.includes("almaty") ||
      lowerQuery.includes("павлодар") ||
      lowerQuery.includes("pavlodar") ||
      lowerQuery.includes("астана") ||
      lowerQuery.includes("astana") ||
      lowerQuery.includes("астана") ||
      lowerQuery.includes("kazakhstan") ||
      lowerQuery.includes("казахстан")
    );
  }

  private normalizeRadiusKm(radiusKm: number | undefined): number {
    if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm)) {
      return 20;
    }

    return Math.min(Math.max(radiusKm, 1), 50);
  }

  private matchesExecutorFilters(
    executor: ExecutorEntity & { user?: UserEntity | null },
    query: NearbyExecutorsQueryDto,
  ): boolean {
    if (!executor.isOnline) {
      return false;
    }

    if (executor.verificationStatus !== "verified") {
      return false;
    }

    if (executor.user?.isBlocked) {
      return false;
    }

    if (
      query.serviceType === ServiceType.TAXI ||
      query.serviceType === ServiceType.INTERCITY
    ) {
      return executor.executorType === ExecutorType.DRIVER;
    }

    if (executor.executorType !== ExecutorType.COURIER) {
      return false;
    }

    if (query.vehicleType && executor.vehicleType !== query.vehicleType) {
      return false;
    }

    return true;
  }

  private buildExecutorLabel(executor: ExecutorEntity): string {
    if (executor.executorType === ExecutorType.DRIVER) {
      return executor.carClass ? `Driver • ${executor.carClass}` : "Driver";
    }

    return executor.vehicleType
      ? `Courier • ${executor.vehicleType}`
      : "Courier";
  }

  private distanceMeters(from: GeoPoint, to: GeoPoint): number {
    const earthRadius = 6_371_000;
    const dLat = this.degToRad(to.lat - from.lat);
    const dLng = this.degToRad(to.lng - from.lng);
    const fromLat = this.degToRad(from.lat);
    const toLat = this.degToRad(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat) *
        Math.cos(toLat) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private compactAddressSuggestion(
    item: GeoAddressSuggestion,
  ): GeoAddressSuggestion {
    return {
      ...item,
      title: this.compactAddress(item.title),
      subtitle: this.compactAddress(item.subtitle),
    };
  }

  private compactAddress(value: string | undefined): string {
    const seen = new Set<string>();
    return (value ?? "")
      .split(",")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter((part) => part.length > 0)
      .filter((part) => {
        const normalized = part.toLowerCase();
        if (this.isAdministrativeAddressPart(normalized)) {
          return false;
        }
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      })
      .slice(0, 4)
      .join(", ");
  }

  private isAdministrativeAddressPart(value: string): boolean {
    if (
      value.includes("микрорайон") ||
      value.includes("мкр") ||
      value.includes("шағын аудан")
    ) {
      return false;
    }

    return (
      value === "казахстан" ||
      value === "қазақстан" ||
      value === "kazakhstan" ||
      value.includes("область") ||
      value.includes("облысы") ||
      value.includes("район") ||
      value.includes("аудан") ||
      value.includes("region")
    );
  }

  private degToRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
