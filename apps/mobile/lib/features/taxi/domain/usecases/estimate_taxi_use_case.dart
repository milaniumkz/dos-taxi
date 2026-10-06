import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../entities/taxi_estimate.dart';
import '../repositories/taxi_repository.dart';

class EstimateTaxiParams extends Equatable {
  const EstimateTaxiParams({
    required this.pickup,
    required this.destination,
    required this.distanceMeters,
    required this.durationSeconds,
    this.promoCode,
    this.serviceType = 'taxi',
  });

  final AddressSuggestion pickup;
  final AddressSuggestion destination;
  final int distanceMeters;
  final int durationSeconds;
  final String? promoCode;
  final String serviceType;

  @override
  List<Object?> get props => [
    pickup,
    destination,
    distanceMeters,
    durationSeconds,
    promoCode,
    serviceType,
  ];
}

class EstimateTaxiUseCase {
  const EstimateTaxiUseCase(this._repository);

  final TaxiRepository _repository;

  Future<Either<Failure, List<TaxiEstimate>>> call(EstimateTaxiParams params) {
    return _repository.estimateTaxi(params);
  }
}
