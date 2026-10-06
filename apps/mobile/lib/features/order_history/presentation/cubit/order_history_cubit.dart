import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/history_order.dart';
import '../../domain/repositories/order_history_repository.dart';

part 'order_history_state.dart';

enum OrderHistoryFilter { all, taxi, delivery }

class OrderHistoryCubit extends Cubit<OrderHistoryState> {
  OrderHistoryCubit(this._repository) : super(const OrderHistoryState());

  final OrderHistoryRepository _repository;

  Future<void> loadInitial() async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    final result = await _repository.fetchOrders(limit: 20);
    result.fold(
      (failure) =>
          emit(state.copyWith(isLoading: false, errorMessage: failure.message)),
      (page) => emit(
        state.copyWith(
          isLoading: false,
          items: page.items,
          nextCursor: page.nextCursor,
          errorMessage: null,
        ),
      ),
    );
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || state.nextCursor == null) {
      return;
    }

    emit(state.copyWith(isLoadingMore: true, errorMessage: null));
    final result = await _repository.fetchOrders(
      limit: 20,
      cursor: state.nextCursor,
    );
    result.fold(
      (failure) => emit(
        state.copyWith(isLoadingMore: false, errorMessage: failure.message),
      ),
      (page) => emit(
        state.copyWith(
          isLoadingMore: false,
          items: [...state.items, ...page.items],
          nextCursor: page.nextCursor,
        ),
      ),
    );
  }

  void setFilter(OrderHistoryFilter filter) {
    emit(state.copyWith(filter: filter));
  }
}
