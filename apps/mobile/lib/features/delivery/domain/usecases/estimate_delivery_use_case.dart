import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../entities/delivery_estimate.dart';
import '../repositories/delivery_repository.dart';

class EstimateDeliveryParams extends Equatable {
  const EstimateDeliveryParams({
    required this.fromAddress,
    required this.toAddress,
    required this.distanceMeters,
    required this.durationSeconds,
    this.promoCode,
    required this.isFragile,
    required this.requiresReturn,
    this.declaredValue,
    this.cashOnDelivery,
  });

  final AddressSuggestion fromAddress;
  final AddressSuggestion toAddress;
  final int distanceMeters;
  final int durationSeconds;
  final String? promoCode;
  final bool isFragile;
  final bool requiresReturn;
  final double? declaredValue;
  final double? cashOnDelivery;

  @override
  List<Object?> get props => [
    fromAddress,
    toAddress,
    distanceMeters,
    durationSeconds,
    promoCode,
    isFragile,
    requiresReturn,
    declaredValue,
    cashOnDelivery,
  ];
}

class EstimateDeliveryUseCase {
  const EstimateDeliveryUseCase(this._repository);

  final DeliveryRepository _repository;

  Future<Either<Failure, List<DeliveryEstimate>>> call(
    EstimateDeliveryParams params,
  ) {
    return _repository.estimateDelivery(params);
  }
}
