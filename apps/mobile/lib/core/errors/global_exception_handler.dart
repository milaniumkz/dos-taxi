import 'package:dio/dio.dart';

import 'failure.dart';

class GlobalExceptionHandler {
  static Failure fromDio(DioException error) {
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic>) {
      return Failure(
        code: responseData['code'] as String? ?? 'API_ERROR',
        message: responseData['message'] as String? ?? 'Ошибка API',
      );
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const Failure(
          code: 'NETWORK_TIMEOUT',
          message: 'Превышено время ожидания сети',
        );
      case DioExceptionType.connectionError:
        return const Failure(
          code: 'NETWORK_UNAVAILABLE',
          message: 'Нет подключения к сети',
        );
      default:
        return const Failure(
          code: 'UNKNOWN_ERROR',
          message: 'Неизвестная ошибка',
        );
    }
  }
}
