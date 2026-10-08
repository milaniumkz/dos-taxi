import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import '../storage/token_storage.dart';

/// Server-owned translations, cached for offline errors and refreshed in-session.
class ServerErrorCatalog {
  ServerErrorCatalog._();
  static Map<String, Map<String, String>> _messages = {};
  static Timer? _timer;
  static bool _refreshing = false;

  static String? lookup(String code, String locale) =>
      _messages[locale.startsWith('kk') ? 'kk' : 'ru']?[code];

  static bool install(Object? payload) {
    if (payload is! Map || payload['messages'] is! Map) return false;
    final messages = payload['messages'] as Map;
    final next = <String, Map<String, String>>{};
    for (final locale in ['ru', 'kk']) {
      final entries = messages[locale];
      if (entries is! Map || entries.isEmpty) return false;
      final result = <String, String>{};
      for (final entry in entries.entries) {
        if (entry.key is! String ||
            entry.value is! String ||
            (entry.value as String).trim().isEmpty ||
            (entry.value as String).length > 1000) {
          return false;
        }
        result[entry.key as String] = entry.value as String;
      }
      next[locale] = result;
    }
    _messages = next;
    return true;
  }

  static Future<void> initialize(Dio dio, TokenStorage storage) async {
    try {
      final cached = await storage.readErrorCatalog();
      if (cached != null) install(jsonDecode(cached));
    } catch (_) {
      /* Startup must work without a cached catalog. */
    }
    Future<void> refresh() async {
      if (_refreshing) return;
      _refreshing = true;
      try {
        final response = await dio.get<Object?>(
          '/config/error-messages',
          options: Options(receiveTimeout: const Duration(seconds: 3)),
        );
        if (install(response.data)) {
          await storage.writeErrorCatalog(jsonEncode(response.data));
        }
      } catch (_) {
        /* Keep the last working catalog when offline. */
      } finally {
        _refreshing = false;
      }
    }

    _timer?.cancel();
    _timer = Timer.periodic(
      const Duration(minutes: 5),
      (_) => unawaited(refresh()),
    );
    unawaited(refresh());
  }
}
