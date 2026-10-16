import 'package:dartz/dartz.dart';
import '../../../core/errors/failure.dart';
import '../../active_order/domain/entities/active_order_session.dart';

abstract interface class RideRepository {
  Future<Either<Failure, List<Map<String, dynamic>>>> cities();
  Future<Either<Failure, Map<String, dynamic>>> quote(
    Map<String, dynamic> data,
  );
  Future<Either<Failure, ActiveOrderSession>> create(
    Map<String, dynamic> data,
    String key,
  );
  Future<Either<Failure, Map<String, dynamic>>> offers(String orderId);
  Future<Either<Failure, ActiveOrderSession>> accept(
    String orderId,
    String offerId,
    int version,
  );
  Future<Either<Failure, Map<String, dynamic>>> feed(
    double lat,
    double lng,
    int offset,
  );
  Future<Either<Failure, Map<String, dynamic>>> propose(
    String id,
    int steps,
    bool childSeat,
  );
  Future<Either<Failure, Map<String, dynamic>>> take(
    String id,
    String totalPrice,
    bool childSeat,
  );
  Future<Either<Failure, Map<String, dynamic>>> reject(
    String orderId,
    String offerId,
    int version,
  );
  Future<Either<Failure, Map<String, dynamic>>> withdraw(String id);
}
