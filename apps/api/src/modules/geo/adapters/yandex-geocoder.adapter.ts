import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { GeoAddressSuggestion } from "../interfaces/geo.types";

type YandexGeoObject = {
  name?: string;
  description?: string;
  Point?: {
    pos?: string;
  };
  metaDataProperty?: {
    GeocoderMetaData?: {
      text?: string;
      Address?: {
        formatted?: string;
        Components?: Array<{
          kind?: string;
          name?: string;
        }>;
      };
    };
  };
};

type YandexGeocoderResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: YandexGeoObject;
      }>;
    };
  };
};

type YandexGeocoderOptions = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

@Injectable()
export class YandexGeocoderAdapter {
  constructor(private readonly configService: ConfigService) {}

  async autocomplete(
    query: string,
    options: YandexGeocoderOptions = {},
  ): Promise<GeoAddressSuggestion[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return [];
    }

    const url = new URL("/v1/", this.getBaseUrl());
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("lang", "ru_RU");
    url.searchParams.set("results", "10");
    url.searchParams.set("geocode", query);

    if (
      typeof options.lat === "number" &&
      Number.isFinite(options.lat) &&
      typeof options.lng === "number" &&
      Number.isFinite(options.lng)
    ) {
      url.searchParams.set("ll", `${options.lng},${options.lat}`);
      const span = this.radiusToSpan(options.lat, options.radiusKm);
      url.searchParams.set("spn", `${span.lng},${span.lat}`);
      url.searchParams.set("rspn", "1");
    }

    const payload = await this.requestJson<YandexGeocoderResponse>(url);
    return (
      payload.response?.GeoObjectCollection?.featureMember
        ?.map((member) => member.GeoObject)
        .filter((item): item is YandexGeoObject => item != null)
        .map((item) => this.mapObject(item))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
        .slice(0, 10) ?? []
    );
  }

  private radiusToSpan(lat: number, radiusKm: number | undefined): {
    lat: number;
    lng: number;
  } {
    const normalizedRadius =
      typeof radiusKm === "number" && Number.isFinite(radiusKm)
        ? Math.min(Math.max(radiusKm, 1), 50)
        : 20;
    return {
      lat: normalizedRadius / 110.574,
      lng:
        normalizedRadius /
        (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1)),
    };
  }

  private mapObject(item: YandexGeoObject): GeoAddressSuggestion {
    const meta = item.metaDataProperty?.GeocoderMetaData;
    const components = meta?.Address?.Components ?? [];
    const formatted = meta?.Address?.formatted ?? meta?.text ?? "";
    const [lng, lat] = (item.Point?.pos ?? "")
      .split(" ")
      .map((value) => Number(value));

    const street = this.component(components, "street");
    const district = this.component(components, "district");
    const house = this.component(components, "house");
    const locality =
      this.component(components, "locality") ??
      this.component(components, "province") ??
      item.description;
    const routePart = street ?? district;
    const title = this.compact([routePart, house].filter(Boolean).join(", "));

    return {
      title: title || item.name || this.firstPart(formatted),
      subtitle: this.compact(locality ?? item.description ?? ""),
      lat,
      lng,
    };
  }

  private component(
    components: Array<{ kind?: string; name?: string }>,
    kind: string,
  ): string | undefined {
    return components.find((component) => component.kind === kind)?.name;
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ru",
      },
    });

    if (!response.ok) {
      throw new BadGatewayException({
        code: "GEO_PROVIDER_UNAVAILABLE",
        message: "Failed to fetch data from Yandex Geocoder",
      });
    }

    return (await response.json()) as T;
  }

  private firstPart(value: string): string {
    return (
      value
        .split(",")
        .map((part) => part.trim())
        .find((part) => part.length > 0) ?? ""
    );
  }

  private compact(value: string | undefined): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  private getApiKey(): string | undefined {
    return this.configService.get<string>("YANDEX_GEOCODER_API_KEY");
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>("YANDEX_GEOCODER_BASE_URL") ??
      "https://geocode-maps.yandex.ru"
    );
  }
}
