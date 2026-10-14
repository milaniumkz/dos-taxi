import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetchWithProxy } from "../../../shared/http/fetch-with-proxy";

import { GeoPoint, GeoRouteResult } from "../interfaces/geo.types";

type OsrmResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    legs?: Array<{
      steps?: Array<{
        distance: number;
        name?: string;
        maneuver: {
          location: [number, number];
          type: string;
          modifier?: string;
          exit?: number;
          bearing_after?: number;
        };
      }>;
    }>;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

@Injectable()
export class OsrmAdapter {
  constructor(private readonly configService: ConfigService) {}

  async route(points: GeoPoint[], navigation = false): Promise<GeoRouteResult> {
    const coordinates = points
      .map((point) => `${point.lng},${point.lat}`)
      .join(";");
    const url = new URL(`/route/v1/driving/${coordinates}`, this.getBaseUrl());
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", navigation ? "true" : "false");
    url.searchParams.set("alternatives", "false");

    const payload = await this.requestJson<OsrmResponse>(url);
    const route = payload.routes?.[0];

    if (!route) {
      throw new BadGatewayException({
        code: "GEO_ROUTE_UNAVAILABLE",
        message: "OSRM did not return a route",
      });
    }

    const routePoints = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]) => ({
        lat,
        lng,
      }),
    );

    let distance = 0;
    const maneuvers = (route.legs ?? []).flatMap((leg) =>
      (leg.steps ?? []).map((step) => {
        const maneuver = {
          point: {
            lng: step.maneuver.location[0],
            lat: step.maneuver.location[1],
          },
          type: step.maneuver.type,
          modifier: step.maneuver.modifier,
          exit: step.maneuver.exit,
          roadName: step.name ?? "",
          distanceFromStartMeters: Math.round(distance),
          bearingAfter: step.maneuver.bearing_after ?? 0,
        };
        distance += step.distance;
        return maneuver;
      }),
    );
    if (navigation && (routePoints.length < 2 || maneuvers.length < 2)) {
      throw new BadGatewayException({
        code: "GEO_ROUTE_UNAVAILABLE",
        message: "Road route with maneuvers unavailable",
      });
    }
    return {
      ...(navigation ? { maneuvers } : {}),
      polyline: JSON.stringify(route.geometry?.coordinates ?? []),
      points: routePoints,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };
  }

  private async requestJson<T>(url: URL): Promise<T> {
    try {
      const response = await fetchWithProxy(url, {
        signal: AbortSignal.timeout(12000),
        headers: {
          Accept: "application/json",
          "User-Agent": "DOSPlatform/1.0 (+https://dos.local)",
        },
      });

      if (!response.ok) {
        throw new BadGatewayException({
          code: "GEO_PROVIDER_UNAVAILABLE",
          message: "Failed to fetch route from OSRM",
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException({
        code: "GEO_PROVIDER_UNAVAILABLE",
        message: "Route provider unavailable",
      });
    }
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>("OSRM_BASE_URL") ??
      "https://router.project-osrm.org"
    );
  }
}
