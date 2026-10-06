import 'package:equatable/equatable.dart';

import '../enums/courier_vehicle_type.dart';

class DeliveryEstimate extends Equatable {
  const DeliveryEstimate({
    required this.vehicleType,
    required this.price,
    required this.currency,
    required this.etaMinutes,
    this.discountAmount = 0,
  });

  final CourierVehicleType vehicleType;
  final double price;
  final String currency;
  final int etaMinutes;
  final double discountAmount;
  double get originalPrice => price + discountAmount;

  DeliveryEstimate withoutPromo() => DeliveryEstimate(
    vehicleType: vehicleType,
    price: originalPrice,
    currency: currency,
    etaMinutes: etaMinutes,
  );

  @override
  List<Object?> get props => [
    vehicleType,
    price,
    currency,
    etaMinutes,
    discountAmount,
  ];
}
