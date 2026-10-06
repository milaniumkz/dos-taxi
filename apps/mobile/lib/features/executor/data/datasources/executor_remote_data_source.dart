import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:latlong2/latlong.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failure.dart';
import '../../../../core/storage/token_storage.dart';
import '../../../order_history/domain/entities/history_order.dart';
import '../../../order_history/domain/repositories/order_history_repository.dart';
import '../../domain/entities/executor_profile.dart';
import '../models/executor_active_order_session_model.dart';
import '../models/executor_profile_model.dart';
import '../models/incoming_executor_offer_model.dart';

class ExecutorRemoteDataSource {
  const ExecutorRemoteDataSource({
    required ApiClient apiClient,
    required AppConfig config,
    required TokenStorage tokenStorage,
  }) : _apiClient = apiClient,
       _config = config,
       _tokenStorage = tokenStorage;

  final ApiClient _apiClient;
  final AppConfig _config;
  final TokenStorage _tokenStorage;

  Future<ExecutorProfileModel?> fetchProfile() async {
    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.get<Map<String, dynamic>>('/executor/profile'),
      );
      return ExecutorProfileModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on Failure catch (failure) {
      if (failure.code == 'EXECUTOR_PROFILE_NOT_FOUND') {
        return null;
      }
      rethrow;
    }
  }

  Future<ExecutorActiveOrderSessionModel?> fetchActiveOrder() async {
    try {
      final response = await _apiClient.guard(
        () =>
            _apiClient.dio.get<Map<String, dynamic>>('/executor/orders/active'),
      );
      return ExecutorActiveOrderSessionModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on Failure catch (failure) {
      if (failure.code == 'EXECUTOR_ACTIVE_ORDER_NOT_FOUND') {
        return null;
      }
      rethrow;
    }
  }

  Future<ExecutorProfileModel> submitOnboarding({
    required String name,
    required String executorType,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      'executorType': executorType,
    };
    if (executorType == 'courier' && vehicleType != null) {
      payload['vehicleType'] = vehicleType;
    }
    if (executorType == 'driver') {
      payload.addAll({
        if (vehicleMake != null && vehicleMake.trim().isNotEmpty)
          'vehicleMake': vehicleMake,
        if (vehicleModel != null && vehicleModel.trim().isNotEmpty)
          'vehicleModel': vehicleModel,
        if (vehicleColor != null && vehicleColor.trim().isNotEmpty)
          'vehicleColor': vehicleColor,
        if (vehiclePlate != null && vehiclePlate.trim().isNotEmpty)
          'vehiclePlate': vehiclePlate,
      });
      if (vehicleYear != null) {
        payload['vehicleYear'] = vehicleYear;
      }
    }

    final response = await _apiClient.guard(
      () => _apiClient.dio.patch<Map<String, dynamic>>(
        '/executor/profile',
        data: payload,
      ),
    );

    return ExecutorProfileModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<ExecutorProfileModel> updateVehicleSettings({
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    required List<String> enabledTariffs,
  }) async {
    final payload = <String, dynamic>{
      'enabledTariffs': enabledTariffs,
      if (vehicleMake != null && vehicleMake.trim().isNotEmpty)
        'vehicleMake': vehicleMake,
      if (vehicleModel != null && vehicleModel.trim().isNotEmpty)
        'vehicleModel': vehicleModel,
      if (vehicleColor != null && vehicleColor.trim().isNotEmpty)
        'vehicleColor': vehicleColor,
      if (vehiclePlate != null && vehiclePlate.trim().isNotEmpty)
        'vehiclePlate': vehiclePlate,
    };
    if (vehicleYear != null) {
      payload['vehicleYear'] = vehicleYear;
    }

    final response = await _apiClient.guard(
      () => _apiClient.dio.patch<Map<String, dynamic>>(
        '/executor/profile',
        data: payload,
      ),
    );
    return ExecutorProfileModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<ExecutorProfileModel> updateDriverProfile({
    required String name,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.patch<Map<String, dynamic>>(
        '/executor/profile',
        data: {'name': name.trim()},
      ),
    );
    return ExecutorProfileModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<ExecutorProfileModel> updateOnlineStatus({
    required bool isOnline,
    required LatLng location,
    double? heading,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.patch<Map<String, dynamic>>(
        '/executor/status',
        data: {
          'isOnline': isOnline,
          'lat': location.latitude,
          'lng': location.longitude,
          'heading': heading,
        },
      ),
    );
    return ExecutorProfileModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<void> requestBalanceTopUp({
    required double amount,
    required String phone,
  }) async {
    await _apiClient.guard(
      () => _apiClient.dio.post<void>(
        '/executor/balance-topups',
        data: {'amount': amount, 'phone': phone},
      ),
    );
  }

  Future<OrderHistoryPage> fetchOrderHistory({
    required int limit,
    String? cursor,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<Map<String, dynamic>>(
        '/executor/orders/history',
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
        ? itemsJson
              .whereType<Map<String, dynamic>>()
              .map(_mapHistoryOrder)
              .toList()
        : <HistoryOrder>[];

    return OrderHistoryPage(items: items, nextCursor: nextCursor);
  }

  Stream<IncomingExecutorOfferModel> watchIncomingOrders({
    required ExecutorProfile profile,
  }) {
    final controller = StreamController<IncomingExecutorOfferModel>();
    final seenOrderIds = <String>{};
    Timer? pollTimer;
    io.Socket? socket;

    void emitOffer(IncomingExecutorOfferModel offer) {
      if (controller.isClosed || offer.orderId.isEmpty) {
        return;
      }
      if (seenOrderIds.add(offer.orderId)) {
        controller.add(offer);
      }
    }

    Future<void> pollIncomingOffers() async {
      try {
        final response = await _apiClient.guard(
          () => _apiClient.dio.get<dynamic>('/executor/orders/incoming'),
        );
        final payload = response.data;
        final items = payload is List
            ? payload
            : (payload is Map<String, dynamic>
                  ? payload['items'] ?? payload['results'] ?? <dynamic>[]
                  : <dynamic>[]);

        for (final item in items.whereType<Map<String, dynamic>>()) {
          emitOffer(IncomingExecutorOfferModel.fromJson(item));
        }
      } catch (_) {
        // Polling failure should not terminate the local driver session.
      }
    }

    Map<String, dynamic> toMap(dynamic value) {
      if (value is Map<String, dynamic>) {
        return value;
      }
      if (value is Map) {
        return value.map((key, item) => MapEntry(key.toString(), item));
      }
      return <String, dynamic>{};
    }

    void disposeResources() {
      pollTimer?.cancel();
      socket?.disconnect();
      socket?.dispose();
    }

    Future<void> connectSocket() async {
      if (_config.wsBaseUrl.trim().isEmpty || controller.isClosed) {
        return;
      }

      final accessToken = await _tokenStorage.readAccessToken();
      if (controller.isClosed) {
        return;
      }

      final nextSocket = io.io(_config.wsBaseUrl, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
        'forceNew': true,
        if (accessToken != null && accessToken.trim().isNotEmpty)
          'auth': {'token': accessToken},
      });
      socket = nextSocket;
      nextSocket.onConnect((_) {
        socket?.emit('executor:subscribe');
        unawaited(pollIncomingOffers());
      });
      nextSocket.on('executor:incoming_order', (payload) {
        emitOffer(IncomingExecutorOfferModel.fromJson(toMap(payload)));
      });
      nextSocket.connect();
    }

    pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      unawaited(pollIncomingOffers());
    });
    unawaited(pollIncomingOffers());

    unawaited(connectSocket());

    controller.onCancel = disposeResources;
    return controller.stream;
  }

  Future<void> acceptIncomingOrder(String orderId) async {
    await _apiClient.guard(
      () => _apiClient.dio.post<void>('/executor/orders/$orderId/accept'),
    );
  }

  Future<void> rejectIncomingOrder(String orderId) async {
    await _apiClient.guard(
      () => _apiClient.dio.post<void>('/executor/orders/$orderId/reject'),
    );
  }

  Future<void> syncActiveOrderStatus({
    required String orderId,
    required String serviceType,
    required String nextStatus,
    String? proofPhotoPath,
    String? recipientCode,
    String? failureReason,
    LatLng? location,
    int? actualDistanceMeters,
  }) async {
    if (serviceType == 'delivery') {
      switch (nextStatus) {
        case 'picked_up':
          await _apiClient.guard(
            () => _apiClient.dio.patch<void>(
              '/executor/orders/$orderId/delivery/pickup',
            ),
          );
          return;
        case 'in_transit':
          await _apiClient.guard(
            () => _apiClient.dio.patch<void>(
              '/executor/orders/$orderId/status',
              data: {
                'status': 'in_progress',
                if (location != null) 'lat': location.latitude,
                if (location != null) 'lng': location.longitude,
              },
            ),
          );
          return;
        case 'at_door':
          await _apiClient.guard(
            () => _apiClient.dio.patch<void>(
              '/executor/orders/$orderId/delivery/at-door',
            ),
          );
          return;
        case 'delivered_confirmed':
          await _apiClient.guard(
            () => _apiClient.dio.patch<void>(
              '/executor/orders/$orderId/delivery/complete',
              data: {
                'proofPhoto': proofPhotoPath,
                'recipientCode': recipientCode,
              },
            ),
          );
          return;
        case 'delivery_failed':
          await _apiClient.guard(
            () => _apiClient.dio.patch<void>(
              '/executor/orders/$orderId/delivery/failed',
              data: {'reason': failureReason},
            ),
          );
          return;
      }
    }

    await _apiClient.guard(
      () => _apiClient.dio.patch<void>(
        '/executor/orders/$orderId/status',
        data: {
          'status': nextStatus,
          if (location != null) 'lat': location.latitude,
          if (location != null) 'lng': location.longitude,
          'actualDistanceMeters': ?actualDistanceMeters,
        },
      ),
    );
  }

  HistoryOrder _mapHistoryOrder(Map<String, dynamic> json) {
    final routePoints = (json['routePoints'] ?? json['route_points']) is List
        ? (json['routePoints'] ?? json['route_points']) as List
        : const <dynamic>[];
    final firstPoint = routePoints.isNotEmpty && routePoints.first is Map
        ? _toMap(routePoints.first)
        : const <String, dynamic>{};
    final lastPoint = routePoints.isNotEmpty && routePoints.last is Map
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
    return <String, dynamic>{};
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

  int _toInt(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.round();
    }
    if (value is String) {
      return int.tryParse(value) ?? 0;
    }
    return 0;
  }

  int? _toNullableInt(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value);
    }
    return null;
  }
}
