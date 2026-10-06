import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/api/api_client.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/enums/courier_vehicle_type.dart';
import '../models/delivery_estimate_model.dart';
import '../models/delivery_route_info_model.dart';

class DeliveryRemoteDataSource {
  const DeliveryRemoteDataSource(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AddressSuggestion>> searchAddresses({
    required String query,
    LatLng? locationBias,
    double radiusKm = 20,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<String>(
        '/geo/autocomplete',
        options: Options(responseType: ResponseType.plain),
        queryParameters: {
          'q': query,
          'lang': 'ru',
          if (locationBias != null) 'lat': locationBias.latitude,
          if (locationBias != null) 'lng': locationBias.longitude,
          if (locationBias != null) 'radiusKm': radiusKm,
        },
      ),
    );

    final payload = _decodePayload(response.data);
    final list = payload is List
        ? payload
        : (payload is Map
              ? payload['items'] ?? payload['results'] ?? <dynamic>[]
              : <dynamic>[]);

    final suggestions = <AddressSuggestion>[];
    for (final item in list) {
      if (item is Map) {
        suggestions.add(_mapAddress(_stringMap(item)));
      }
    }
    return suggestions;
  }

  Future<AddressSuggestion> reverseGeocode({required LatLng location}) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<Map<String, dynamic>>(
        '/geo/reverse',
        queryParameters: {
          'lat': location.latitude,
          'lng': location.longitude,
          'lang': 'ru',
        },
      ),
    );

    return _mapAddress(response.data ?? <String, dynamic>{});
  }

  Future<DeliveryRouteInfoModel> buildRouteInfo({
    required AddressSuggestion fromAddress,
    required AddressSuggestion toAddress,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/geo/route',
        data: {
          'from': {
            'lat': fromAddress.location.latitude,
            'lng': fromAddress.location.longitude,
          },
          'to': {
            'lat': toAddress.location.latitude,
            'lng': toAddress.location.longitude,
          },
        },
      ),
    );

    return DeliveryRouteInfoModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  Future<List<DeliveryEstimateModel>> estimateDelivery({
    required AddressSuggestion fromAddress,
    required AddressSuggestion toAddress,
    required int distanceMeters,
    required int durationSeconds,
    String? promoCode,
    required bool isFragile,
    required bool requiresReturn,
    double? declaredValue,
    double? cashOnDelivery,
  }) async {
    const vehicleTypes = CourierVehicleType.values;
    final responses = await Future.wait(
      vehicleTypes.map(
        (vehicleType) => _apiClient.guard(
          () => _apiClient.dio.post<Map<String, dynamic>>(
            '/orders/estimate',
            data: {
              'serviceType': 'delivery',
              'courierVehicleType': vehicleType.apiValue,
              if (promoCode != null && promoCode.isNotEmpty)
                'promoCode': promoCode,
              'distanceMeters': _positiveMetric(distanceMeters),
              'durationSeconds': _positiveMetric(durationSeconds),
              'isFragile': isFragile,
              'requiresReturn': requiresReturn,
              'declaredValue': declaredValue,
              'cashOnDelivery': cashOnDelivery,
              'routePoints': [
                {
                  'lat': fromAddress.location.latitude,
                  'lng': fromAddress.location.longitude,
                  'address': fromAddress.displayTitle,
                },
                {
                  'lat': toAddress.location.latitude,
                  'lng': toAddress.location.longitude,
                  'address': toAddress.displayTitle,
                },
              ],
            },
          ),
        ),
      ),
    );

    return [
      for (var index = 0; index < vehicleTypes.length; index += 1)
        DeliveryEstimateModel.fromEstimateResponse(
          vehicleType: vehicleTypes[index],
          json: responses[index].data ?? <String, dynamic>{},
          fallbackPrice: 0,
          fallbackEtaMinutes: 8 + index * 2,
        ),
    ];
  }

  Future<String> createDeliveryOrder({
    required AddressSuggestion fromAddress,
    required AddressSuggestion toAddress,
    required CourierVehicleType vehicleType,
    required String packageDescription,
    required bool isFragile,
    required bool requiresReturn,
    required String contactName,
    required String contactPhone,
    required int distanceMeters,
    required int durationSeconds,
    required String paymentMethod,
    String? packagePhotoPath,
    double? declaredValue,
    double? cashOnDelivery,
    String? promoCode,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/orders',
        data: {
          'serviceType': 'delivery',
          'courierVehicleType': vehicleType.apiValue,
          'packageDescription': packageDescription,
          'isFragile': isFragile,
          'requiresReturn': requiresReturn,
          'contactName': contactName,
          'contactPhone': contactPhone,
          'distanceMeters': _positiveMetric(distanceMeters),
          'durationSeconds': _positiveMetric(durationSeconds),
          'paymentMethod': paymentMethod,
          'packagePhoto': packagePhotoPath,
          'declaredValue': declaredValue,
          'cashOnDelivery': cashOnDelivery,
          'promoCode': promoCode,
          'routePoints': [
            {
              'sequenceIndex': 0,
              'lat': fromAddress.location.latitude,
              'lng': fromAddress.location.longitude,
              'address': fromAddress.displayTitle,
            },
            {
              'sequenceIndex': 1,
              'lat': toAddress.location.latitude,
              'lng': toAddress.location.longitude,
              'address': toAddress.displayTitle,
              'contactName': contactName,
              'contactPhone': contactPhone,
            },
          ],
        },
      ),
    );

    final payload = response.data ?? <String, dynamic>{};
    return payload['id'] as String? ??
        payload['orderId'] as String? ??
        payload['order_id'] as String? ??
        '';
  }

  AddressSuggestion _mapAddress(Map<String, dynamic> json) {
    final title =
        json['title'] as String? ??
        json['address'] as String? ??
        json['display_name'] as String? ??
        '';
    final subtitle =
        json['subtitle'] as String? ?? json['city'] as String? ?? '';
    final lat = (json['lat'] ?? json['latitude'] ?? 43.238949) as num;
    final lng =
        (json['lng'] ?? json['lon'] ?? json['longitude'] ?? 76.889709) as num;

    return AddressSuggestion(
      title: AddressSuggestion.formatDisplayTitle(title, subtitle),
      subtitle: subtitle,
      location: LatLng(lat.toDouble(), lng.toDouble()),
    );
  }

  Object? _decodePayload(Object? payload) {
    if (payload is String) {
      return jsonDecode(payload);
    }
    return payload;
  }

  Map<String, dynamic> _stringMap(Map<dynamic, dynamic> item) =>
      item.map((key, value) => MapEntry(key.toString(), value));

  int _positiveMetric(int value) => max(1, value);
}
