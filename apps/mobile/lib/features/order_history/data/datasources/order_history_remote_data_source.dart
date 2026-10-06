import '../../domain/entities/history_order.dart';
import '../../../../core/api/api_client.dart';
import '../../domain/repositories/order_history_repository.dart';

class OrderHistoryRemoteDataSource {
  const OrderHistoryRemoteDataSource(this._apiClient);

  final ApiClient _apiClient;

  Future<OrderHistoryPage> fetchOrders({
    required int limit,
    String? cursor,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<Map<String, dynamic>>(
        '/orders/history',
        queryParameters: {
          'limit': limit,
          if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        },
      ),
    );

    final payload = response.data ?? <String, dynamic>{};
    final itemsJson = payload['items'];
    final nextCursor =
        payload['nextCursor'] as String? ?? payload['next_cursor'] as String?;

    final items = itemsJson is List
        ? itemsJson.whereType<Map<String, dynamic>>().map(_mapOrder).toList()
        : <HistoryOrder>[];

    return OrderHistoryPage(items: items, nextCursor: nextCursor);
  }

  HistoryOrder _mapOrder(Map<String, dynamic> json) {
    final routePoints = (json['routePoints'] ?? json['route_points']) is List
        ? (json['routePoints'] ?? json['route_points']) as List
        : const <dynamic>[];
    final firstPoint = routePoints.isNotEmpty
        ? _toMap(routePoints.first)
        : const <String, dynamic>{};
    final lastPoint = routePoints.isNotEmpty
        ? _toMap(routePoints.last)
        : const <String, dynamic>{};

    final createdAtRaw =
        json['createdAt'] as String? ??
        json['created_at'] as String? ??
        DateTime.now().toIso8601String();

    final priceRaw =
        json['finalPrice'] ??
        json['final_price'] ??
        json['estimatedPrice'] ??
        json['estimated_price'] ??
        0;

    return HistoryOrder(
      id: json['id'] as String? ?? '',
      serviceType:
          json['serviceType'] as String? ??
          json['service_type'] as String? ??
          'taxi',
      status: json['status'] as String? ?? 'completed',
      fromTitle: firstPoint['address'] as String? ?? '',
      toTitle: lastPoint['address'] as String? ?? '',
      price: _toDouble(priceRaw),
      currency: json['currency'] as String? ?? 'KZT',
      createdAt: DateTime.tryParse(createdAtRaw) ?? DateTime.now(),
      distanceMeters: _toInt(json['distanceMeters'] ?? json['distance_meters']),
      durationSeconds: _toInt(
        json['durationSeconds'] ?? json['duration_seconds'],
      ),
      executorRating: _toNullableInt(
        json['executorRating'] ?? json['executor_rating'],
      ),
    );
  }

  Map<String, dynamic> _toMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }
    return const <String, dynamic>{};
  }

  double _toDouble(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }
    if (value is String) {
      return double.tryParse(value) ?? 0;
    }
    return 0;
  }

  int _toInt(dynamic value) => _toDouble(value).round();

  int? _toNullableInt(dynamic value) {
    if (value == null) {
      return null;
    }
    return _toInt(value);
  }
}
