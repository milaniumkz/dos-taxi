import 'package:equatable/equatable.dart';

import '../../../home/domain/entities/address_suggestion.dart';

class CreateTaxiOrderParams extends Equatable {
  const CreateTaxiOrderParams({
    required this.pickup,
    required this.destination,
    required this.carClass,
    required this.paymentMethod,
    required this.distanceMeters,
    required this.durationSeconds,
    this.serviceType = 'taxi',
    this.promoCode,
  });

  final AddressSuggestion pickup;
  final AddressSuggestion destination;
  final String carClass;
  final String paymentMethod;
  final int distanceMeters;
  final int durationSeconds;
  final String serviceType;
  final String? promoCode;

  @override
  List<Object?> get props => [
    pickup,
    destination,
    carClass,
    paymentMethod,
    distanceMeters,
    durationSeconds,
    serviceType,
    promoCode,
  ];
}
