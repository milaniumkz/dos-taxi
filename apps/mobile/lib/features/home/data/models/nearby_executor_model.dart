import 'package:latlong2/latlong.dart';

import '../../domain/entities/nearby_executor.dart';

class NearbyExecutorModel extends NearbyExecutor {
  const NearbyExecutorModel({
    required super.id,
    required super.location,
    required super.label,
  });

  factory NearbyExecutorModel.fromJson(Map<String, dynamic> json) {
    final lat = (json['lat'] ?? json['latitude'] ?? 43.238949) as num;
    final lng = (json['lng'] ?? json['longitude'] ?? 76.889709) as num;
    return NearbyExecutorModel(
      id: json['id'] as String? ?? '${lat}_$lng',
      location: LatLng(lat.toDouble(), lng.toDouble()),
      label: json['label'] as String? ?? json['type'] as String? ?? 'Executor',
    );
  }
}
