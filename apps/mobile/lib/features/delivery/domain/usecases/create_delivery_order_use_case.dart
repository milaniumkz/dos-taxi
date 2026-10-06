import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/create_delivery_order_params.dart';
import '../repositories/delivery_repository.dart';

class CreateDeliveryOrderUseCase {
  const CreateDeliveryOrderUseCase(this._repository);

  final DeliveryRepository _repository;

  Future<Either<Failure, String>> call(CreateDeliveryOrderParams params) {
    return _repository.createDeliveryOrder(params);
  }
}
