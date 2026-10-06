import 'package:latlong2/latlong.dart';

import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/active_order_service_type.dart';
import '../../domain/entities/active_order_session.dart';

class ActiveOrderSessionModel extends ActiveOrderSession {
  const ActiveOrderSessionModel({
    required super.orderId,
    required super.serviceType,
    required super.fromAddress,
    required super.toAddress,
    required super.routePoints,
    required super.price,
    required super.currency,
    required super.initialEtaSeconds,
    required super.vehicleLabel,
    super.initialOrderStatus,
    super.executorName,
    super.executorRating,
    super.executorVehicleLabel,
    super.executorPhone,
  });

  factory ActiveOrderSessionModel.fromJson(Map<String, dynamic> json) {
    final routePoints = (json['routePoints'] ?? json['route_points']) is List
        ? (json['routePoints'] ?? json['route_points']) as List
        : const <dynamic>[];
    final fromPoint = routePoints.isNotEmpty && routePoints.first is Map
        ? _asMap(routePoints.first)
        : const <String, dynamic>{};
    final toPoint = routePoints.isNotEmpty && routePoints.last is Map
        ? _asMap(routePoints.last)
        : const <String, dynamic>{};
    final polylinePoints = routePoints
        .map(_asMap)
        .where((point) => point.isNotEmpty)
        .map(
          (point) => LatLng(
            _toDouble(point['lat'] ?? 43.238949),
            _toDouble(point['lng'] ?? 76.889709),
          ),
        )
        .toList(growable: false);
    final deliveryDetails = _asMap(
      json['deliveryDetails'] ?? json['delivery_details'],
    );
    final serviceType =
        json['serviceType'] as String? ??
        json['service_type'] as String? ??
        'taxi';

    return ActiveOrderSessionModel(
      orderId: json['id'] as String? ?? '',
      serviceType: serviceType == 'delivery'
          ? ActiveOrderServiceType.delivery
          : serviceType == 'intercity'
          ? ActiveOrderServiceType.intercity
          : ActiveOrderServiceType.taxi,
      fromAddress: AddressSuggestion(
        title: fromPoint['address'] as String? ?? 'Pickup',
        subtitle: '',
        location: LatLng(
          _toDouble(fromPoint['lat'] ?? 43.238949),
          _toDouble(fromPoint['lng'] ?? 76.889709),
        ),
      ),
      toAddress: AddressSuggestion(
        title: toPoint['address'] as String? ?? 'Destination',
        subtitle: '',
        location: LatLng(
          _toDouble(toPoint['lat'] ?? 43.245),
          _toDouble(toPoint['lng'] ?? 76.95),
        ),
      ),
      routePoints: polylinePoints,
      price: _toDouble(json['finalPrice'] ?? json['estimatedPrice'] ?? 0),
      currency: json['currency'] as String? ?? 'KZT',
      initialEtaSeconds: _toInt(json['durationSeconds'] ?? 300),
      vehicleLabel: _resolveVehicleLabel(
        serviceType: serviceType,
        order: json,
        deliveryDetails: deliveryDetails,
      ),
      initialOrderStatus:
          json['status'] as String? ??
          json['order_status'] as String? ??
          'searching',
      executorName:
          json['executorName'] as String? ?? json['executor_name'] as String?,
      executorRating: _toNullableDouble(
        json['executorProfileRating'] ??
            json['executor_profile_rating'] ??
            json['executorRating'] ??
            json['executor_rating'],
      ),
      executorVehicleLabel:
          json['executorVehicleLabel'] as String? ??
          json['executor_vehicle_label'] as String? ??
          json['executorVehicle'] as String? ??
          json['executor_vehicle'] as String?,
      executorPhone:
          json['executorPhone'] as String? ?? json['executor_phone'] as String?,
    );
  }

  static String _resolveVehicleLabel({
    required String serviceType,
    required Map<String, dynamic> order,
    required Map<String, dynamic> deliveryDetails,
  }) {
    if (serviceType == 'delivery') {
      return deliveryDetails['courierVehicleType'] as String? ??
          deliveryDetails['courier_vehicle_type'] as String? ??
          'courier';
    }

    return order['carClass'] as String? ??
        order['car_class'] as String? ??
        'economy';
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

  static double? _toNullableDouble(dynamic value) {
    if (value == null) {
      return null;
    }

    if (value is num) {
      return value.toDouble();
    }

    if (value is String) {
      return double.tryParse(value);
    }

    return null;
  }

  static int _toInt(dynamic value) {
    if (value is int) {
      return value;
    }

    if (value is num) {
      return value.toInt();
    }

    if (value is String) {
      return int.tryParse(value) ?? 0;
    }

    return 0;
  }
}
