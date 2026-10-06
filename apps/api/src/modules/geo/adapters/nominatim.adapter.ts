import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetchWithProxy } from '../../../shared/http/fetch-with-proxy';

import { GeoAddressSuggestion } from "../interfaces/geo.types";

type NominatimSearchItem = {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
};

type NominatimSearchOptions = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

@Injectable()
export class NominatimAdapter {
  constructor(private readonly configService: ConfigService) {}

  async geocode(
    query: string,
    options: NominatimSearchOptions = {},
  ): Promise<GeoAddressSuggestion[]> {
    return this.search(query, 1, options);
  }

  async autocomplete(
    query: string,
    options: NominatimSearchOptions = {},
  ): Promise<GeoAddressSuggestion[]> {
    return this.search(query, 10, options);
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<GeoAddressSuggestion> {
    const url = new URL("/reverse", this.getBaseUrl());
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "ru");

    const payload = await this.requestJson<NominatimSearchItem>(url);
    return this.mapItem(payload);
  }

  private async search(
    query: string,
    limit: number,
    options: NominatimSearchOptions,
  ): Promise<GeoAddressSuggestion[]> {
    const url = new URL("/search", this.getBaseUrl());
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "ru");
    url.searchParams.set("countrycodes", "kz");
    const viewbox = this.buildViewbox(options);
    if (viewbox) {
      url.searchParams.set("bounded", "1");
      url.searchParams.set("viewbox", viewbox);
    }
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("q", query);

    const payload = await this.requestJson<NominatimSearchItem[]>(url);
    return payload.map((item) => this.mapItem(item));
  }

  private buildViewbox(options: NominatimSearchOptions): string | null {
    if (
      typeof options.lat !== "number" ||
      !Number.isFinite(options.lat) ||
      typeof options.lng !== "number" ||
      !Number.isFinite(options.lng)
    ) {
      return null;
    }

    const radiusKm =
      typeof options.radiusKm === "number" && Number.isFinite(options.radiusKm)
        ? Math.min(Math.max(options.radiusKm, 1), 50)
        : 20;
    const latDelta = radiusKm / 110.574;
    const lngDelta =
      radiusKm /
      (111.32 * Math.max(Math.cos((options.lat * Math.PI) / 180), 0.1));
    const left = options.lng - lngDelta;
    const right = options.lng + lngDelta;
    const top = options.lat + latDelta;
    const bottom = options.lat - latDelta;
    return `${left},${top},${right},${bottom}`;
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const response = await fetchWithProxy(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "ru",
        "User-Agent": "DOSPlatform/1.0 (+https://dos.local)",
      },
    });

    if (!response.ok) {
      throw new BadGatewayException({
        code: "GEO_PROVIDER_UNAVAILABLE",
        message: "Failed to fetch data from Nominatim",
      });
    }

    return (await response.json()) as T;
  }

  private mapItem(item: NominatimSearchItem): GeoAddressSuggestion {
    const displayName = item.display_name ?? item.name ?? "";
    const address = item.address;
    const road =
      address?.road ?? address?.pedestrian ?? address?.footway ?? undefined;
    const houseNumber = address?.house_number;
    const title =
      this.compact([road, houseNumber].join(" ")) ||
      this.compact(item.name) ||
      this.firstDisplayNamePart(displayName);
    const subtitle = this.uniqueParts([
      address?.neighbourhood,
      address?.suburb,
      address?.city_district,
      address?.city ?? address?.town ?? address?.village,
    ]).join(", ");

    return {
      title: title || displayName,
      subtitle:
        subtitle ||
        displayName
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .slice(1)
          .join(", "),
      lat: Number(item.lat),
      lng: Number(item.lon),
    };
  }

  private firstDisplayNamePart(displayName: string): string {
    return (
      displayName
        .split(",")
        .map((part) => part.trim())
        .find((part) => part.length > 0) ?? ""
    );
  }

  private uniqueParts(parts: Array<string | undefined>): string[] {
    const seen = new Set<string>();
    return parts
      .map((part) => this.compact(part))
      .filter((part) => part.length > 0)
      .filter((part) => {
        const key = part.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private compact(value: string | undefined): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>("NOMINATIM_BASE_URL") ??
      "https://nominatim.openstreetmap.org"
    );
  }
}
