import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/core/updates/store_update_gate.dart';
import 'package:dos_mobile/core/updates/store_update_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:package_info_plus/package_info_plus.dart';

class Http extends Mock implements Dio {}

class Storage extends Mock implements FlutterSecureStorage {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() => registerFallbackValue(Options()));
  tearDown(() => debugDefaultTargetPlatformOverride = null);
  test('compares numeric store versions without forcing a downgrade', () {
    expect(isNewerStoreVersion('1.10.0', '1.9.9'), isTrue);
    expect(isNewerStoreVersion('2.0', '1.99.99'), isTrue);
    expect(isNewerStoreVersion('1.1.1', '1.1.1'), isFalse);
    expect(isNewerStoreVersion('1.1', '1.1.0'), isFalse);
    expect(isNewerStoreVersion('1.0.0', '1.1.0'), isFalse);
    expect(isNewerStoreVersion('invalid', '1.1.0'), isFalse);
  });
  for (final role in ['passenger', 'driver']) {
    test(
      'iOS looks up the $role bundle and caches the requirement during a network failure',
      () async {
        debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
        final id = 'kz.milanium.dos$role';
        PackageInfo.setMockInitialValues(
          appName: 'DOS',
          packageName: id,
          version: '1.1.0',
          buildNumber: '32',
          buildSignature: '',
        );
        final dio = Http(), storage = Storage();
        String? cached;
        when(
          () => storage.read(key: any(named: 'key')),
        ).thenAnswer((_) async => cached);
        when(
          () => storage.write(
            key: any(named: 'key'),
            value: any(named: 'value'),
          ),
        ).thenAnswer((call) async {
          cached = call.namedArguments[#value] as String?;
        });
        when(() => storage.delete(key: any(named: 'key'))).thenAnswer((
          _,
        ) async {
          cached = null;
        });
        when(
          () => dio.get<String>(
            any(),
            queryParameters: any(named: 'queryParameters'),
            options: any(named: 'options'),
          ),
        ).thenAnswer((call) async {
          expect(
            (call.namedArguments[#queryParameters] as Map)['bundleId'],
            id,
          );
          return Response(
            data: jsonEncode({
              'results': [
                {
                  'bundleId': id,
                  'version': '1.1.1',
                  'trackViewUrl': 'https://apps.apple.com/kz/app/id123456',
                },
              ],
            }),
            requestOptions: RequestOptions(path: '/lookup'),
          );
        });
        final service = StoreUpdateService(dio: dio, storage: storage);
        expect((await service.check())?.target, '1.1.1');
        when(
          () => dio.get<String>(
            any(),
            queryParameters: any(named: 'queryParameters'),
            options: any(named: 'options'),
          ),
        ).thenThrow(Exception('offline'));
        expect((await service.check())?.url.host, 'apps.apple.com');
        PackageInfo.setMockInitialValues(
          appName: 'DOS',
          packageName: id,
          version: '1.1.1',
          buildNumber: '33',
          buildSignature: '',
        );
        expect(await service.check(), isNull);
      },
    );
  }
  test(
    'Android checks Google Play and uses the immediate update flow',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      PackageInfo.setMockInitialValues(
        appName: 'DOS',
        packageName: 'kz.milanium.dosdriver',
        version: '1.1.0',
        buildNumber: '32',
        buildSignature: '',
      );
      final storage = Storage();
      when(
        () => storage.read(key: any(named: 'key')),
      ).thenAnswer((_) async => null);
      when(
        () => storage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenAnswer((_) async {});
      const channel = MethodChannel('de.ffuf.in_app_update/methods');
      var opened = 0;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            if (call.method == 'performImmediateUpdate') {
              opened++;
              return null;
            }
            return {
              'updateAvailability': 2,
              'immediateAllowed': true,
              'flexibleAllowed': true,
              'availableVersionCode': 33,
              'installStatus': 0,
              'packageName': 'kz.milanium.dosdriver',
              'updatePriority': 5,
            };
          });
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(channel, null),
      );
      final service = StoreUpdateService(storage: storage);
      final update = await service.check();
      expect(update?.url.queryParameters['id'], 'kz.milanium.dosdriver');
      expect(await service.open(update!), isTrue);
      expect(opened, 1);
    },
  );
  for (final locale in ['ru', 'kk']) {
    testWidgets(
      'required update cannot be dismissed or bypassed by cancelling the store ($locale)',
      (tester) async {
        final update = RequiredStoreUpdate(
          url: Uri.parse('https://apps.apple.com/kz/app/id123'),
          target: '1.1.1',
          android: false,
        );
        var required = true, opened = 0;
        await tester.pumpWidget(
          MaterialApp(
            locale: Locale(locale),
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: StoreUpdateGate(
              check: () async => required ? update : null,
              open: (_) async {
                opened++;
                return false;
              },
              child: const Scaffold(body: Text('Order form')),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Order form'), findsNothing);
        expect(tester.widget<PopScope>(find.byType(PopScope)).canPop, isFalse);
        final l = AppLocalizations.of(
          tester.element(find.byType(StoreUpdateGate)),
        )!;
        await tester.tap(find.text(l.requiredUpdateAction));
        await tester.pumpAndSettle();
        expect(opened, 1);
        expect(find.text('Order form'), findsNothing);
        expect(find.text(l.requiredUpdateOpenError), findsOneWidget);
        required = false;
        await tester.tap(find.text(l.requiredUpdateRetry));
        await tester.pumpAndSettle();
        expect(find.text('Order form'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
