import 'package:dio/dio.dart';
import 'package:dos_mobile/core/api/interceptors/retry_interceptor.dart';
import 'package:flutter_test/flutter_test.dart';

class _FailingAdapter implements HttpClientAdapter {
  int attempts = 0;
  bool recover = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    attempts++;
    if (recover && attempts > 1) {
      return ResponseBody.fromString('{}', 200);
    }
    throw DioException.connectionError(
      requestOptions: options,
      reason: 'Network unavailable',
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test(
    'exhausted retries complete with an error instead of hanging login',
    () async {
      final adapter = _FailingAdapter();
      final dio = Dio()..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio: dio));
      addTearDown(dio.close);

      await expectLater(
        dio
            .post<dynamic>('https://example.test/auth/send-otp')
            .timeout(const Duration(seconds: 2)),
        throwsA(isA<DioException>()),
      );
      expect(adapter.attempts, 4);
    },
  );

  test('a recovered connection returns the successful response', () async {
    final adapter = _FailingAdapter()..recover = true;
    final dio = Dio()..httpClientAdapter = adapter;
    dio.interceptors.add(RetryInterceptor(dio: dio));
    addTearDown(dio.close);

    final response = await dio.get<dynamic>('https://example.test');
    expect(response.statusCode, 200);
    expect(adapter.attempts, 2);
  });
}
