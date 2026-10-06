import 'dart:async';
import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/location/location_service.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/domain/repositories/active_order_repository.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/home/domain/repositories/home_repository.dart';
import 'package:dos_mobile/features/taxi/domain/repositories/taxi_repository.dart';
import 'package:dos_mobile/features/taxi/domain/entities/taxi_route.dart';
import 'package:dos_mobile/features/home/presentation/cubit/home_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockHomeRepository extends Mock implements HomeRepository {}

class _MockActiveOrderRepository extends Mock
    implements ActiveOrderRepository {}

class _MockLocationService extends Mock implements LocationService {}

class _MockTaxiRepository extends Mock implements TaxiRepository {}

void main() {
  late HomeRepository homeRepository;
  late ActiveOrderRepository activeOrderRepository;
  late LocationService locationService;
  late TaxiRepository taxiRepository;
  final currentLocation = LatLng(43.25, 76.93);
  final currentAddress = AddressSuggestion(
    title: 'пр. Абая, 150',
    subtitle: 'Алматы',
    location: currentLocation,
  );

  setUpAll(() {
    registerFallbackValue(LatLng(0, 0));
    registerFallbackValue(currentAddress);
  });

  setUp(() {
    homeRepository = _MockHomeRepository();
    activeOrderRepository = _MockActiveOrderRepository();
    locationService = _MockLocationService();
    taxiRepository = _MockTaxiRepository();
    when(
      () => homeRepository.fetchNearbyExecutors(
        location: any(named: 'location'),
        serviceType: any(named: 'serviceType'),
      ),
    ).thenAnswer((_) async => const Right([]));
    when(
      () => activeOrderRepository.fetchActiveOrder(),
    ).thenAnswer((_) async => const Right(null));
    when(
      () => locationService.currentLocation(),
    ).thenAnswer((_) async => Right(currentLocation));
    when(
      () => homeRepository.reverseGeocode(location: any(named: 'location')),
    ).thenAnswer((_) async => Right(currentAddress));
  });

  HomeCubit buildCubit() => HomeCubit(
    homeRepository,
    activeOrderRepository,
    locationService,
    taxiRepository,
  );

  blocTest<HomeCubit, HomeState>(
    'resolves passenger location before restoring active order',
    setUp: () {
      when(() => activeOrderRepository.fetchActiveOrder()).thenAnswer(
        (_) async => Right(
          ActiveOrderSession(
            orderId: 'active-1',
            serviceType: ActiveOrderServiceType.taxi,
            fromAddress: AddressSuggestion(
              title: 'Abay 10',
              subtitle: 'Almaty',
              location: LatLng(43.238949, 76.889709),
            ),
            toAddress: AddressSuggestion(
              title: 'Dostyk 15',
              subtitle: 'Almaty',
              location: LatLng(43.245, 76.95),
            ),
            routePoints: const [
              LatLng(43.238949, 76.889709),
              LatLng(43.245, 76.95),
            ],
            price: 1800,
            currency: 'KZT',
            initialEtaSeconds: 600,
            vehicleLabel: 'taxi',
            initialOrderStatus: 'accepted',
          ),
        ),
      );
    },
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => [
      isA<HomeState>().having(
        (state) => state.isResolvingCurrentLocation,
        'isResolvingCurrentLocation',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.currentLocation,
        'currentLocation',
        currentLocation,
      ),
      isA<HomeState>().having(
        (state) => state.currentAddress?.title,
        'currentAddress',
        'пр. Абая, 150',
      ),
      isA<HomeState>().having(
        (state) => state.restoredActiveOrderSession?.orderId,
        'restoredActiveOrderSession',
        'active-1',
      ),
    ],
    verify: (_) {
      verify(() => activeOrderRepository.fetchActiveOrder()).called(1);
      verifyNever(
        () => homeRepository.fetchNearbyExecutors(
          location: any(named: 'location'),
          serviceType: any(named: 'serviceType'),
        ),
      );
    },
  );

  blocTest<HomeCubit, HomeState>(
    'debounces address search and uses last query only',
    setUp: () {
      when(
        () => homeRepository.searchAddresses(
          query: 'almaty',
          cityId: any(named: 'cityId'),
          locationBias: any(named: 'locationBias'),
          radiusKm: any(named: 'radiusKm'),
        ),
      ).thenAnswer(
        (_) async => Right([
          AddressSuggestion(
            title: 'Almaty',
            subtitle: 'KZ',
            location: LatLng(43.238949, 76.889709),
          ),
        ]),
      );
    },
    build: buildCubit,
    act: (cubit) {
      cubit.onSearchQueryChanged('a');
      cubit.onSearchQueryChanged('alma');
      cubit.onSearchQueryChanged('almaty');
    },
    wait: const Duration(milliseconds: 350),
    expect: () => [
      isA<HomeState>().having(
        (state) => state.isSearching,
        'isSearching',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.isSearching,
        'isSearching',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.isSearching,
        'isSearching',
        true,
      ),
      isA<HomeState>()
          .having((state) => state.isSearching, 'isSearching', false)
          .having((state) => state.searchResults.length, 'results', 1),
    ],
    verify: (_) {
      verify(
        () => homeRepository.searchAddresses(
          query: 'almaty',
          cityId: any(named: 'cityId'),
          locationBias: any(named: 'locationBias'),
          radiusKm: any(named: 'radiusKm'),
        ),
      ).called(1);
      verifyNever(
        () => homeRepository.searchAddresses(
          query: 'a',
          cityId: any(named: 'cityId'),
          locationBias: any(named: 'locationBias'),
          radiusKm: any(named: 'radiusKm'),
        ),
      );
    },
  );

  blocTest<HomeCubit, HomeState>(
    'loads nearby executors on initialize',
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => [
      isA<HomeState>().having(
        (state) => state.isResolvingCurrentLocation,
        'isResolvingCurrentLocation',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.currentLocation,
        'currentLocation',
        currentLocation,
      ),
      isA<HomeState>()
          .having(
            (state) => state.isResolvingCurrentLocation,
            'isResolvingCurrentLocation',
            false,
          )
          .having(
            (state) => state.currentAddress?.title,
            'currentAddress',
            'пр. Абая, 150',
          ),
      isA<HomeState>().having(
        (state) => state.isLoadingNearby,
        'isLoadingNearby',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.isLoadingNearby,
        'isLoadingNearby',
        false,
      ),
    ],
  );

  blocTest<HomeCubit, HomeState>(
    'propagates search failures',
    setUp: () {
      when(
        () => homeRepository.searchAddresses(
          query: 'err',
          cityId: any(named: 'cityId'),
          locationBias: any(named: 'locationBias'),
          radiusKm: any(named: 'radiusKm'),
        ),
      ).thenAnswer(
        (_) async => const Left(
          Failure(
            code: 'HOME_ADDRESS_SEARCH_FAILED',
            message: 'Failed to search addresses',
          ),
        ),
      );
    },
    build: buildCubit,
    act: (cubit) => cubit.onSearchQueryChanged('err'),
    wait: const Duration(milliseconds: 350),
    expect: () => [
      isA<HomeState>().having(
        (state) => state.isSearching,
        'isSearching',
        true,
      ),
      isA<HomeState>().having(
        (state) => state.errorMessage,
        'errorMessage',
        'Failed to search addresses',
      ),
    ],
  );
  final otherPickup = AddressSuggestion(
    title: 'Адрес другого человека',
    subtitle: 'Алматы',
    location: LatLng(43.27, 76.95),
  );
  final destination = AddressSuggestion(
    title: 'Куда отвезти',
    subtitle: 'Алматы',
    location: LatLng(43.29, 76.97),
  );
  void stubRoutes() {
    when(
      () => taxiRepository.buildRoute(
        pickup: any(named: 'pickup'),
        destination: any(named: 'destination'),
      ),
    ).thenAnswer((invocation) async {
      final from = invocation.namedArguments[#pickup] as AddressSuggestion;
      final to = invocation.namedArguments[#destination] as AddressSuggestion;
      return Right(
        TaxiRoute(
          polylinePoints: [from.location, LatLng(43.28, 76.96), to.location],
          distanceMeters: 2000,
          durationSeconds: 300,
        ),
      );
    });
  }

  test(
    'manual pickup controls route and nearby drivers while retaining GPS',
    () async {
      stubRoutes();
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.resolveCurrentLocation();
      await cubit.selectAddress(destination);
      await cubit.selectPickup(otherPickup);
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state.effectivePickup, otherPickup);
      expect(cubit.state.currentAddress, currentAddress);
      expect(cubit.state.currentLocation, currentLocation);
      expect(cubit.state.selectedAddress, destination);
      expect(cubit.state.routePoints.first, otherPickup.location);
      verify(
        () => homeRepository.fetchNearbyExecutors(
          location: otherPickup.location,
          serviceType: any(named: 'serviceType'),
        ),
      ).called(1);
    },
  );

  test('late GPS resolution preserves manual pickup and map center', () async {
    final pending = Completer<Either<Failure, LatLng>>();
    when(
      () => locationService.currentLocation(),
    ).thenAnswer((_) => pending.future);
    final cubit = buildCubit();
    addTearDown(cubit.close);
    final resolving = cubit.resolveCurrentLocation();
    await cubit.selectPickup(otherPickup);
    pending.complete(Right(currentLocation));
    await resolving;
    expect(cubit.state.effectivePickup, otherPickup);
    expect(cubit.state.currentLocation, currentLocation);
    expect(cubit.state.mapCenter, otherPickup.location);
  });

  test(
    'editing pickup invalidates old coordinates instead of falling back to GPS',
    () async {
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.resolveCurrentLocation();
      await cubit.selectPickup(otherPickup);
      cubit.onPickupQueryChanged('');
      expect(cubit.state.effectivePickup, isNull);
      expect(cubit.state.useCustomPickup, isTrue);
      expect(cubit.state.currentAddress, currentAddress);
    },
  );

  test(
    'map selection edits the focused pickup and preserves destination',
    () async {
      stubRoutes();
      when(
        () => homeRepository.reverseGeocode(location: otherPickup.location),
      ).thenAnswer((_) async => Right(otherPickup));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.resolveCurrentLocation();
      await cubit.selectAddress(destination);
      cubit.activatePickupSearch();
      await cubit.selectRoutePointFromMap(otherPickup.location);
      await Future<void>.delayed(Duration.zero);
      expect(cubit.state.effectivePickup, otherPickup);
      expect(cubit.state.selectedAddress, destination);
      expect(cubit.state.routePoints.first, otherPickup.location);
    },
  );

  test('current location button explicitly restores GPS pickup', () async {
    final cubit = buildCubit();
    addTearDown(cubit.close);
    await cubit.resolveCurrentLocation();
    await cubit.selectPickup(otherPickup);
    await cubit.useCurrentPickup();
    expect(cubit.state.useCustomPickup, isFalse);
    expect(cubit.state.effectivePickup, currentAddress);
  });

  test('switching fields discards pending pickup search results', () async {
    final pending = Completer<Either<Failure, List<AddressSuggestion>>>();
    when(
      () => homeRepository.searchAddresses(
        query: 'pickup',
        cityId: any(named: 'cityId'),
        locationBias: any(named: 'locationBias'),
        radiusKm: any(named: 'radiusKm'),
      ),
    ).thenAnswer((_) => pending.future);
    final cubit = buildCubit();
    addTearDown(cubit.close);
    cubit.onPickupQueryChanged('pickup');
    await Future<void>.delayed(const Duration(milliseconds: 350));
    cubit.activateDestinationSearch();
    pending.complete(Right([otherPickup]));
    await Future<void>.delayed(Duration.zero);
    expect(cubit.state.searchingPickup, isFalse);
    expect(cubit.state.searchResults, isEmpty);
  });
}
