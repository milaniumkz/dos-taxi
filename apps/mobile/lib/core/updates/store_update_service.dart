import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class RequiredStoreUpdate {
  const RequiredStoreUpdate({
    required this.url,
    required this.target,
    required this.android,
  });
  final Uri url;
  final String target;
  final bool android;
}

bool isNewerStoreVersion(String store, String installed) {
  final pattern = RegExp(r'^\d+(\.\d+){0,3}$');
  if (!pattern.hasMatch(store) || !pattern.hasMatch(installed)) return false;
  final latest = store.split('.').map(int.parse).toList();
  final current = installed.split('.').map(int.parse).toList();
  for (var i = 0; i < 4; i++) {
    final difference =
        (i < latest.length ? latest[i] : 0) -
        (i < current.length ? current[i] : 0);
    if (difference != 0) return difference > 0;
  }
  return false;
}

class StoreUpdateService {
  StoreUpdateService({Dio? dio, FlutterSecureStorage? storage})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 8),
              receiveTimeout: const Duration(seconds: 8),
            ),
          ),
      _storage = storage ?? const FlutterSecureStorage();
  final Dio _dio;
  final FlutterSecureStorage _storage;

  Future<RequiredStoreUpdate?> check() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return null;
    }
    final package = await PackageInfo.fromPlatform();
    final android = defaultTargetPlatform == TargetPlatform.android;
    final key = 'required_store_update_${package.packageName}';
    RequiredStoreUpdate? cached;
    try {
      final raw = await _storage.read(key: key);
      if (raw != null) {
        final json = jsonDecode(raw) as Map;
        final target = json['target'] as String;
        final needed = android
            ? (int.tryParse(target) ?? 0) >
                  (int.tryParse(package.buildNumber) ?? 0)
            : isNewerStoreVersion(target, package.version);
        final url = Uri.parse(json['url'] as String);
        if (needed &&
            url.scheme == 'https' &&
            (url.host == 'play.google.com' || url.host == 'apps.apple.com')) {
          cached = RequiredStoreUpdate(
            url: url,
            target: target,
            android: android,
          );
        } else {
          await _storage.delete(key: key);
        }
      }
    } catch (_) {
      /* A temporary storage error must not prevent a store check. */
    }
    RequiredStoreUpdate? available;
    try {
      if (android) {
        final info = await InAppUpdate.checkForUpdate();
        if (info.updateAvailability == UpdateAvailability.updateAvailable ||
            info.updateAvailability ==
                UpdateAvailability.developerTriggeredUpdateInProgress) {
          available = RequiredStoreUpdate(
            url: Uri.https('play.google.com', '/store/apps/details', {
              'id': package.packageName,
            }),
            target: '${info.availableVersionCode ?? 0}',
            android: true,
          );
        }
      } else {
        final response = await _dio.get<String>(
          'https://itunes.apple.com/lookup',
          queryParameters: {
            'bundleId': package.packageName,
            'country': const String.fromEnvironment(
              'STORE_COUNTRY',
              defaultValue: 'kz',
            ),
            '_': DateTime.now().millisecondsSinceEpoch,
          },
          options: Options(responseType: ResponseType.plain),
        );
        final data = jsonDecode(response.data!) as Map;
        for (final raw in data['results'] as List? ?? []) {
          final app = raw as Map;
          if (app['bundleId'] != package.packageName) continue;
          final latest = app['version']?.toString() ?? '';
          final url = Uri.tryParse(app['trackViewUrl']?.toString() ?? '');
          if (isNewerStoreVersion(latest, package.version) &&
              url?.scheme == 'https' &&
              url?.host == 'apps.apple.com') {
            available = RequiredStoreUpdate(
              url: url!,
              target: latest,
              android: false,
            );
          }
        }
      }
    } catch (_) {
      return cached;
    }
    if (available != null) {
      try {
        await _storage.write(
          key: key,
          value: jsonEncode({
            'target': available.target,
            'url': available.url.toString(),
          }),
        );
      } catch (_) {
        /* Keep the in-memory update requirement. */
      }
    }
    return available ?? cached;
  }

  Future<bool> open(RequiredStoreUpdate update) async {
    if (update.android) {
      try {
        final info = await InAppUpdate.checkForUpdate();
        if (info.immediateUpdateAllowed ||
            info.updateAvailability ==
                UpdateAvailability.developerTriggeredUpdateInProgress) {
          final result = await InAppUpdate.performImmediateUpdate();
          if (result == AppUpdateResult.success) return true;
        }
      } catch (_) {
        /* The store page remains available if the in-app flow fails. */
      }
    }
    return launchUrl(update.url, mode: LaunchMode.externalApplication);
  }
}
