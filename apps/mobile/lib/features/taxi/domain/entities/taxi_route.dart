import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

class TaxiRoute extends Equatable {
  const TaxiRoute({
    required this.polylinePoints,
    required this.distanceMeters,
    required this.durationSeconds,
  });

  final List<LatLng> polylinePoints;
  final int distanceMeters;
  final int durationSeconds;

  @override
  List<Object?> get props => [polylinePoints, distanceMeters, durationSeconds];
}
