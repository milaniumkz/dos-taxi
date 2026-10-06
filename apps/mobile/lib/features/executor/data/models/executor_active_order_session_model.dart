import 'package:latlong2/latlong.dart';

import '../../domain/entities/executor_active_order_session.dart';

class ExecutorActiveOrderSessionModel extends ExecutorActiveOrderSession {
  const ExecutorActiveOrderSessionModel({
    required super.orderId,
    required super.serviceType,
    required super.status,
    required super.currency,
    required super.paymentMethod,
    required super.price,
    required super.pickupAddress,
    required super.pickupLocation,
    required super.destinationAddress,
    required super.destinationLocation,
    super.distanceMeters,
    super.durationSeconds,
    super.clientName,
    super.clientPhone,
    super.proofPhotoPath,
    super.recipientCode,
  });

  factory ExecutorActiveOrderSessionModel.fromJson(Map<String, dynamic> json) {
    final routePoints = (json['routePoints'] ?? json['route_points']) is List
        ? (json['routePoints'] ?? json['route_points']) as List
        : const <dynamic>[];
    final pickupPoint = routePoints.isNotEmpty && routePoints.first is Map
        ? _asMap(routePoints.first)
        : const <String, dynamic>{};
    final destinationPoint = routePoints.isNotEmpty && routePoints.last is Map
        ? _asMap(routePoints.last)
        : const <String, dynamic>{};
    final deliveryDetails = _asMap(
      json['deliveryDetails'] ?? json['delivery_details'],
    );

    return ExecutorActiveOrderSessionModel(
      orderId: json['id'] as String? ?? '',
      serviceType:
          json['serviceType'] as String? ??
          json['service_type'] as String? ??
          'taxi',
      status: _resolveSessionStatus(json, deliveryDetails),
      currency: json['currency'] as String? ?? 'KZT',
      paymentMethod:
          json['paymentMethod'] as String? ??
          json['payment_method'] as String? ??
          'cash',
      price: _toDouble(json['finalPrice'] ?? json['estimatedPrice'] ?? 0),
      pickupAddress: pickupPoint['address'] as String? ?? 'Подача',
      pickupLocation: LatLng(
        _toDouble(pickupPoint['lat'] ?? 43.238949),
        _toDouble(pickupPoint['lng'] ?? 76.889709),
      ),
      destinationAddress:
          destinationPoint['address'] as String? ?? 'Назначение',
      destinationLocation: LatLng(
        _toDouble(destinationPoint['lat'] ?? 43.245),
        _toDouble(destinationPoint['lng'] ?? 76.95),
      ),
      distanceMeters: _toInt(json['distanceMeters'] ?? json['distance_meters']),
      durationSeconds: _toInt(
        json['durationSeconds'] ?? json['duration_seconds'],
      ),
      clientName:
          (json['clientName'] as String?) ??
          (json['client_name'] as String?) ??
          (pickupPoint['contactName'] as String?) ??
          (destinationPoint['contactName'] as String?),
      clientPhone:
          (json['clientPhone'] as String?) ??
          (json['client_phone'] as String?) ??
          (pickupPoint['contactPhone'] as String?) ??
          (destinationPoint['contactPhone'] as String?),
      proofPhotoPath: deliveryDetails['proofPhotoUrl'] as String?,
      recipientCode: deliveryDetails['recipientCode'] as String?,
    );
  }

  static String _resolveSessionStatus(
    Map<String, dynamic> json,
    Map<String, dynamic> deliveryDetails,
  ) {
    final serviceType =
        json['serviceType'] as String? ?? json['service_type'] as String? ?? '';
    final orderStatus =
        json['status'] as String? ?? json['order_status'] as String? ?? '';

    if (serviceType == 'delivery') {
      final deliveryStatus =
          deliveryDetails['deliveryStatus'] as String? ??
          deliveryDetails['delivery_status'] as String?;
      switch (deliveryStatus) {
        case 'picked_up':
          return 'picked_up';
        case 'in_transit':
          return 'in_transit';
        case 'at_door':
          return 'at_door';
        case 'delivery_failed':
          return 'delivery_failed';
      }

      if (orderStatus == 'in_progress') {
        return 'in_transit';
      }

      return 'accepted';
    }

    switch (orderStatus) {
      case 'waiting':
        return 'waiting';
      case 'in_progress':
        return 'in_progress';
      default:
        return 'accepted';
    }
  }

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }

    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }

    return <String, dynamic>{};
  }

  static double _toDouble(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }

    if (value is String) {
      return double.tryParse(value) ?? 0;
    }

    return 0;
  }

  static int? _toInt(dynamic value) {
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
