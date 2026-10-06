import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../auth/auth_session_events.dart';
import '../errors/global_exception_handler.dart';
import '../storage/token_storage.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/refresh_token_interceptor.dart';
import 'interceptors/retry_interceptor.dart';

typedef RefreshTokenCallback = Future<String?> Function();

class ApiClient {
  ApiClient._(this.dio);

  factory ApiClient.create({
    required AppConfig config,
    required TokenStorage tokenStorage,
    required RefreshTokenCallback onRefreshToken,
    required AuthSessionEvents authSessionEvents,
  }) {
    final dio = Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
      ),
    );

    dio.interceptors.addAll([
      AuthInterceptor(tokenStorage),
      RefreshTokenInterceptor(
        dio: dio,
        tokenStorage: tokenStorage,
        onRefreshToken: onRefreshToken,
        onUnauthorized: authSessionEvents.notifyUnauthorized,
      ),
      RetryInterceptor(dio: dio),
    ]);

    return ApiClient._(dio);
  }

  final Dio dio;

  Future<T> guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on DioException catch (error) {
      throw GlobalExceptionHandler.fromDio(error);
    }
  }
}
