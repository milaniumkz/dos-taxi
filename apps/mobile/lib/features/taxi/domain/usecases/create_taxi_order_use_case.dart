import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/create_taxi_order_params.dart';
import '../repositories/taxi_repository.dart';

class CreateTaxiOrderUseCase {
  const CreateTaxiOrderUseCase(this._repository);

  final TaxiRepository _repository;

  Future<Either<Failure, String>> call(CreateTaxiOrderParams params) {
    return _repository.createTaxiOrder(params);
  }
}
