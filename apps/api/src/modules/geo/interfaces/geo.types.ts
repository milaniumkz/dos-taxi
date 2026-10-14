export type GeoPoint = {
  lat: number;
  lng: number;
};

export type GeoAddressSuggestion = {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
};

export type GeoManeuver = {
  point: GeoPoint;
  type: string;
  modifier?: string;
  exit?: number;
  roadName: string;
  distanceFromStartMeters: number;
  bearingAfter: number;
};
export type GeoRouteResult = {
  maneuvers?: GeoManeuver[];
  polyline: string;
  points: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
};
