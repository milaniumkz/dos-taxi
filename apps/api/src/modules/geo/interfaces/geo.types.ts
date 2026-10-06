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

export type GeoRouteResult = {
  polyline: string;
  points: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
};
