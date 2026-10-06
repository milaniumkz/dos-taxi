import 'package:bloc_test/bloc_test.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/home/presentation/cubit/home_cubit.dart';
import 'package:dos_mobile/features/home/presentation/screens/passenger_home_placeholder_screen.dart';
import 'package:dos_mobile/features/taxi/presentation/cubit/taxi_order_cubit.dart';
import 'package:dos_mobile/features/taxi/presentation/screens/taxi_class_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _HomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _TaxiCubit extends MockCubit<TaxiOrderState> implements TaxiOrderCubit {}

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

  testWidgets('order uses selected pickup rather than phone location', (
    tester,
  ) async {
    final home = _HomeCubit();
    final taxi = _TaxiCubit();
    final state = HomeState(
      selectedService: HomeServiceType.taxi,
      currentLocation: gps.location,
      mapCenter: pickup.location,
      currentAddress: gps,
      pickupAddress: pickup,
      useCustomPickup: true,
      selectedAddress: destination,
    );
    whenListen(home, const Stream<HomeState>.empty(), initialState: state);
    when(() => home.initialize()).thenAnswer((_) async {});
    when(
      () => taxi.startNewOrder(
        initialPickup: pickup,
        initialDestination: destination,
        serviceType: 'taxi',
      ),
    ).thenAnswer((_) async {});
    serviceLocator.registerSingleton<HomeCubit>(home);
    serviceLocator.registerSingleton<TaxiOrderCubit>(taxi);
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const PassengerHomePlaceholderScreen(),
        ),
        GoRoute(
          path: TaxiClassScreen.routePath,
          builder: (_, _) => const Scaffold(body: Text('class selection')),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
        locale: const Locale('ru'),
        supportedLocales: const [Locale('ru'), Locale('kk')],
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
      ),
    );
    await tester.pump();
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();
    verify(
      () => taxi.startNewOrder(
        initialPickup: pickup,
        initialDestination: destination,
        serviceType: 'taxi',
      ),
    ).called(1);
    expect(find.text('class selection'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
