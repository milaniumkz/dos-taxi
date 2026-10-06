import 'package:equatable/equatable.dart';

import '../enums/courier_vehicle_type.dart';

class DeliveryEstimate extends Equatable {
  const DeliveryEstimate({
    required this.vehicleType,
    required this.price,
    required this.currency,
    required this.etaMinutes,
  });

  final CourierVehicleType vehicleType;
  final double price;
  final String currency;
  final int etaMinutes;

  @override
  List<Object?> get props => [vehicleType, price, currency, etaMinutes];
}
