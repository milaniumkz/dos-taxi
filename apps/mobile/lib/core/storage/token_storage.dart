import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'browser_token_storage_stub.dart'
    if (dart.library.html) 'browser_token_storage_web.dart';

class TokenStorage {
  TokenStorage(this._storage, {required String namespace})
    : _namespace = namespace.trim().isEmpty ? 'app' : namespace.trim();

  static const _accessTokenKey = 'auth.access_token';
  static const _refreshTokenKey = 'auth.refresh_token';
  static const _userJsonKey = 'auth.user_json';
  static const _localeCodeKey = 'settings.locale_code';
  static const _themeModeKey = 'settings.theme_mode';
  static final Map<String, String> _memoryFallback = <String, String>{};

  final FlutterSecureStorage _storage;
  final String _namespace;

  Future<String?> readAccessToken() => _read(_accessTokenKey);

  Future<String?> readRefreshToken() => _read(_refreshTokenKey);

  Future<void> writeTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _write(_accessTokenKey, accessToken);
    await _write(_refreshTokenKey, refreshToken);
  }

  Future<void> writeUserJson(String value) => _write(_userJsonKey, value);

  Future<String?> readUserJson() => _read(_userJsonKey);

  Future<String?> readErrorCatalog() =>
      _read('settings.error_catalog', scoped: false);
  Future<void> writeErrorCatalog(String value) =>
      _write('settings.error_catalog', value, scoped: false);

  Future<String?> readLocaleCode() => _read(_localeCodeKey, scoped: false);

  Future<void> writeLocaleCode(String value) =>
      _write(_localeCodeKey, value, scoped: false);

  Future<String?> readThemeMode() => _read(_themeModeKey, scoped: false);

  Future<void> writeThemeMode(String value) =>
      _write(_themeModeKey, value, scoped: false);

  Future<void> clear() async {
    await _delete(_accessTokenKey);
    await _delete(_refreshTokenKey);
    await _delete(_userJsonKey);
  }

  String _scopedKey(String key) => '$_namespace.$key';

  String _key(String key, {bool scoped = true}) =>
      scoped ? _scopedKey(key) : key;

  Future<String?> _read(String key, {bool scoped = true}) async {
    final storageKey = _key(key, scoped: scoped);
    if (kIsWeb) {
      try {
        return readBrowserToken(storageKey) ?? _memoryFallback[storageKey];
      } catch (_) {
        return _memoryFallback[storageKey];
      }
    }

    return _storage.read(key: storageKey);
  }

  Future<void> _write(String key, String value, {bool scoped = true}) async {
    final storageKey = _key(key, scoped: scoped);
    if (kIsWeb) {
      _memoryFallback[storageKey] = value;
      try {
        writeBrowserToken(storageKey, value);
      } catch (_) {
        // Some mobile browsers block localStorage/WebCrypto. Keep session alive
        // in memory so login can complete and API calls can use the token.
      }
      return;
    }

    await _storage.write(key: storageKey, value: value);
  }

  Future<void> _delete(String key, {bool scoped = true}) async {
    final storageKey = _key(key, scoped: scoped);
    if (kIsWeb) {
      _memoryFallback.remove(storageKey);
      try {
        deleteBrowserToken(storageKey);
      } catch (_) {}
      return;
    }

    await _storage.delete(key: storageKey);
  }
}
