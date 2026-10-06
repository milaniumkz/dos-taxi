import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../../core/api/api_client.dart';
import '../models/address_suggestion_model.dart';
import '../models/nearby_executor_model.dart';

class GeoRemoteDataSource {
  const GeoRemoteDataSource(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AddressSuggestionModel>> searchAddresses({
    required String query,
    String? cityId,
    double? lat,
    double? lng,
    double radiusKm = 20,
  }) async {
    final queryParameters = <String, Object?>{'q': query, 'lang': 'ru'};
    if (cityId != null && cityId.isNotEmpty) {
      queryParameters['cityId'] = cityId;
    }
    if (lat != null) {
      queryParameters['lat'] = lat;
    }
    if (lng != null) {
      queryParameters['lng'] = lng;
    }
    if (lat != null && lng != null) {
      queryParameters['radiusKm'] = radiusKm;
    }

    final response = await _apiClient.guard(
      () => _apiClient.dio.get<String>(
        '/geo/autocomplete',
        options: Options(responseType: ResponseType.plain),
        queryParameters: queryParameters,
      ),
    );

    final payload = _decodePayload(response.data);
    final list = payload is List
        ? payload
        : (payload is Map
              ? payload['items'] ?? payload['results'] ?? <dynamic>[]
              : <dynamic>[]);

    final suggestions = <AddressSuggestionModel>[];
    for (final item in list) {
      if (item is Map) {
        suggestions.add(AddressSuggestionModel.fromJson(_stringMap(item)));
      }
    }
    return suggestions;
  }

  Future<AddressSuggestionModel> reverseGeocode({
    required double lat,
    required double lng,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<Map<String, dynamic>>(
        '/geo/reverse',
        queryParameters: {'lat': lat, 'lng': lng, 'lang': 'ru'},
      ),
    );

    return AddressSuggestionModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
  }

  Future<List<NearbyExecutorModel>> fetchNearbyExecutors({
    required double lat,
    required double lng,
    required String serviceType,
  }) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.get<dynamic>(
        '/geo/executors-nearby',
        queryParameters: {'lat': lat, 'lng': lng, 'serviceType': serviceType},
      ),
    );

    final payload = _decodePayload(response.data);
    final list = payload is List
        ? payload
        : (payload is Map
              ? payload['items'] ?? payload['results'] ?? <dynamic>[]
              : <dynamic>[]);

    final executors = <NearbyExecutorModel>[];
    for (final item in list) {
      if (item is Map) {
        executors.add(NearbyExecutorModel.fromJson(_stringMap(item)));
      }
    }
    return executors;
  }

  Object? _decodePayload(Object? payload) {
    if (payload is String) {
      return jsonDecode(payload);
    }
    return payload;
  }

  Map<String, dynamic> _stringMap(Map<dynamic, dynamic> item) =>
      item.map((key, value) => MapEntry(key.toString(), value));
}
