import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

class NearbyExecutor extends Equatable {
  const NearbyExecutor({
    required this.id,
    required this.location,
    required this.label,
  });

  final String id;
  final LatLng location;
  final String label;

  @override
  List<Object?> get props => [id, location, label];
}
