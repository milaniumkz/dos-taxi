part of 'order_history_cubit.dart';

class OrderHistoryState extends Equatable {
  const OrderHistoryState({
    this.items = const [],
    this.filter = OrderHistoryFilter.all,
    this.nextCursor,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
  });

  final List<HistoryOrder> items;
  final OrderHistoryFilter filter;
  final String? nextCursor;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;

  List<HistoryOrder> get visibleItems {
    switch (filter) {
      case OrderHistoryFilter.taxi:
        return items.where((item) => item.serviceType == 'taxi').toList();
      case OrderHistoryFilter.delivery:
        return items.where((item) => item.serviceType == 'delivery').toList();
      case OrderHistoryFilter.all:
        return items;
    }
  }

  OrderHistoryState copyWith({
    List<HistoryOrder>? items,
    OrderHistoryFilter? filter,
    Object? nextCursor = _unset,
    bool? isLoading,
    bool? isLoadingMore,
    Object? errorMessage = _unset,
  }) {
    return OrderHistoryState(
      items: items ?? this.items,
      filter: filter ?? this.filter,
      nextCursor: nextCursor == _unset
          ? this.nextCursor
          : nextCursor as String?,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [
    items,
    filter,
    nextCursor,
    isLoading,
    isLoadingMore,
    errorMessage,
  ];
}

const _unset = Object();
