import 'dart:math';

import 'package:latlong2/latlong.dart';

import '../../domain/entities/taxi_route.dart';

class TaxiRouteModel extends TaxiRoute {
  const TaxiRouteModel({
    required super.polylinePoints,
    required super.distanceMeters,
    required super.durationSeconds,
  });

  factory TaxiRouteModel.fromJson({
    required Map<String, dynamic> json,
    required List<LatLng> fallbackPoints,
    required int fallbackDistanceMeters,
    required int fallbackDurationSeconds,
  }) {
    final pointsPayload =
        json['points'] ?? json['coordinates'] ?? json['polylinePoints'];

    return TaxiRouteModel(
      polylinePoints: _parsePoints(pointsPayload, fallbackPoints),
      distanceMeters: max(
        1,
        ((json['distanceMeters'] ??
                    json['distance_meters'] ??
                    json['distance'] ??
                    fallbackDistanceMeters)
                as num)
            .round(),
      ),
      durationSeconds: max(
        1,
        ((json['durationSeconds'] ??
                    json['duration_seconds'] ??
                    json['duration'] ??
                    fallbackDurationSeconds)
                as num)
            .round(),
      ),
    );
  }

  static List<LatLng> _parsePoints(
    dynamic payload,
    List<LatLng> fallbackPoints,
  ) {
    if (payload is! List) {
      return fallbackPoints;
    }

    final points = payload
        .map((item) {
          if (item is Map<String, dynamic>) {
            final lat = item['lat'] ?? item['latitude'];
            final lng = item['lng'] ?? item['lon'] ?? item['longitude'];
            if (lat is num && lng is num) {
              return LatLng(lat.toDouble(), lng.toDouble());
            }
          }

          if (item is List && item.length >= 2) {
            final lat = item[0];
            final lng = item[1];
            if (lat is num && lng is num) {
              return LatLng(lat.toDouble(), lng.toDouble());
            }
          }

          return null;
        })
        .whereType<LatLng>()
        .toList();

    return points.isEmpty ? fallbackPoints : points;
  }
}
