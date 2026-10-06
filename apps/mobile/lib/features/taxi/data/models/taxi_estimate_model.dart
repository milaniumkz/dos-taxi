import '../../domain/entities/taxi_estimate.dart';

class TaxiEstimateModel extends TaxiEstimate {
  const TaxiEstimateModel({
    required super.carClass,
    required super.price,
    required super.currency,
    required super.etaMinutes,
  });

  factory TaxiEstimateModel.fromEstimateResponse({
    required String carClass,
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

    return TaxiEstimateModel(
      carClass: carClass,
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
