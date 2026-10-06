import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/config/app_config.dart';
import 'package:dos_mobile/core/location/location_service.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_profile.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/executor_status_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockExecutorRepository extends Mock implements ExecutorRepository {}

class _MockLocationService extends Mock implements LocationService {}

void main() {
  late ExecutorRepository repository;
  late LocationService locationService;
  final config = AppConfig.driver(
    flavor: AppFlavor.dev,
    appName: 'DOS Driver',
    apiBaseUrl: 'https://example.com',
    wsBaseUrl: 'wss://example.com',
  );
  const pendingProfile = ExecutorProfile(
    id: 'executor-1',
    phone: '+77000000000',
    name: 'Aruzhan',
    executorType: 'courier',
    vehicleType: 'bicycle',
    carClass: null,
    isOnline: false,
    balance: 1500,
    verificationStatus: 'pending',
    preferredLanguage: 'kk',
    cityName: 'Almaty',
  );
  const verifiedProfile = ExecutorProfile(
    id: 'executor-2',
    phone: '+77001111111',
    name: 'Dana',
    executorType: 'driver',
    vehicleType: null,
    carClass: 'comfort',
    isOnline: true,
    balance: 4200,
    verificationStatus: 'verified',
    preferredLanguage: 'ru',
    cityName: 'Almaty',
  );

  setUpAll(() {
    registerFallbackValue(const LatLng(43.238949, 76.889709));
    registerFallbackValue(verifiedProfile);
  });

  setUp(() {
    repository = _MockExecutorRepository();
    locationService = _MockLocationService();
    when(
      () => repository.fetchProfile(),
    ).thenAnswer((_) async => const Right(pendingProfile));
    when(
      () => locationService.currentLocation(),
    ).thenAnswer((_) async => const Right(LatLng(43.238949, 76.889709)));
    when(
      () => repository.updateOnlineStatus(
        profile: any(named: 'profile'),
        isOnline: any(named: 'isOnline'),
        location: any(named: 'location'),
        heading: any(named: 'heading'),
      ),
    ).thenAnswer((_) async => const Right(verifiedProfile));
  });

  ExecutorStatusCubit buildCubit() => ExecutorStatusCubit(
    executorRepository: repository,
    config: config,
    locationService: locationService,
  );

  blocTest<ExecutorStatusCubit, ExecutorStatusState>(
    'moves to verification pending after loading a pending profile',
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => [
      isA<ExecutorStatusState>().having(
        (state) => state.isLoading,
        'isLoading',
        true,
      ),
      isA<ExecutorStatusState>()
          .having(
            (state) => state.stage,
            'stage',
            ExecutorScreenStage.verificationPending,
          )
          .having((state) => state.profile?.id, 'profile', 'executor-1'),
    ],
  );

  blocTest<ExecutorStatusCubit, ExecutorStatusState>(
    'opens dashboard for verified online executor',
    setUp: () {
      when(
        () => repository.fetchProfile(),
      ).thenAnswer((_) async => const Right(verifiedProfile));
    },
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => [
      isA<ExecutorStatusState>().having(
        (state) => state.isLoading,
        'isLoading',
        true,
      ),
      isA<ExecutorStatusState>()
          .having(
            (state) => state.stage,
            'stage',
            ExecutorScreenStage.dashboard,
          )
          .having((state) => state.profile?.isOnline, 'isOnline', true),
    ],
  );

  blocTest<ExecutorStatusCubit, ExecutorStatusState>(
    'switches online status and stores current location heartbeat',
    build: buildCubit,
    seed: () => const ExecutorStatusState(
      stage: ExecutorScreenStage.dashboard,
      currentLocation: LatLng(43.238949, 76.889709),
      profile: pendingProfile,
    ),
    act: (cubit) => cubit.updateOnline(true),
    expect: () => [
      isA<ExecutorStatusState>().having(
        (state) => state.isUpdatingOnline,
        'isUpdatingOnline',
        true,
      ),
      isA<ExecutorStatusState>()
          .having((state) => state.profile?.isOnline, 'isOnline', true)
          .having((state) => state.lastPresenceAt, 'lastPresenceAt', isNotNull),
    ],
  );
  test(
    'location action requests fresh GPS and recenters even at identical coordinates',
    () async {
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.centerOnCurrentLocation();
      final first = cubit.state.currentLocation;
      await cubit.centerOnCurrentLocation();
      expect(cubit.state.currentLocation, first);
      expect(cubit.state.recenterRequestId, 2);
      expect(cubit.state.isLocating, isFalse);
      verify(() => locationService.currentLocation()).called(2);
    },
  );
}
