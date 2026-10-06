import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/active_order_session.dart';
import '../entities/active_order_tracking_event.dart';

abstract class ActiveOrderRepository {
  Future<Either<Failure, ActiveOrderSession?>> fetchActiveOrder();

  Stream<ActiveOrderTrackingEvent> trackOrder(ActiveOrderSession session);

  Future<Either<Failure, void>> cancelOrder(String orderId);

  Future<Either<Failure, void>> rateOrder({
    required String orderId,
    required int rating,
  });
}
