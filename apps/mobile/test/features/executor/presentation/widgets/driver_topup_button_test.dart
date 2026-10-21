import 'dart:async';

import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/executor/domain/entities/driver_topup_settings.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/widgets/driver_topup_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _Repository extends Mock implements ExecutorRepository {}

void main() {
  late _Repository repository;
  late int manualOpened;
  late List<Uri> links;
  late DriverTopUpSettings settings;

  setUp(() {
    repository = _Repository();
    manualOpened = 0;
    links = [];
    settings = const DriverTopUpSettings(mode: DriverTopUpMode.manual);
    when(
      () => repository.fetchTopUpSettings(),
    ).thenAnswer((_) async => Right(settings));
  });

  Future<void> mount(
    WidgetTester tester, {
    Future<bool> Function(Uri)? openLink,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ru'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: DriverTopUpButton(
            repository: repository,
            onManual: () => manualOpened++,
            openLink:
                openLink ??
                (uri) async {
                  links.add(uri);
                  return true;
                },
          ),
        ),
      ),
    );
  }

  testWidgets(
    'loads each tap and switches manual to Kaspi to disabled without rebuilding the app',
    (tester) async {
      await mount(tester);
      await tester.tap(find.byType(ListTile));
      await tester.pumpAndSettle();
      expect(manualOpened, 1);
      settings = DriverTopUpSettings(
        mode: DriverTopUpMode.kaspiLink,
        kaspiUrl: Uri.parse('https://kaspi.kz/pay/example?service=dos'),
      );
      await tester.tap(find.byType(ListTile));
      await tester.pumpAndSettle();
      expect(links.single, settings.kaspiUrl);
      expect(manualOpened, 1);
      settings = const DriverTopUpSettings(mode: DriverTopUpMode.disabled);
      await tester.tap(find.byType(ListTile));
      await tester.pumpAndSettle();
      expect(find.text('Пополнение временно отключено'), findsOneWidget);
      expect(manualOpened, 1);
      expect(links, hasLength(1));
      verify(() => repository.fetchTopUpSettings()).called(3);
    },
  );

  testWidgets('network failure never opens the stale manual form', (
    tester,
  ) async {
    when(() => repository.fetchTopUpSettings()).thenAnswer(
      (_) async => const Left(
        Failure(code: 'NETWORK_UNAVAILABLE', message: 'NETWORK_UNAVAILABLE'),
      ),
    );
    await mount(tester);
    await tester.tap(find.byType(ListTile));
    await tester.pumpAndSettle();
    expect(manualOpened, 0);
    expect(links, isEmpty);
    expect(find.textContaining('Проверьте интернет'), findsOneWidget);
  });

  testWidgets('reports launch failure without creating a manual request', (
    tester,
  ) async {
    settings = DriverTopUpSettings(
      mode: DriverTopUpMode.kaspiLink,
      kaspiUrl: Uri.parse('https://kaspi.kz/pay/example'),
    );
    await mount(tester, openLink: (_) async => false);
    await tester.tap(find.byType(ListTile));
    await tester.pumpAndSettle();
    expect(manualOpened, 0);
    expect(
      find.textContaining('Не удалось открыть ссылку Kaspi'),
      findsOneWidget,
    );
  });

  testWidgets('prevents duplicate opens while waiting for fresh settings', (
    tester,
  ) async {
    final response = Completer<Either<Failure, DriverTopUpSettings>>();
    when(
      () => repository.fetchTopUpSettings(),
    ).thenAnswer((_) => response.future);
    await mount(tester);
    await tester.tap(find.byType(ListTile));
    await tester.pump();
    await tester.tap(find.byType(ListTile));
    response.complete(Right(settings));
    await tester.pumpAndSettle();
    expect(manualOpened, 1);
    verify(() => repository.fetchTopUpSettings()).called(1);
  });

  test(
    'rejects unknown modes and unsafe or absent links instead of manual fallback',
    () {
      for (final json in [
        {'mode': 'future'},
        {'mode': 'kaspi_link', 'kaspiUrl': ''},
        {'mode': 'kaspi_link', 'kaspiUrl': 'javascript:alert(1)'},
        {'mode': 'kaspi_link', 'kaspiUrl': 'http://kaspi.kz/pay'},
        {'mode': 'kaspi_link', 'kaspiUrl': 'https://user@kaspi.kz/pay'},
      ]) {
        expect(
          () => DriverTopUpSettings.fromJson(json),
          throwsA(isA<Failure>()),
        );
      }
      expect(
        DriverTopUpSettings.fromJson({
          'mode': 'kaspi_link',
          'kaspiUrl': 'https://pay.kaspi.kz/pay/example',
        }).mode,
        DriverTopUpMode.kaspiLink,
      );
    },
  );
}
