import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/api/api_client.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../models/taxi_estimate_model.dart';
import '../models/taxi_route_model.dart';

class TaxiRemoteDataSource {
  const TaxiRemoteDataSource(this._apiClient);

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

  Future<TaxiRouteModel> buildRoute({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
  }) async {
    final fallbackDistance = max(
      1,
      const Distance().distance(pickup.location, destination.location).round(),
    );
    final fallbackDuration = max(1, (fallbackDistance / 8.5).round());

    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/geo/route',
        data: {
          'from': {
            'lat': pickup.location.latitude,
            'lng': pickup.location.longitude,
          },
          'to': {
            'lat': destination.location.latitude,
            'lng': destination.location.longitude,
          },
        },
      ),
    );

    return TaxiRouteModel.fromJson(
      json: response.data ?? <String, dynamic>{},
      fallbackPoints: [pickup.location, destination.location],
      fallbackDistanceMeters: fallbackDistance,
      fallbackDurationSeconds: fallbackDuration,
    );
  }

  Future<List<TaxiEstimateModel>> estimateTaxi({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
    required int distanceMeters,
    required int durationSeconds,
    String? promoCode,
    String serviceType = 'taxi',
  }) async {
    final classes = serviceType == 'intercity'
        ? ['intercity']
        : ['economy', 'comfort', 'comfort_plus', 'business'];
    final responses = await Future.wait(
      classes.map(
        (carClass) => _apiClient.guard(
          () => _apiClient.dio.post<Map<String, dynamic>>(
            '/orders/estimate',
            data: {
              'serviceType': serviceType,
              if (serviceType != 'intercity') 'carClass': carClass,
              'routePoints': [
                {
                  'lat': pickup.location.latitude,
                  'lng': pickup.location.longitude,
                  'address': pickup.displayTitle,
                },
                {
                  'lat': destination.location.latitude,
                  'lng': destination.location.longitude,
                  'address': destination.displayTitle,
                },
              ],
              if (promoCode != null && promoCode.isNotEmpty)
                'promoCode': promoCode,
              'distanceMeters': _positiveMetric(distanceMeters),
              'durationSeconds': _positiveMetric(durationSeconds),
            },
          ),
        ),
      ),
    );

    return [
      for (var index = 0; index < classes.length; index += 1)
        TaxiEstimateModel.fromEstimateResponse(
          carClass: classes[index],
          json: responses[index].data ?? <String, dynamic>{},
          fallbackPrice: 0,
          fallbackEtaMinutes: 5 + index * 2,
        ),
    ];
  }

  Future<String> createTaxiOrder({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
    required String carClass,
    required String paymentMethod,
    required int distanceMeters,
    required int durationSeconds,
    String serviceType = 'taxi',
    String? promoCode,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/orders',
        data: {
          'serviceType': serviceType,
          'paymentMethod': paymentMethod,
          if (serviceType != 'intercity') 'carClass': carClass,
          'promoCode': promoCode,
          'distanceMeters': _positiveMetric(distanceMeters),
          'durationSeconds': _positiveMetric(durationSeconds),
          'routePoints': [
            {
              'sequenceIndex': 0,
              'lat': pickup.location.latitude,
              'lng': pickup.location.longitude,
              'address': pickup.displayTitle,
            },
            {
              'sequenceIndex': 1,
              'lat': destination.location.latitude,
              'lng': destination.location.longitude,
              'address': destination.displayTitle,
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
