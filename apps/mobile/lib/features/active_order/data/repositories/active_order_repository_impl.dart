import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/active_order_session.dart';
import '../../domain/entities/active_order_tracking_event.dart';
import '../../domain/repositories/active_order_repository.dart';
import '../datasources/active_order_remote_data_source.dart';

class ActiveOrderRepositoryImpl implements ActiveOrderRepository {
  const ActiveOrderRepositoryImpl(this._remoteDataSource);

  final ActiveOrderRemoteDataSource _remoteDataSource;

  @override
  Future<Either<Failure, ActiveOrderSession?>> fetchActiveOrder() async {
    try {
      final session = await _remoteDataSource.fetchActiveOrder();
      return Right(session);
    } on Failure catch (failure) {
      if (failure.code == 'CLIENT_ACTIVE_ORDER_NOT_FOUND') {
        return const Right(null);
      }
      return Left(failure);
    } catch (_) {
      return const Left(
        Failure(
          code: 'ACTIVE_ORDER_FETCH_FAILED',
          message: 'Не удалось восстановить активный заказ',
        ),
      );
    }
  }

  @override
  Stream<ActiveOrderTrackingEvent> trackOrder(ActiveOrderSession session) {
    return _remoteDataSource.trackOrder(session);
  }

  @override
  Future<Either<Failure, void>> cancelOrder(String orderId) async {
    try {
      await _remoteDataSource.cancelOrder(orderId);
      return const Right(null);
    } on Failure {
      return const Right(null);
    } catch (_) {
      return const Right(null);
    }
  }

  @override
  Future<Either<Failure, void>> rateOrder({
    required String orderId,
    required int rating,
  }) async {
    try {
      await _remoteDataSource.rateOrder(orderId: orderId, rating: rating);
      return const Right(null);
    } on Failure catch (failure) {
      return Left(failure);
    } catch (_) {
      return const Left(
        Failure(
          code: 'ORDER_RATE_FAILED',
          message: 'Не удалось отправить оценку',
        ),
      );
    }
  }
}
