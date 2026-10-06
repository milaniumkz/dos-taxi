import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/features/order_history/domain/entities/history_order.dart';
import 'package:dos_mobile/features/order_history/domain/repositories/order_history_repository.dart';
import 'package:dos_mobile/features/order_history/presentation/cubit/order_history_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockOrderHistoryRepository extends Mock
    implements OrderHistoryRepository {}

void main() {
  late OrderHistoryRepository repository;

  final firstPage = OrderHistoryPage(
    items: [
      HistoryOrder(
        id: 'order-1',
        serviceType: 'taxi',
        status: 'completed',
        fromTitle: 'Abay 10',
        toTitle: 'Dostyk 15',
        price: 1600,
        currency: 'KZT',
        createdAt: DateTime(2025, 1, 1, 10),
        distanceMeters: 5400,
        durationSeconds: 900,
      ),
    ],
    nextCursor: 'cursor-1',
  );
  final secondPage = OrderHistoryPage(
    items: [
      HistoryOrder(
        id: 'order-2',
        serviceType: 'delivery',
        status: 'completed',
        fromTitle: 'Tole Bi 20',
        toTitle: 'Satpayev 9',
        price: 2300,
        currency: 'KZT',
        createdAt: DateTime(2025, 1, 2, 12),
        distanceMeters: 7200,
        durationSeconds: 1200,
      ),
    ],
    nextCursor: null,
  );

  setUp(() {
    repository = _MockOrderHistoryRepository();
    when(
      () => repository.fetchOrders(limit: 20, cursor: any(named: 'cursor')),
    ).thenAnswer((_) async => Right(firstPage));
  });

  OrderHistoryCubit buildCubit() => OrderHistoryCubit(repository);

  blocTest<OrderHistoryCubit, OrderHistoryState>(
    'loads initial history page',
    build: buildCubit,
    act: (cubit) => cubit.loadInitial(),
    expect: () => [
      isA<OrderHistoryState>().having(
        (state) => state.isLoading,
        'isLoading',
        true,
      ),
      isA<OrderHistoryState>()
          .having((state) => state.isLoading, 'isLoading', false)
          .having((state) => state.items.length, 'items', 1)
          .having((state) => state.nextCursor, 'nextCursor', 'cursor-1'),
    ],
  );

  blocTest<OrderHistoryCubit, OrderHistoryState>(
    'appends next page on loadMore',
    setUp: () {
      when(
        () => repository.fetchOrders(limit: 20, cursor: any(named: 'cursor')),
      ).thenAnswer((invocation) async {
        final cursor = invocation.namedArguments[#cursor] as String?;
        return Right(cursor == null ? firstPage : secondPage);
      });
    },
    build: buildCubit,
    act: (cubit) async {
      await cubit.loadInitial();
      await cubit.loadMore();
    },
    expect: () => [
      isA<OrderHistoryState>().having(
        (state) => state.isLoading,
        'isLoading',
        true,
      ),
      isA<OrderHistoryState>()
          .having((state) => state.items.length, 'items', 1)
          .having((state) => state.nextCursor, 'nextCursor', 'cursor-1'),
      isA<OrderHistoryState>().having(
        (state) => state.isLoadingMore,
        'isLoadingMore',
        true,
      ),
      isA<OrderHistoryState>()
          .having((state) => state.isLoadingMore, 'isLoadingMore', false)
          .having((state) => state.items.length, 'items', 2)
          .having((state) => state.nextCursor, 'nextCursor', isNull),
    ],
  );

  blocTest<OrderHistoryCubit, OrderHistoryState>(
    'surfaces repository failure',
    setUp: () {
      when(
        () => repository.fetchOrders(limit: 20, cursor: any(named: 'cursor')),
      ).thenAnswer(
        (_) async => const Left(
          Failure(
            code: 'ORDER_HISTORY_FAILED',
            message: 'Failed to fetch order history',
          ),
        ),
      );
    },
    build: buildCubit,
    act: (cubit) => cubit.loadInitial(),
    expect: () => [
      isA<OrderHistoryState>().having(
        (state) => state.isLoading,
        'isLoading',
        true,
      ),
      isA<OrderHistoryState>().having(
        (state) => state.errorMessage,
        'errorMessage',
        'Failed to fetch order history',
      ),
    ],
  );
}
