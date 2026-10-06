import 'package:equatable/equatable.dart';

class TaxiEstimate extends Equatable {
  const TaxiEstimate({
    required this.carClass,
    required this.price,
    required this.currency,
    required this.etaMinutes,
    this.discountAmount = 0,
  });

  final String carClass;
  final double price;
  final String currency;
  final int etaMinutes;
  final double discountAmount;
  double get originalPrice => price + discountAmount;

  TaxiEstimate withoutPromo() => TaxiEstimate(
    carClass: carClass,
    price: originalPrice,
    currency: currency,
    etaMinutes: etaMinutes,
  );

  @override
  List<Object?> get props => [
    carClass,
    price,
    currency,
    etaMinutes,
    discountAmount,
  ];
}
