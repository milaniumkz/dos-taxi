import 'package:equatable/equatable.dart';

class TaxiEstimate extends Equatable {
  const TaxiEstimate({
    required this.carClass,
    required this.price,
    required this.currency,
    required this.etaMinutes,
    this.discountAmount = 0,
    this.availablePaymentMethods = const [],
  });

  final String carClass;
  final double price;
  final String currency;
  final int etaMinutes;
  final double discountAmount;
  final List<String> availablePaymentMethods;
  double get originalPrice => price + discountAmount;

  TaxiEstimate withoutPromo() => TaxiEstimate(
    carClass: carClass,
    price: originalPrice,
    availablePaymentMethods: availablePaymentMethods,
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
    availablePaymentMethods,
  ];
}
