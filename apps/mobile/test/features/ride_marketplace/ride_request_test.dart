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
  bool psbAvailable = false,
}) => {
  'availablePaymentMethods': [
    'cash',
    'transfer_kaspi',
    'transfer_halyk',
    if (psbAvailable) 'transfer_psb',
  ],
  'termsKey': 'fingerprint',
  'pricingBasis': basis,
  'currency': currency,
  'priceIsTotal': true,
  'passengerCount': count,
  'minimumUnitPrice': currency == 'RUB' ? '71.43' : '500.00',
  'minimumOrderPrice': currency == 'RUB' ? '71.43' : '500.00',
  'priceStep': currency == 'RUB' ? '7.14' : '50.00',
};
void main() {
  testWidgets(
    'PSB is shown only when the resolved city permits it and resets when the city changes',
    (tester) async {
      final repo = Repo();
      var psbAvailable = true;
      when(
        () => repo.quote(any()),
      ).thenAnswer((_) async => Right(quote(psbAvailable: psbAvailable)));
      final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
      await cubit.refreshQuote();
      await tester.pumpWidget(
        BlocProvider.value(
          value: cubit,
          child: MaterialApp(
            locale: const Locale('ru'),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const Scaffold(body: RideRequestScreen(embedded: true)),
          ),
        ),
      );
      await tester.pump();
      expect(find.text('ПСБ'), findsOneWidget);
      await tester.tap(find.text('ПСБ'));
      await tester.pump();
      psbAvailable = false;
      await cubit.refreshQuote();
      await tester.pump();
      expect(find.text('ПСБ'), findsNothing);
      final l = AppLocalizations.of(
        tester.element(find.byType(RideRequestScreen)),
      )!;
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, l.rideCash))
            .selected,
        isTrue,
      );
      await tester.pumpWidget(const SizedBox());
      await cubit.close();
    },
  );
  test(
    'keeps passenger count and price entered before the route without requesting a quote',
    () async {
      final repo = Repo();
      final cubit = RideRequestCubit(repo, null, null, 'taxi');
      await cubit.refreshQuote(4);
      cubit.changeManualPrice('500');
      expect(cubit.passengers, 4);
      expect(cubit.manualPrice, '500');
      expect(cubit.state.quote, isNull);
      verifyNever(() => repo.quote(any()));
      when(() => repo.quote(any())).thenAnswer(
        (_) async => Right({...quote(count: 4), 'priceInputMode': 'manual'}),
      );
      cubit.pickup = pickup;
      cubit.destination = destination;
      await cubit.refreshQuote();
      expect(cubit.passengers, 4);
      expect(cubit.manualPrice, '500');
      verify(() => repo.quote(any())).called(1);
      await cubit.close();
    },
  );
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
      expect(payloads.first['priceIsTotal'], true);
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
    'changing passenger count preserves the chosen trip price steps',
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
      expect(cubit.state.quote!['minimumOrderPrice'], '500.00');
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
    'four passengers offer 500 for the entire group without a total',
    (tester) async {
      final repo = Repo();
      when(() => repo.quote(any())).thenAnswer((call) async {
        final count =
            (call.positionalArguments[0] as Map)['passengerCount'] as int;
        return Right({
          ...quote(count: count),
          'priceInputMode': 'manual',
          'priceIsTotal': true,
          'pricingBasis': 'salon',
          'passengerCount': count,
          'minimumOrderPrice': '500.00',
        });
      });
      Map<String, dynamic>? submitted;
      when(() => repo.create(any(), any())).thenAnswer((call) async {
        submitted = call.positionalArguments[0] as Map<String, dynamic>;
        return const Left(Failure(code: 'NETWORK_ERROR', message: 'offline'));
      });
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
      for (var i = 0; i < 3; i++) {
        await tester.tap(find.byIcon(Icons.add));
        await tester.pumpAndSettle();
      }
      final input = find.byKey(const ValueKey('ride-manual-price'));
      await tester.enterText(input, '500');
      await tester.pump();
      final l = AppLocalizations.of(
        tester.element(find.byType(RideRequestScreen)),
      )!;
      expect(find.text(l.rideTotal), findsNothing);
      expect(find.text(l.ridePerSeat), findsNothing);
      expect(find.text(l.ridePerOrder), findsOneWidget);
      expect(tester.widget<TextField>(input).controller!.text, '500');
      await tester.tap(find.text(l.rideSubmit));
      await tester.pump();
      expect(submitted?['passengerCount'], 4);
      expect(submitted?['unitPrice'], '500.00');
      expect(submitted?['priceIsTotal'], true);
      await tester.pumpWidget(const SizedBox());
      await cubit.close();
    },
  );
  testWidgets(
    'passenger count changes preserve the offered price without a total',
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
      expect(find.byKey(const ValueKey('ride-total')), findsNothing);
      expect(find.textContaining('500'), findsWidgets);
      await tester.tap(find.byIcon(Icons.add).first);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ride-total')), findsNothing);
      expect(find.textContaining('500'), findsWidgets);
      await tester.tap(find.byIcon(Icons.add).first);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ride-total')), findsNothing);
      expect(find.textContaining('500'), findsWidgets);
      await tester.tap(find.byIcon(Icons.add).last);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ride-total')), findsNothing);
      expect(find.textContaining('550'), findsWidgets);
      await tester.tap(find.byIcon(Icons.remove).first);
      await tester.pumpAndSettle();
      expect(cubit.steps, 1);
      expect(find.byKey(const ValueKey('ride-total')), findsNothing);
      expect(find.textContaining('550'), findsWidgets);
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
            (_) async =>
                Right(quote(basis: basis, currency: 'RUB', psbAvailable: true)),
          );
          final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
          await cubit.refreshQuote();
          await tester.pumpWidget(
            BlocProvider.value(
              value: cubit,
              child: MaterialApp(
                theme: AppTheme.light(),
                locale: Locale(locale),
                supportedLocales: AppLocalizations.supportedLocales,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                home: const RideRequestScreen(),
              ),
            ),
          );
          await tester.pump();
          final l = AppLocalizations.of(
            tester.element(find.byType(RideRequestScreen)),
          )!;
          expect(find.text(l.rideSubmit).hitTestable(), findsOneWidget);
          expect(
            tester
                .state<ScrollableState>(find.byType(Scrollable).first)
                .position
                .maxScrollExtent,
            0,
          );
          expect(
            tester.widgetList<TextField>(find.byType(TextField)).length,
            inInclusiveRange(1, 2),
          );
          expect(find.byIcon(Icons.add), findsNWidgets(2));
          expect(find.textContaining('71,43'), findsWidgets);
          await tester.tap(find.byIcon(Icons.add).last);
          await tester.pump();
          expect(cubit.steps, 1);
          expect(find.textContaining('78,57'), findsWidgets);
          await tester.enterText(find.byType(TextField).first, '2');
          await tester.tap(find.byIcon(Icons.tune));
          await tester.pumpAndSettle();
          await tester.enterText(find.byType(TextField).last, 'У ворот');
          await tester.tap(find.byType(CheckboxListTile).first);
          await tester.pump();
          await tester.tap(find.byType(CheckboxListTile).last);
          await tester.pump();
          await tester.tap(find.widgetWithText(FilledButton, l.rideExtrasDone));
          await tester.pumpAndSettle();
          expect(find.textContaining('У ворот'), findsOneWidget);
          await tester.tap(find.byIcon(Icons.payments_outlined));
          await tester.pumpAndSettle();
          await tester.tap(find.text(l.ridePsb));
          await tester.pumpAndSettle();
          expect(find.text(l.ridePsb), findsOneWidget);
          expect(find.text(l.rideSubmit).hitTestable(), findsOneWidget);
          Map<String, dynamic>? submitted;
          when(() => repo.create(any(), any())).thenAnswer((call) async {
            submitted = call.positionalArguments[0] as Map<String, dynamic>;
            return const Left(
              Failure(code: 'NETWORK_ERROR', message: 'offline'),
            );
          });
          await tester.tap(find.text(l.rideSubmit));
          await tester.pumpAndSettle();
          expect(submitted?['pickupEntrance'], '2');
          expect(submitted?['pickupComment'], 'У ворот');
          expect(submitted?['needsChildSeat'], true);
          expect(submitted?['sharedRide'], true);
          expect(submitted?['paymentMethod'], 'transfer_psb');
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
          await cubit.close();
        },
      );
    }
  }
  for (final locale in ['ru', 'kk']) {
    testWidgets(
      'Baikonur $locale manual price switches currency at 500 and blocks amounts below 90',
      (tester) async {
        final repo = Repo();
        when(() => repo.quote(any())).thenAnswer((call) async {
          final count =
              (call.positionalArguments[0] as Map)['passengerCount'] as int;
          return Right({
            ...quote(count: count),
            'currency': 'RUB',
            'minimumUnitPrice': '90.00',
            'minimumOrderPrice': '90.00',
            'manualPricePolicy': {
              'rubMinimum': '90.00',
              'kztMinimum': '500.00',
              'kztThreshold': '500.00',
            },
          });
        });
        Map<String, dynamic>? submitted;
        when(() => repo.create(any(), any())).thenAnswer((call) async {
          submitted = call.positionalArguments[0] as Map<String, dynamic>;
          return const Left(Failure(code: 'NETWORK_ERROR', message: 'offline'));
        });
        final cubit = RideRequestCubit(repo, pickup, destination, 'taxi');
        await cubit.refreshQuote();
        await tester.pumpWidget(
          BlocProvider.value(
            value: cubit,
            child: MaterialApp(
              theme: AppTheme.light(),
              locale: Locale(locale),
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              home: const Scaffold(
                body: Padding(
                  padding: EdgeInsets.all(12),
                  child: RideRequestScreen(embedded: true),
                ),
              ),
            ),
          ),
        );
        await tester.pump();
        expect(
          find.byIcon(Icons.add),
          findsOneWidget,
        ); // seats only; price has no +/-.
        final input = find.byKey(const ValueKey('ride-manual-price'));
        final l = AppLocalizations.of(
          tester.element(find.byType(RideRequestScreen)),
        )!;
        for (final amount in ['89', '90', '499', '500', '1000']) {
          await tester.enterText(input, amount);
          await tester.pump();
          expect(
            cubit.selectedCurrency,
            int.parse(amount) < 500 ? 'RUB' : 'KZT',
          );
          expect(
            tester
                    .widget<FilledButton>(
                      find.widgetWithText(FilledButton, l.rideSubmit),
                    )
                    .onPressed !=
                null,
            int.parse(amount) >= 90,
          );
        }
        await tester.enterText(input, '');
        await tester.pump();
        expect(cubit.validManualPrice, false);
        await tester.enterText(input, '90');
        await tester.pump();
        await tester.tap(find.byIcon(Icons.add));
        await tester.pump();
        await tester.pump();
        expect(cubit.manualPrice, '90');
        expect(find.byKey(const ValueKey('ride-total')), findsNothing);
        expect(tester.widget<TextField>(input).controller!.text, '90');
        await tester.tap(find.text(l.rideSubmit));
        await tester.pump();
        expect(submitted?['unitPrice'], '90.00');
        expect(submitted?['priceSteps'], 0);
        expect(submitted?['passengerCount'], 2);
        expect(
          submitted?.containsKey('currency'),
          false,
        ); // inferred on server.
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        await cubit.close();
      },
    );
  }
  testWidgets(
    'normal city manual input stays KZT and follows updated admin minimum',
    (tester) async {
      final repo = Repo();
      when(() => repo.quote(any())).thenAnswer(
        (_) async => Right({
          ...quote(),
          'priceInputMode': 'manual',
          'minimumUnitPrice': '800.00',
          'minimumOrderPrice': '800.00',
        }),
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
            home: const Scaffold(body: RideRequestScreen(embedded: true)),
          ),
        ),
      );
      await tester.pump();
      expect(find.byIcon(Icons.add), findsOneWidget); // quantity only
      final input = find.byKey(const ValueKey('ride-manual-price'));
      expect(tester.widget<TextField>(input).controller!.text, '800');
      for (final amount in ['90', '499', '799', '800', '900']) {
        await tester.enterText(input, amount);
        await tester.pump();
        expect(cubit.selectedCurrency, 'KZT');
        expect(cubit.validManualPrice, int.parse(amount) >= 800);
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await cubit.close();
    },
  );
}
