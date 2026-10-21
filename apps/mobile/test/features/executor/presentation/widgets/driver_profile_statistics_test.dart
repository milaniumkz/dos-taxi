import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/executor/domain/entities/driver_statistics.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/widgets/driver_profile_statistics.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _Repository extends Mock implements ExecutorRepository {}

void main() {
  Future<void> mount(
    WidgetTester tester,
    ExecutorRepository repository, {
    String language = 'ru',
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: Locale(language),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(body: DriverProfileStatistics(repository: repository)),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'shows real values, refreshes and clears figures on API failure',
    (tester) async {
      final repository = _Repository();
      Either<Failure, DriverStatistics> result = const Right(
        DriverStatistics(
          completedOrders: 2,
          cancelledByDriver: 1,
          ratedOrders: 2,
          rating: 3.25,
          activityPercent: 66.7,
        ),
      );
      when(() => repository.fetchStatistics()).thenAnswer((_) async => result);
      await mount(tester, repository);
      expect(find.text('3,25'), findsOneWidget);
      expect(find.text('66,7%'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      for (final fake in ['4.92', '85%', '120']) {
        expect(find.text(fake), findsNothing);
      }
      result = const Right(
        DriverStatistics(
          completedOrders: 3,
          cancelledByDriver: 1,
          ratedOrders: 3,
          rating: 4,
          activityPercent: 75,
        ),
      );
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(find.text('4,00'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      result = const Left(
        Failure(code: 'NETWORK_UNAVAILABLE', message: 'NETWORK_UNAVAILABLE'),
      );
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();
      expect(find.text('—'), findsNWidgets(3));
      expect(find.text('Не удалось загрузить показатели'), findsOneWidget);
      expect(find.text('4,00'), findsNothing);
      result = const Right(
        DriverStatistics(
          completedOrders: 0,
          cancelledByDriver: 1,
          ratedOrders: 0,
          rating: null,
          activityPercent: 0,
        ),
      );
      await tester.tap(find.byIcon(Icons.refresh));
      await tester.pumpAndSettle();
      expect(find.text('0%'), findsOneWidget);
      expect(find.text('0'), findsOneWidget);
      expect(find.text('—'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  for (final language in ['ru', 'kk']) {
    testWidgets(
      'has no invented starting score for a new driver in $language',
      (tester) async {
        final repository = _Repository();
        when(() => repository.fetchStatistics()).thenAnswer(
          (_) async => const Right(
            DriverStatistics(
              completedOrders: 0,
              cancelledByDriver: 0,
              ratedOrders: 0,
              rating: null,
              activityPercent: null,
            ),
          ),
        );
        await mount(tester, repository, language: language);
        expect(find.text('0'), findsOneWidget);
        expect(find.text('—'), findsNWidgets(2));
        expect(find.text('5,00'), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  test(
    'requires actual counts and scores rather than substituting zeroes for bad responses',
    () {
      expect(() => DriverStatistics.fromJson({}), throwsFormatException);
      expect(
        () => DriverStatistics.fromJson({
          'completedOrders': 0,
          'cancelledByDriver': 0,
          'ratedOrders': 0,
          'rating': 5,
          'activityPercent': null,
        }),
        throwsFormatException,
      );
      expect(
        () => DriverStatistics.fromJson({
          'completedOrders': 1,
          'cancelledByDriver': 0,
          'ratedOrders': 1,
          'rating': 6,
          'activityPercent': 100,
        }),
        throwsFormatException,
      );
    },
  );
}
