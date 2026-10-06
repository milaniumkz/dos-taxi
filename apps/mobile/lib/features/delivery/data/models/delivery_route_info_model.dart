import 'dart:math';

import '../../domain/entities/delivery_route_info.dart';

class DeliveryRouteInfoModel extends DeliveryRouteInfo {
  const DeliveryRouteInfoModel({
    required super.distanceMeters,
    required super.durationSeconds,
  });

  factory DeliveryRouteInfoModel.fromJson(Map<String, dynamic> json) {
    return DeliveryRouteInfoModel(
      distanceMeters: max(
        1,
        ((json['distanceMeters'] ??
                    json['distance_meters'] ??
                    json['distance'] ??
                    0)
                as num)
            .round(),
      ),
      durationSeconds: max(
        1,
        ((json['durationSeconds'] ??
                    json['duration_seconds'] ??
                    json['duration'] ??
                    0)
                as num)
            .round(),
      ),
    );
  }
}
