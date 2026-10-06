import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithProxy } from '../../../shared/http/fetch-with-proxy';

import { GeoPoint, GeoRouteResult } from '../interfaces/geo.types';

type OsrmResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

@Injectable()
export class OsrmAdapter {
  constructor(private readonly configService: ConfigService) {}

  async route(points: GeoPoint[]): Promise<GeoRouteResult> {
    const coordinates = points
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');
    const url = new URL(
      `/route/v1/driving/${coordinates}`,
      this.getBaseUrl(),
    );
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('steps', 'false');
    url.searchParams.set('alternatives', 'false');

    const payload = await this.requestJson<OsrmResponse>(url);
    const route = payload.routes?.[0];

    if (!route) {
      throw new BadGatewayException({
        code: 'GEO_ROUTE_UNAVAILABLE',
        message: 'OSRM did not return a route',
      });
    }

    const routePoints = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]) => ({
        lat,
        lng,
      }),
    );

    return {
      polyline: JSON.stringify(route.geometry?.coordinates ?? []),
      points: routePoints,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };
  }

  private async requestJson<T>(url: URL): Promise<T> {
    const response = await fetchWithProxy(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DOSPlatform/1.0 (+https://dos.local)',
      },
    });

    if (!response.ok) {
      throw new BadGatewayException({
        code: 'GEO_PROVIDER_UNAVAILABLE',
        message: 'Failed to fetch route from OSRM',
      });
    }

    return (await response.json()) as T;
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>('OSRM_BASE_URL') ??
      'https://router.project-osrm.org'
    );
  }
}
