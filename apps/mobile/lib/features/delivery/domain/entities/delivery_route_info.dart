import 'package:equatable/equatable.dart';

class DeliveryRouteInfo extends Equatable {
  const DeliveryRouteInfo({
    required this.distanceMeters,
    required this.durationSeconds,
  });

  final int distanceMeters;
  final int durationSeconds;

  @override
  List<Object?> get props => [distanceMeters, durationSeconds];
}
