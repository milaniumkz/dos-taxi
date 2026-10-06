import 'package:latlong2/latlong.dart';

import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/incoming_executor_offer.dart';

class IncomingExecutorOfferModel extends IncomingExecutorOffer {
  const IncomingExecutorOfferModel({
    required super.orderId,
    required super.serviceType,
    required super.currency,
    required super.paymentMethod,
    required super.price,
    required super.distanceMeters,
    required super.durationSeconds,
    required super.pickupAddress,
    required super.pickupLocation,
    required super.destinationAddress,
    required super.destinationLocation,
    required super.offeredAt,
    super.clientName,
    super.clientPhone,
  });

  factory IncomingExecutorOfferModel.fromJson(Map<String, dynamic> json) {
    final payload = _mergedPayload(json);
    return IncomingExecutorOfferModel(
      orderId:
          payload['orderId'] as String? ?? payload['order_id'] as String? ?? '',
      serviceType:
          payload['serviceType'] as String? ??
          payload['service_type'] as String? ??
          'taxi',
      currency: payload['currency'] as String? ?? 'KZT',
      paymentMethod:
          payload['paymentMethod'] as String? ??
          payload['payment_method'] as String? ??
          'cash',
      price: _toDouble(payload['estimatedPrice'] ?? payload['estimated_price']),
      distanceMeters: _toInt(
        payload['distanceMeters'] ?? payload['distance_meters'],
      ),
      durationSeconds: _toInt(
        payload['durationSeconds'] ?? payload['duration_seconds'],
      ),
      pickupAddress: _compactAddress(
        payload['pickupAddress'] as String? ??
            payload['fromAddress'] as String? ??
            'пр. Абая, 10',
      ),
      pickupLocation: LatLng(
        _toDouble(payload['pickupLat'] ?? payload['pickup_lat'] ?? 43.238949),
        _toDouble(payload['pickupLng'] ?? payload['pickup_lng'] ?? 76.889709),
      ),
      destinationAddress: _compactAddress(
        payload['destinationAddress'] as String? ??
            payload['toAddress'] as String? ??
            'пр. Достык, 15',
      ),
      destinationLocation: LatLng(
        _toDouble(
          payload['destinationLat'] ?? payload['destination_lat'] ?? 43.245,
        ),
        _toDouble(
          payload['destinationLng'] ?? payload['destination_lng'] ?? 76.95,
        ),
      ),
      offeredAt:
          DateTime.tryParse(payload['offeredAt'] as String? ?? '') ??
          DateTime.now(),
      clientName:
          payload['clientName'] as String? ?? payload['client_name'] as String?,
      clientPhone:
          payload['clientPhone'] as String? ??
          payload['client_phone'] as String?,
    );
  }

  static Map<String, dynamic> _mergedPayload(Map<String, dynamic> json) {
    final nestedOffer = json['offer'];
    if (nestedOffer is Map<String, dynamic>) {
      return <String, dynamic>{...json, ...nestedOffer};
    }
    if (nestedOffer is Map) {
      return <String, dynamic>{
        ...json,
        ...nestedOffer.map((key, value) => MapEntry(key.toString(), value)),
      };
    }
    return json;
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

  static String _compactAddress(String value) {
    return AddressSuggestion.compactAddress(value);
  }
}
