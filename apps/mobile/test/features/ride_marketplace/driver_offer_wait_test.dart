import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_poll_cubit.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/driver_offer_wait_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class Repo extends Mock implements RideRepository {}

void main() {
  for (final locale in ['ru', 'kk']) {
    testWidgets(
      '$locale pending offer blocks navigation, counts down and can be withdrawn',
      (tester) async {
        var clock = DateTime.utc(2026, 10, 15);
        final repo = Repo();
        Map<String, dynamic>? pending = {
          'id': 'offer',
          'orderId': 'request',
          'expiresAt': clock.add(const Duration(seconds: 30)).toIso8601String(),
          'totalPrice': '142.86',
          'currency': 'RUB',
        };
        final c = RidePollCubit(
          repo,
          () async => Right({
            'items': [],
            'pendingOffer': pending,
            'serverTime': clock.toIso8601String(),
          }),
          now: () => clock,
        );
        when(() => repo.withdraw('request')).thenAnswer((_) async {
          pending = null;
          return const Right({'withdrawn': true});
        });
        await tester.pumpWidget(
          MaterialApp(
            locale: Locale(locale),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: Scaffold(
              body: BlocProvider.value(
                value: c,
                child: const DriverOfferWaitGate(child: Text('feed')),
              ),
            ),
          ),
        );
        c.start();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 350));
        expect(find.byType(AlertDialog), findsOneWidget);
        expect(find.textContaining('142,86'), findsOneWidget);
        expect(c.waitingSeconds, 30);
        await tester.binding.handlePopRoute();
        await tester.pump();
        expect(find.byType(AlertDialog), findsOneWidget);
        clock = clock.add(const Duration(seconds: 10));
        await tester.pump(const Duration(seconds: 1));
        expect(c.waitingSeconds, 20);
        expect(find.textContaining('20'), findsWidgets);
        await tester.tap(find.byType(TextButton));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 350));
        verify(() => repo.withdraw('request')).called(1);
        expect(find.byType(AlertDialog), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        await c.close();
        await tester.pump();
      },
    );
  }
  testWidgets(
    'uses server deadline despite client clock skew and releases waiting during an outage',
    (tester) async {
      var clock = DateTime.utc(2050);
      final server = DateTime.utc(2026, 10, 15);
      var offline = false;
      final repo = Repo();
      final c = RidePollCubit(
        repo,
        () async => offline
            ? const Left(Failure(code: 'NETWORK_ERROR', message: 'offline'))
            : Right({
                'items': [],
                'pendingOffer': {
                  'id': 'offer',
                  'orderId': 'request',
                  'expiresAt': server
                      .add(const Duration(seconds: 30))
                      .toIso8601String(),
                  'totalPrice': '500',
                  'currency': 'KZT',
                },
                'serverTime': server.toIso8601String(),
              }),
        now: () => clock,
      );
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          locale: const Locale('ru'),
          home: Scaffold(
            body: BlocProvider.value(
              value: c,
              child: const DriverOfferWaitGate(child: Text('feed')),
            ),
          ),
        ),
      );
      c.start();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      expect(c.waitingSeconds, 30);
      offline = true;
      clock = clock.add(const Duration(seconds: 31));
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.byType(AlertDialog), findsNothing);
      expect(c.state.data?['pendingOffer'], isNull);
      await tester.pumpWidget(const SizedBox());
      await c.close();
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );
}
