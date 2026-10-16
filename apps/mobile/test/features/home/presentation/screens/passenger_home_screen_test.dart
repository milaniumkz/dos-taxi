import 'dart:async';
import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/theme/app_theme.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/home/presentation/cubit/home_cubit.dart';
import 'package:dos_mobile/features/home/presentation/screens/passenger_home_placeholder_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _RideRepository extends Mock implements RideRepository {}

class _HomeCubit extends MockCubit<HomeState> implements HomeCubit {}

void main() {
  final gps = AddressSuggestion(
    title: 'Моя геопозиция',
    subtitle: 'Алматы',
    location: const LatLng(43.25, 76.93),
  );
  final pickup = AddressSuggestion(
    title: 'Адрес другого человека',
    subtitle: 'Алматы',
    location: const LatLng(43.27, 76.95),
  );
  final destination = AddressSuggestion(
    title: 'Куда отвезти',
    subtitle: 'Алматы',
    location: const LatLng(43.29, 76.97),
  );

  tearDown(() async {
    await serviceLocator.reset();
  });

  for (final locale in ['ru', 'kk']) {
    testWidgets('pickup remains editable during GPS loading ($locale)', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 3;
      tester.view.viewInsets = const FakeViewPadding(bottom: 900);
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
        tester.view.resetViewInsets();
      });
      final home = _HomeCubit();
      final state = HomeState(
        selectedService: HomeServiceType.taxi,
        currentLocation: gps.location,
        mapCenter: gps.location,
        isResolvingCurrentLocation: true,
      );
      whenListen(home, const Stream<HomeState>.empty(), initialState: state);
      when(() => home.initialize()).thenAnswer((_) async {});
      serviceLocator.registerSingleton<HomeCubit>(home);
      await tester.pumpWidget(
        MaterialApp(
          locale: Locale(locale),
          supportedLocales: const [Locale('ru'), Locale('kk')],
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          home: const PassengerHomePlaceholderScreen(),
        ),
      );
      await tester.pump();
      final fields = find.byType(TextField);
      expect(fields, findsNWidgets(2));
      expect(tester.widget<TextField>(fields.first).readOnly, isFalse);
      await tester.enterText(fields.first, 'Адрес другого человека');
      verify(
        () => home.onPickupQueryChanged('Адрес другого человека'),
      ).called(1);
      expect(tester.takeException(), isNull);
    });
  }

  for (final locale in ['ru', 'kk']) {
    testWidgets(
      'single page checkout is visible and submits selected pickup ($locale)',
      (tester) async {
        tester.view.physicalSize = const Size(360, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final home = _HomeCubit();
        final repo = _RideRepository();
        Map<String, dynamic>? submitted;
        when(() => repo.quote(any())).thenAnswer((call) async {
          final count =
              (call.positionalArguments[0] as Map)['passengerCount'] as int;
          return Right(<String, dynamic>{
            'termsKey': 'terms',
            'pricingBasis': 'seat',
            'currency': 'KZT',
            'passengerCount': count,
            'minimumUnitPrice': '500.00',
            'minimumOrderPrice': (500 * count).toString(),
            'priceStep': '50.00',
          });
        });
        when(() => repo.create(any(), any())).thenAnswer((call) async {
          submitted = call.positionalArguments[0] as Map<String, dynamic>;
          return const Left(Failure(code: 'NETWORK_ERROR', message: 'offline'));
        });
        final state = HomeState(
          selectedService: HomeServiceType.taxi,
          currentLocation: gps.location,
          mapCenter: pickup.location,
          currentAddress: gps,
          pickupAddress: pickup,
          useCustomPickup: true,
          selectedAddress: destination,
        );
        final changes = StreamController<HomeState>();
        addTearDown(changes.close);
        whenListen(home, changes.stream, initialState: state);
        when(() => home.initialize()).thenAnswer((_) async {});
        serviceLocator.registerSingleton<HomeCubit>(home);
        serviceLocator.registerSingleton<RideRepository>(repo);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light(),
            locale: Locale(locale),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const PassengerHomePlaceholderScreen(),
          ),
        );
        await tester.pump();
        await tester.pump();
        final l = AppLocalizations.of(
          tester.element(find.byType(PassengerHomePlaceholderScreen)),
        )!;
        expect(find.text(l.rideSubmit).hitTestable(), findsOneWidget);
        expect(find.text(l.ridePassengers).hitTestable(), findsOneWidget);
        expect(find.byType(TextField).at(3).hitTestable(), findsOneWidget);
        expect(find.text(l.rideChildSeat).hitTestable(), findsOneWidget);
        expect(find.text(l.rideTogether).hitTestable(), findsOneWidget);
        expect(find.text(l.rideHalyk).hitTestable(), findsOneWidget);
        expect(
          tester
              .state<ScrollableState>(find.byType(Scrollable).first)
              .position
              .maxScrollExtent,
          0,
        );
        await tester.tap(find.byIcon(Icons.add).first);
        await tester.pump();
        await tester.pump();
        expect(
          tester.widget<Text>(find.byKey(const ValueKey('ride-total'))).data,
          matches(RegExp(r'1\s*000')),
        );
        await tester.enterText(find.byType(TextField).at(2), '2');
        await tester.enterText(find.byType(TextField).at(3), 'У ворот');
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pump();
        changes.add(state.copyWith(selectedAddress: null));
        await tester.pump();
        expect(find.text(l.rideSubmit), findsNothing);
        changes.add(state);
        await tester.pump();
        await tester.pump();
        expect(
          tester
              .widget<TextField>(find.byType(TextField).at(2))
              .controller!
              .text,
          '2',
        );
        expect(
          tester
              .widget<TextField>(find.byType(TextField).at(3))
              .controller!
              .text,
          'У ворот',
        );
        await tester.tap(find.text(l.rideHalyk));
        await tester.pump();
        await tester.tap(find.text(l.rideChildSeat));
        await tester.pump();
        await tester.tap(find.text(l.rideTogether));
        await tester.pump();
        await tester.tap(find.text(l.rideSubmit));
        await tester.pump();
        expect(submitted?['routePoints'], [
          {
            'lat': pickup.location.latitude,
            'lng': pickup.location.longitude,
            'address': pickup.displayTitle,
          },
          {
            'lat': destination.location.latitude,
            'lng': destination.location.longitude,
            'address': destination.displayTitle,
          },
        ]);
        expect(submitted?['passengerCount'], 2);
        expect(submitted?['pickupEntrance'], '2');
        expect(submitted?['pickupComment'], 'У ворот');
        expect(submitted?['paymentMethod'], 'transfer_halyk');
        expect(submitted?['needsChildSeat'], true);
        expect(submitted?['sharedRide'], true);
        expect(find.byType(PassengerHomePlaceholderScreen), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
