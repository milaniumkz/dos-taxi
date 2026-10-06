import 'package:equatable/equatable.dart';

class TaxiEstimate extends Equatable {
  const TaxiEstimate({
    required this.carClass,
    required this.price,
    required this.currency,
    required this.etaMinutes,
  });

  final String carClass;
  final double price;
  final String currency;
  final int etaMinutes;

  @override
  List<Object?> get props => [carClass, price, currency, etaMinutes];
}
