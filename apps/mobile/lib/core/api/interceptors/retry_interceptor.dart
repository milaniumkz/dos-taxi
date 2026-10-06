import 'dart:io';

import 'package:dio/dio.dart';

class RetryInterceptor extends Interceptor {
  RetryInterceptor({required Dio dio, this.maxRetries = 3}) : _dio = dio;

  final Dio _dio;
  final int maxRetries;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (!_shouldRetry(err)) {
      handler.next(err);
      return;
    }

    final currentAttempt =
        (err.requestOptions.extra['retry_attempt'] as int?) ?? 0;
    if (currentAttempt >= maxRetries) {
      handler.next(err);
      return;
    }

    err.requestOptions.extra['retry_attempt'] = currentAttempt + 1;
    final response = await _dio.fetch<dynamic>(err.requestOptions);
    handler.resolve(response);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.error is SocketException;
  }
}
