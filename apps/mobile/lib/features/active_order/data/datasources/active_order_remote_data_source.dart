import 'dart:async';

import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../../core/api/api_client.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failure.dart';
import '../../domain/entities/active_order_session.dart';
import '../../domain/entities/active_order_tracking_event.dart';
import '../models/active_order_session_model.dart';

class ActiveOrderRemoteDataSource {
  const ActiveOrderRemoteDataSource({
    required ApiClient apiClient,
    required AppConfig config,
  }) : _apiClient = apiClient,
       _config = config;

  final ApiClient _apiClient;
  final AppConfig _config;

  Future<ActiveOrderSessionModel?> fetchActiveOrder() async {
    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.get<dynamic>('/orders/active'),
      );
      final data = response.data;
      if (data == null) {
        return null;
      }

      if (data is Map<String, dynamic>) {
        final session = ActiveOrderSessionModel.fromJson(data);
        return session.orderId.isEmpty ? null : session;
      }

      if (data is Map) {
        final session = ActiveOrderSessionModel.fromJson(
          data.map((key, value) => MapEntry(key.toString(), value)),
        );
        return session.orderId.isEmpty ? null : session;
      }

      return null;
    } on Failure catch (failure) {
      if (failure.code == 'CLIENT_ACTIVE_ORDER_NOT_FOUND') {
        return null;
      }
      rethrow;
    }
  }

  Stream<ActiveOrderTrackingEvent> trackOrder(ActiveOrderSession session) {
    final controller = StreamController<ActiveOrderTrackingEvent>();
    final timers = <Timer>[];
    io.Socket? socket;

    void addEvent(ActiveOrderTrackingEvent event) {
      if (!controller.isClosed) {
        controller.add(event);
      }
    }

    void disposeResources() {
      for (final timer in timers) {
        timer.cancel();
      }
      if (socket != null) {
        socket.disconnect();
        socket.dispose();
      }
    }

    Map<String, dynamic> payloadAsMap(dynamic payload) {
      if (payload is Map<String, dynamic>) {
        return payload;
      }

      if (payload is Map) {
        return payload.map((key, value) => MapEntry(key.toString(), value));
      }

      return <String, dynamic>{};
    }

    ActiveOrderTrackingEvent mapOrderSnapshot(
      ActiveOrderSessionModel snapshot,
    ) {
      return ActiveOrderTrackingEvent.statusChanged(
        orderStatus: snapshot.initialOrderStatus,
        executorName: snapshot.executorName,
        executorRating: snapshot.executorRating,
        executorVehicleLabel: snapshot.executorVehicleLabel,
        executorPhone: snapshot.executorPhone,
      );
    }

    ActiveOrderTrackingEvent mapStatusEvent(dynamic payload) {
      final map = payloadAsMap(payload);
      final executor = payloadAsMap(map['executor']);
      return ActiveOrderTrackingEvent.statusChanged(
        orderStatus: map['status'] as String? ?? 'searching',
        executorName:
            executor['name'] as String? ?? map['executorName'] as String?,
        executorRating: (executor['rating'] ?? map['executorRating']) is num
            ? ((executor['rating'] ?? map['executorRating']) as num).toDouble()
            : null,
        executorVehicleLabel:
            executor['vehicle'] as String? ??
            map['executorVehicle'] as String? ??
            executor['bike'] as String?,
        executorPhone:
            executor['phone'] as String? ?? map['executorPhone'] as String?,
      );
    }

    ActiveOrderTrackingEvent mapLocationEvent(dynamic payload) {
      final map = payloadAsMap(payload);
      final lat = (map['lat'] ?? map['latitude'] ?? 0) as num;
      final lng = (map['lng'] ?? map['lon'] ?? map['longitude'] ?? 0) as num;
      final heading = (map['heading'] as num?)?.toDouble();

      return ActiveOrderTrackingEvent.executorLocationUpdated(
        executorLocation: LatLng(lat.toDouble(), lng.toDouble()),
        executorHeading: heading,
      );
    }

    ActiveOrderTrackingEvent mapEtaEvent(dynamic payload) {
      final map = payloadAsMap(payload);
      final eta =
          (map['etaSeconds'] ?? map['eta_seconds'] ?? map['eta'] ?? 0) as num;
      return ActiveOrderTrackingEvent.etaUpdated(etaSeconds: eta.toInt());
    }

    Future<void> pollOrderSnapshot() async {
      if (controller.isClosed || session.orderId.isEmpty) {
        return;
      }

      try {
        final response = await _apiClient.guard(
          () => _apiClient.dio.get<Map<String, dynamic>>(
            '/orders/${session.orderId}',
          ),
        );
        final snapshot = ActiveOrderSessionModel.fromJson(
          response.data ?? <String, dynamic>{},
        );
        addEvent(mapOrderSnapshot(snapshot));
        addEvent(
          ActiveOrderTrackingEvent.etaUpdated(
            etaSeconds: snapshot.initialOrderStatus == 'completed'
                ? 0
                : snapshot.initialEtaSeconds,
          ),
        );
      } catch (_) {
        // WebSocket can still deliver updates; polling is a best-effort fallback.
      }
    }

    timers.add(
      Timer.periodic(const Duration(seconds: 2), (_) {
        unawaited(pollOrderSnapshot());
      }),
    );
    unawaited(pollOrderSnapshot());

    if (_config.wsBaseUrl.trim().isEmpty) {
      controller.onCancel = disposeResources;
      return controller.stream;
    }

    try {
      socket = io.io(
        _config.wsBaseUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(2)
            .build(),
      );

      socket.onConnect((_) {
        socket?.emit('subscribe_order', {'orderId': session.orderId});
        unawaited(pollOrderSnapshot());
      });
      socket.onConnectError((_) {});
      socket.onError((_) {});
      socket.onDisconnect((_) {});
      socket.on('order:status_changed', (payload) {
        addEvent(mapStatusEvent(payload));
        unawaited(pollOrderSnapshot());
      });
      socket.on('order:executor_location', (payload) {
        addEvent(mapLocationEvent(payload));
      });
      socket.on('order:eta_updated', (payload) {
        addEvent(mapEtaEvent(payload));
      });
      socket.connect();
    } catch (_) {}

    controller.onCancel = disposeResources;
    return controller.stream;
  }

  Future<void> cancelOrder(String orderId) async {
    await _apiClient.guard(
      () => _apiClient.dio.patch<void>('/orders/$orderId/cancel'),
    );
  }

  Future<void> rateOrder({required String orderId, required int rating}) async {
    await _apiClient.guard(
      () => _apiClient.dio.post<void>(
        '/orders/$orderId/rate',
        data: {'executorRating': rating},
      ),
    );
  }
}
