import '../../domain/entities/delivery_estimate.dart';
import '../../domain/enums/courier_vehicle_type.dart';

class DeliveryEstimateModel extends DeliveryEstimate {
  const DeliveryEstimateModel({
    required super.vehicleType,
    required super.price,
    required super.currency,
    required super.etaMinutes,
  });

  factory DeliveryEstimateModel.fromEstimateResponse({
    required CourierVehicleType vehicleType,
    required Map<String, dynamic> json,
    required double fallbackPrice,
    required int fallbackEtaMinutes,
  }) {
    final rawPrice =
        json['estimatedPrice'] ??
        json['estimated_price'] ??
        json['price'] ??
        fallbackPrice;
    final rawEta =
        json['etaMinutes'] ??
        json['eta_minutes'] ??
        json['etaSeconds'] ??
        json['eta_seconds'] ??
        fallbackEtaMinutes;

    return DeliveryEstimateModel(
      vehicleType: vehicleType,
      price: (rawPrice as num).toDouble(),
      currency: json['currency'] as String? ?? 'KZT',
      etaMinutes: rawEta is num
          ? rawEta > 60
                ? (rawEta / 60).ceil()
                : rawEta.round()
          : fallbackEtaMinutes,
    );
  }
}
