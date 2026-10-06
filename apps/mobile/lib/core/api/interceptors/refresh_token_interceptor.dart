import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../storage/token_storage.dart';
import '../api_client.dart';

class RefreshTokenInterceptor extends QueuedInterceptor {
  RefreshTokenInterceptor({
    required Dio dio,
    required TokenStorage tokenStorage,
    required RefreshTokenCallback onRefreshToken,
    required VoidCallback onUnauthorized,
  }) : _dio = dio,
       _tokenStorage = tokenStorage,
       _onRefreshToken = onRefreshToken,
       _onUnauthorized = onUnauthorized;

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final RefreshTokenCallback _onRefreshToken;
  final VoidCallback _onUnauthorized;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final requestOptions = err.requestOptions;
    final statusCode = err.response?.statusCode;
    final alreadyRetried = requestOptions.extra['refreshed'] == true;

    if (statusCode != 401) {
      handler.next(err);
      return;
    }

    if (alreadyRetried) {
      await _tokenStorage.clear();
      _onUnauthorized();
      handler.next(err);
      return;
    }

    String? nextAccessToken;
    try {
      nextAccessToken = await _onRefreshToken();
    } catch (_) {
      nextAccessToken = null;
    }

    if (nextAccessToken == null || nextAccessToken.isEmpty) {
      await _tokenStorage.clear();
      _onUnauthorized();
      handler.next(err);
      return;
    }

    requestOptions.extra['refreshed'] = true;
    requestOptions.headers['Authorization'] = 'Bearer $nextAccessToken';

    try {
      final response = await _dio.fetch<dynamic>(requestOptions);
      handler.resolve(response);
    } on DioException catch (retryError) {
      if (retryError.response?.statusCode == 401) {
        await _tokenStorage.clear();
        _onUnauthorized();
      }
      handler.next(retryError);
    }
  }
}
