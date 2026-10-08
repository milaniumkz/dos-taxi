import 'package:dio/dio.dart';

import 'failure.dart';

class GlobalExceptionHandler {
  static Failure fromDio(DioException error) {
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic>) {
      return Failure(
        retryAfterSeconds: (responseData['details'] is Map
            ? (responseData['details']['retryAfterSeconds'] as num?)?.toInt()
            : null),
        code: responseData['code'] as String? ?? 'API_ERROR',
        message: responseData['message'] as String? ?? 'API_ERROR',
      );
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const Failure(
          code: 'NETWORK_TIMEOUT',
          message: 'NETWORK_TIMEOUT',
        );
      case DioExceptionType.connectionError:
        return const Failure(
          code: 'NETWORK_UNAVAILABLE',
          message: 'NETWORK_UNAVAILABLE',
        );
      default:
        return const Failure(code: 'UNKNOWN_ERROR', message: 'UNKNOWN_ERROR');
    }
  }
}
