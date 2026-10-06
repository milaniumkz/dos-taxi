import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/history_order.dart';

class OrderHistoryPage {
  const OrderHistoryPage({required this.items, required this.nextCursor});

  final List<HistoryOrder> items;
  final String? nextCursor;
}

abstract class OrderHistoryRepository {
  Future<Either<Failure, OrderHistoryPage>> fetchOrders({
    required int limit,
    String? cursor,
  });
}
