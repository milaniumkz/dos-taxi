import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/repositories/order_history_repository.dart';
import '../datasources/order_history_remote_data_source.dart';

class OrderHistoryRepositoryImpl implements OrderHistoryRepository {
  const OrderHistoryRepositoryImpl(this._remoteDataSource);

  final OrderHistoryRemoteDataSource _remoteDataSource;

  @override
  Future<Either<Failure, OrderHistoryPage>> fetchOrders({
    required int limit,
    String? cursor,
  }) async {
    try {
      final result = await _remoteDataSource.fetchOrders(
        limit: limit,
        cursor: cursor,
      );
      return right(result);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'ORDER_HISTORY_FETCH_FAILED',
          message: 'Не удалось загрузить историю заказов',
        ),
      );
    }
  }
}
