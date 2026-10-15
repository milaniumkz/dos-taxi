import 'dart:async';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/theme/app_theme.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_request_cubit.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_request_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class Repo extends Mock implements RideRepository {}

const pickup = AddressSuggestion(
  title: 'Арал вокзал',
  subtitle: '',
  location: LatLng(46.8, 61.67),
);
const destination = AddressSuggestion(
  title: 'Толе Би 38',
  subtitle: '',
  location: LatLng(46.81, 61.64),
);
Map<String, dynamic> quote({
  String basis = 'seat',
  String currency = 'KZT',
  int count = 1,
}) => {
  'termsKey': 'fingerprint',
  'pricingBasis': basis,
  'currency': currency,
  'passengerCount': basis == 'seat' ? count : 1,
  'minimumUnitPrice': currency == 'RUB' ? '71.43' : '500.00',
  'minimumOrderPrice': currency == 'RUB'
      ? (71.43 * (basis == 'seat' ? count : 1)).toStringAsFixed(2)
      : (500 * (basis == 'seat' ? count : 1)).toStringAsFixed(2),
  'priceStep': currency == 'RUB' ? '7.14' : '50.00',
};
void main() {
  test(
    'retries unchanged form using the same idempotency key and sends step counts, not client amounts',
    () async {
      final repo = Repo();
      when(
        () => repo.quote(any()),
      ).thenAnswer((_) async => Right(quote(count: 2)));
      final keys = <String>[], payloads = <Map<String, dynamic>>[];
      when(() => repo.create(any(), any())).thenAnswer((call) async {
        payloads.add(call.positionalArguments[0] as Map<String, dynamic>);
        keys.add(call.positionalArguments[1] as String);
        return const Left(Failure(code: 'NETWORK_ERROR', message: 'offline'));
      });
      final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
      await cubit.refreshQuote(2);
      cubit.changePrice(1);
      Future<void> submit() => cubit.submit(
        payment: 'transfer_kaspi',
        entrance: '',
        comment: '',
        childSeat: true,
        shared: true,
      );
      await submit();
      await submit();
      expect(keys.toSet(), hasLength(1));
      expect(payloads.first['priceSteps'], 1);
      expect(payloads.first['passengerCount'], 2);
      expect(payloads.first.containsKey('price'), isFalse);
      expect(payloads.first['paymentMethod'], 'transfer_kaspi');
      expect(payloads.first['pickupEntrance'], '');
      expect(payloads.first['needsChildSeat'], true);
      expect(payloads.first['sharedRide'], true);
      cubit.changePrice(1);
      await submit();
      expect(keys.last, isNot(keys.first));
      await cubit.close();
    },
  );
  test(
    'changing seat count preserves the chosen per-seat price steps',
    () async {
      final repo = Repo();
      when(() => repo.quote(any())).thenAnswer(
        (call) async => Right(
          quote(
            count:
                (call.positionalArguments[0] as Map)['passengerCount'] as int,
          ),
        ),
      );
      final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
      await cubit.refreshQuote();
      cubit.changePrice(2);
      await cubit.refreshQuote(2);
      expect(cubit.steps, 2);
      expect(cubit.state.quote!['minimumUnitPrice'], '500.00');
      expect(cubit.state.quote!['minimumOrderPrice'], '1000.00');
      await cubit.refreshQuote(3);
      expect(cubit.steps, 2);
      await cubit.close();
    },
  );
  test('ignores an obsolete quote after route/count changes', () async {
    final repo = Repo();
    final first = Completer<Either<Failure, Map<String, dynamic>>>(),
        second = Completer<Either<Failure, Map<String, dynamic>>>();
    var calls = 0;
    when(
      () => repo.quote(any()),
    ).thenAnswer((_) => ++calls == 1 ? first.future : second.future);
    final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
    final older = cubit.refreshQuote(), newer = cubit.refreshQuote(2);
    second.complete(Right(quote(count: 2)));
    await newer;
    first.complete(Right(quote()));
    await older;
    expect(cubit.state.quote?['passengerCount'], 2);
    cubit.changePrice(-1);
    expect(cubit.steps, 0);
    await cubit.close();
  });
  testWidgets(
    'seat total grows 500, 1000, 1500 and quantity keeps the chosen unit price',
    (tester) async {
      final repo = Repo();
      when(() => repo.quote(any())).thenAnswer(
        (call) async => Right(
          quote(
            count:
                (call.positionalArguments[0] as Map)['passengerCount'] as int,
          ),
        ),
      );
      final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
      await cubit.refreshQuote();
      await tester.pumpWidget(
        BlocProvider.value(
          value: cubit,
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('ru'),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const RideRequestScreen(),
          ),
        ),
      );
      await tester.pump();
      expect(find.textContaining(RegExp(r'Итого:.*500')), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add).first);
      await tester.pumpAndSettle();
      expect(find.textContaining(RegExp(r'Итого:.*1\s*000')), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add).first);
      await tester.pumpAndSettle();
      expect(find.textContaining(RegExp(r'Итого:.*1\s*500')), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add).last);
      await tester.pumpAndSettle();
      expect(find.textContaining(RegExp(r'Итого:.*1\s*650')), findsOneWidget);
      await tester.tap(find.byIcon(Icons.remove).first);
      await tester.pumpAndSettle();
      expect(cubit.steps, 1);
      expect(find.textContaining(RegExp(r'Итого:.*1\s*100')), findsOneWidget);
      final buttons = tester
          .widgetList<IconButton>(find.byType(IconButton))
          .where((b) => b.style?.foregroundColor != null);
      for (final button in buttons) {
        for (final states in [
          <WidgetState>{},
          <WidgetState>{WidgetState.disabled},
        ]) {
          final fg = button.style!.foregroundColor!.resolve(states)!,
              bg = button.style!.backgroundColor!.resolve(states)!;
          final a = fg.computeLuminance(), b = bg.computeLuminance();
          expect(
            (a > b ? (a + .05) / (b + .05) : (b + .05) / (a + .05)),
            greaterThan(3),
          );
        }
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await cubit.close();
    },
  );
  for (final locale in ['ru', 'kk']) {
    for (final basis in ['seat', 'salon']) {
      testWidgets(
        '$locale $basis request uses price buttons and optional separate pickup fields on a small screen',
        (tester) async {
          tester.view.physicalSize = const Size(360, 640);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final repo = Repo();
          when(() => repo.quote(any())).thenAnswer(
            (_) async => Right(quote(basis: basis, currency: 'RUB')),
          );
          final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
          await cubit.refreshQuote();
          await tester.pumpWidget(
            BlocProvider.value(
              value: cubit,
              child: MaterialApp(
                locale: Locale(locale),
                supportedLocales: AppLocalizations.supportedLocales,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                home: const RideRequestScreen(),
              ),
            ),
          );
          await tester.pump();
          expect(
            tester.widgetList<TextField>(find.byType(TextField)).length,
            inInclusiveRange(1, 2),
          );
          expect(
            find.byIcon(Icons.add),
            findsNWidgets(basis == 'seat' ? 2 : 1),
          );
          expect(find.textContaining('71,43'), findsWidgets);
          await tester.tap(find.byIcon(Icons.add).last);
          await tester.pump();
          expect(cubit.steps, 1);
          expect(find.textContaining('78,57'), findsWidgets);
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
          await cubit.close();
        },
      );
    }
  }
}
