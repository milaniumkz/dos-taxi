import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_profile.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_active_order_session.dart';
import 'package:dos_mobile/features/executor/domain/entities/incoming_executor_offer.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/incoming_order_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockExecutorRepository extends Mock implements ExecutorRepository {}

void main() {
  late ExecutorRepository executorRepository;
  late Stream<IncomingExecutorOffer> incomingStream;

  const profile = ExecutorProfile(
    id: 'executor-1',
    phone: '+7 700 000 00 00',
    name: 'Aruzhan',
    executorType: 'driver',
    vehicleType: null,
    carClass: 'economy',
    isOnline: true,
    balance: 0,
    verificationStatus: 'verified',
    preferredLanguage: 'ru',
    cityName: 'Almaty',
  );

  final offer = IncomingExecutorOffer(
    orderId: 'order-1',
    serviceType: 'taxi',
    currency: 'KZT',
    paymentMethod: 'cash',
    price: 1800,
    distanceMeters: 4200,
    durationSeconds: 720,
    pickupAddress: 'Abay Ave 10',
    pickupLocation: const LatLng(43.238949, 76.889709),
    destinationAddress: 'Dostyk Ave 15',
    destinationLocation: const LatLng(43.245, 76.95),
    offeredAt: DateTime(2025, 1, 1, 10),
    clientName: 'Dana',
    clientPhone: '+7 777 123 45 67',
  );

  setUpAll(() {
    registerFallbackValue(profile);
  });

  setUp(() {
    executorRepository = _MockExecutorRepository();
    incomingStream = Stream<IncomingExecutorOffer>.value(offer);

    when(
      () => executorRepository.watchIncomingOrders(
        profile: any(named: 'profile'),
      ),
    ).thenAnswer((_) => incomingStream);
    when(
      () => executorRepository.fetchActiveOrder(),
    ).thenAnswer((_) async => const Right(null));
    when(
      () => executorRepository.acceptIncomingOrder(any()),
    ).thenAnswer((_) async => const Right(unit));
    when(
      () => executorRepository.rejectIncomingOrder(any()),
    ).thenAnswer((_) async => const Right(unit));
  });

  IncomingOrderCubit buildCubit({
    Duration tick = const Duration(milliseconds: 20),
    int lifetime = 20,
  }) {
    return IncomingOrderCubit(
      executorRepository: executorRepository,
      countdownTick: tick,
      offerLifetimeSeconds: lifetime,
    );
  }

  blocTest<IncomingOrderCubit, IncomingOrderState>(
    'restores active order session from backend before starting listeners',
    build: buildCubit,
    setUp: () {
      when(() => executorRepository.fetchActiveOrder()).thenAnswer(
        (_) async => Right(
          ExecutorActiveOrderSession(
            orderId: 'active-1',
            serviceType: 'taxi',
            status: 'waiting',
            currency: 'KZT',
            paymentMethod: 'cash',
            price: 2100,
            pickupAddress: 'Abay Ave 10',
            pickupLocation: const LatLng(43.238949, 76.889709),
            destinationAddress: 'Dostyk Ave 15',
            destinationLocation: const LatLng(43.245, 76.95),
            clientName: 'Dana',
            clientPhone: '+7 777 123 45 67',
          ),
        ),
      );
    },
    act: (cubit) => cubit.synchronizeDashboardSession(profile),
    expect: () => [
      isA<IncomingOrderState>()
          .having(
            (state) => state.activeOrderSession?.orderId,
            'active session',
            'active-1',
          )
          .having((state) => state.isListening, 'isListening', false),
    ],
    verify: (_) {
      verify(() => executorRepository.fetchActiveOrder()).called(1);
      verifyNever(
        () => executorRepository.watchIncomingOrders(
          profile: any(named: 'profile'),
        ),
      );
    },
  );

  blocTest<IncomingOrderCubit, IncomingOrderState>(
    'accepts current offer and opens active order session',
    build: buildCubit,
    act: (cubit) async {
      await cubit.startListening(profile);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await cubit.acceptCurrentOffer();
    },
    wait: const Duration(milliseconds: 40),
    expect: () => [
      isA<IncomingOrderState>().having(
        (state) => state.isListening,
        'isListening',
        true,
      ),
      isA<IncomingOrderState>()
          .having((state) => state.currentOffer?.orderId, 'offer', 'order-1')
          .having((state) => state.secondsRemaining, 'seconds', 20),
      isA<IncomingOrderState>().having(
        (state) => state.isSubmitting,
        'isSubmitting',
        true,
      ),
      isA<IncomingOrderState>()
          .having((state) => state.currentOffer, 'offer', isNull)
          .having(
            (state) => state.activeOrderSession?.orderId,
            'session',
            'order-1',
          ),
    ],
  );

  blocTest<IncomingOrderCubit, IncomingOrderState>(
    'rejects current offer and clears the sheet state',
    build: () => buildCubit(tick: const Duration(seconds: 1)),
    act: (cubit) async {
      await cubit.startListening(profile);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      await cubit.rejectCurrentOffer();
    },
    wait: const Duration(milliseconds: 40),
    expect: () => [
      isA<IncomingOrderState>().having(
        (state) => state.isListening,
        'isListening',
        true,
      ),
      isA<IncomingOrderState>().having(
        (state) => state.currentOffer?.orderId,
        'offer',
        'order-1',
      ),
      isA<IncomingOrderState>().having(
        (state) => state.isSubmitting,
        'isSubmitting',
        true,
      ),
      isA<IncomingOrderState>()
          .having((state) => state.currentOffer, 'offer', isNull)
          .having((state) => state.activeOrderSession, 'session', isNull),
    ],
  );

  blocTest<IncomingOrderCubit, IncomingOrderState>(
    'times out the current offer when countdown reaches zero',
    build: () =>
        buildCubit(tick: const Duration(milliseconds: 20), lifetime: 2),
    act: (cubit) => cubit.startListening(profile),
    wait: const Duration(milliseconds: 80),
    expect: () => [
      isA<IncomingOrderState>().having(
        (state) => state.isListening,
        'isListening',
        true,
      ),
      isA<IncomingOrderState>().having(
        (state) => state.currentOffer?.orderId,
        'offer',
        'order-1',
      ),
      isA<IncomingOrderState>().having(
        (state) => state.secondsRemaining,
        'secondsRemaining',
        1,
      ),
      isA<IncomingOrderState>()
          .having((state) => state.currentOffer, 'offer', isNull)
          .having((state) => state.secondsRemaining, 'secondsRemaining', 0),
    ],
  );
}
