import 'dart:async';
import 'dart:convert';
import 'dart:io';
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
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _RideRepository extends Mock implements RideRepository {}

class _HomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _TileClient extends Mock implements HttpClient {}

class _TileRequest extends Mock implements HttpClientRequest {}

class _TileHeaders extends Mock implements HttpHeaders {}

class _TileResponse extends Stream<List<int>> implements HttpClientResponse {
  static final bytes = base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  );
  @override
  final headers = _TileHeaders();
  @override
  int get statusCode => HttpStatus.ok;
  @override
  int get contentLength => bytes.length;
  @override
  bool get isRedirect => false;
  @override
  bool get persistentConnection => false;
  @override
  String get reasonPhrase => 'OK';
  @override
  List<RedirectInfo> get redirects => const [];
  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;
  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => Stream<List<int>>.value(bytes).listen(
    onData,
    onError: onError,
    onDone: onDone,
    cancelOnError: cancelOnError,
  );
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _MapHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = _TileClient();
    final request = _TileRequest();
    when(() => client.openUrl(any(), any())).thenAnswer((_) async => request);
    when(() => request.headers).thenReturn(_TileHeaders());
    when(() => request.addStream(any())).thenAnswer((_) async {});
    when(() => request.close()).thenAnswer((_) async => _TileResponse());
    return client;
  }
}

void main() {
  setUpAll(() {
    registerFallbackValue(Uri());
    registerFallbackValue(const Stream<List<int>>.empty());
  });
  setUp(() {
    final previous = HttpOverrides.current;
    HttpOverrides.global = _MapHttpOverrides();
    addTearDown(() => HttpOverrides.global = previous);
  });
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
      serviceLocator.registerSingleton<RideRepository>(_RideRepository());
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
      expect(fields, findsNWidgets(5));
      final l = AppLocalizations.of(
        tester.element(find.byType(PassengerHomePlaceholderScreen)),
      )!;
      expect(find.text(l.ridePassengers), findsOneWidget);
      expect(find.text(l.rideHalyk), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, l.rideSubmit),
            )
            .onPressed,
        isNull,
      );
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
        var state = HomeState(
          selectedService: HomeServiceType.taxi,
          currentLocation: gps.location,
          mapCenter: pickup.location,
          currentAddress: gps,
          pickupAddress: pickup,
          useCustomPickup: true,
          selectedAddress: destination,
          routePoints: [
            pickup.location,
            const LatLng(43.28, 76.96),
            destination.location,
          ],
        );
        final changes = StreamController<HomeState>();
        addTearDown(changes.close);
        whenListen(
          home,
          changes.stream,
          initialState: state.copyWith(
            selectedAddress: null,
            routePoints: const [],
            mapCenter: gps.location,
          ),
        );
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
        for (final control in [
          find.text(l.ridePassengers),
          find.byKey(const ValueKey('ride-manual-price')),
          find.byType(TextField).at(0),
          find.byType(TextField).at(1),
          find.byType(TextField).at(3),
          find.byType(TextField).at(4),
          find.text(l.rideChildSeat),
          find.text(l.rideTogether),
          find.text(l.rideHalyk),
          find.text(l.rideSubmit),
        ]) {
          expect(control.hitTestable(), findsOneWidget);
        }
        expect(
          tester
              .state<ScrollableState>(find.byType(Scrollable).first)
              .position
              .maxScrollExtent,
          0,
        );
        expect(
          tester
              .widget<FilledButton>(
                find.widgetWithText(FilledButton, l.rideSubmit),
              )
              .onPressed,
          isNull,
        );
        verifyNever(() => repo.quote(any()));
        expect(find.text(l.ridePsb), findsNothing);
        void expectGpsAboveForm() {
          final map = tester.widget<FlutterMap>(find.byType(FlutterMap));
          final point = map.mapController!.camera.latLngToScreenPoint(
            gps.location,
          );
          final form = tester.getRect(find.byType(SingleChildScrollView));
          expect(point.x, inInclusiveRange(29, 331));
          expect(point.y - 29, greaterThanOrEqualTo(0));
          expect(point.y + 29, lessThan(form.top));
        }

        expectGpsAboveForm();
        state = state.copyWith(recenterRequestId: 1);
        changes.add(
          state.copyWith(
            selectedAddress: null,
            routePoints: const [],
            mapCenter: gps.location,
            recenterRequestId: 1,
          ),
        );
        await tester.pump();
        await tester.pump();
        expectGpsAboveForm();

        changes.add(state);
        await tester.pump();
        await tester.pump();
        final map = tester.widget<FlutterMap>(find.byType(FlutterMap));
        final camera = map.mapController!.camera;
        final scrollViewport = tester.getRect(
          find.byType(SingleChildScrollView),
        );
        for (final point in state.routePoints) {
          final projected = camera.latLngToScreenPoint(point);
          expect(projected.x, inInclusiveRange(39, 321));
          expect(projected.y, inInclusiveRange(31, scrollViewport.top - 23));
        }
        for (final control in [
          find.text(l.rideSubmit),
          find.text(l.ridePassengers),
          find.byType(TextField).at(3),
          find.text(l.rideChildSeat),
          find.text(l.rideTogether),
          find.text(l.rideHalyk),
        ]) {
          expect(control.hitTestable(), findsOneWidget);
        }
        expect(
          tester
              .state<ScrollableState>(find.byType(Scrollable).first)
              .position
              .maxScrollExtent,
          0,
        );
        await tester.ensureVisible(find.byIcon(Icons.add).first);
        await tester.tap(find.byIcon(Icons.add).first);
        await tester.pump();
        await tester.pump();
        expect(find.byKey(const ValueKey('ride-total')), findsNothing);
        expect(find.text(l.rideTotal), findsNothing);
        await tester.enterText(find.byType(TextField).at(2), '2');
        await tester.enterText(find.byType(TextField).at(3), 'У ворот');
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pump();
        changes.add(state.copyWith(selectedAddress: null));
        await tester.pump();
        await tester.pump();
        expect(find.text(l.rideSubmit), findsOneWidget);
        expect(
          tester
              .widget<FilledButton>(
                find.widgetWithText(FilledButton, l.rideSubmit),
              )
              .onPressed,
          isNull,
        );
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
        await tester.ensureVisible(find.text(l.rideHalyk));
        await tester.tap(find.text(l.rideHalyk));
        await tester.pump();
        await tester.ensureVisible(find.text(l.rideChildSeat));
        await tester.tap(find.text(l.rideChildSeat));
        await tester.pump();
        await tester.ensureVisible(find.text(l.rideTogether));
        await tester.tap(find.text(l.rideTogether));
        await tester.pump();
        await tester.ensureVisible(find.text(l.rideSubmit));
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
