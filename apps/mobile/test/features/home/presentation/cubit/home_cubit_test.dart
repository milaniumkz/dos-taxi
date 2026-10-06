import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/location/location_service.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/domain/repositories/active_order_repository.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/home/domain/repositories/home_repository.dart';
import 'package:dos_mobile/features/home/presentation/cubit/home_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockHomeRepository extends Mock implements HomeRepository {}

class _MockActiveOrderRepository extends Mock
    implements ActiveOrderRepository {}

class _MockLocationService extends Mock implements LocationService {}

void main() {
  late HomeRepository homeRepository;
  late ActiveOrderRepository activeOrderRepository;
  late LocationService locationService;
  final currentLocation = LatLng(43.25, 76.93);
  final currentAddress = AddressSuggestion(
    title: 'пр. Абая, 150',
    subtitle: 'Алматы',
    location: currentLocation,
  );

  setUpAll(() {
    registerFallbackValue(LatLng(0, 0));
  });

  setUp(() {
    homeRepository = _MockHomeRepository();
    activeOrderRepository = _MockActiveOrderRepository();
    locationService = _MockLocationService();
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

  HomeCubit buildCubit() =>
      HomeCubit(homeRepository, activeOrderRepository, locationService);

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
}
