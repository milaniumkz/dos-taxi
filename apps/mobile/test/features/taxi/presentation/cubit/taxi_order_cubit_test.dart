import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/taxi/domain/entities/create_taxi_order_params.dart';
import 'package:dos_mobile/features/taxi/domain/entities/taxi_estimate.dart';
import 'package:dos_mobile/features/taxi/domain/entities/taxi_route.dart';
import 'package:dos_mobile/features/taxi/domain/repositories/taxi_repository.dart';
import 'package:dos_mobile/features/taxi/domain/usecases/create_taxi_order_use_case.dart';
import 'package:dos_mobile/features/taxi/domain/usecases/estimate_taxi_use_case.dart';
import 'package:dos_mobile/features/taxi/presentation/cubit/taxi_order_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockTaxiRepository extends Mock implements TaxiRepository {}

class _MockEstimateTaxiUseCase extends Mock implements EstimateTaxiUseCase {}

class _MockCreateTaxiOrderUseCase extends Mock
    implements CreateTaxiOrderUseCase {}

void main() {
  late TaxiRepository taxiRepository;
  late EstimateTaxiUseCase estimateTaxiUseCase;
  late CreateTaxiOrderUseCase createTaxiOrderUseCase;

  final pickup = AddressSuggestion(
    title: 'Abylai Khan 10',
    subtitle: 'Almaty',
    location: LatLng(43.238949, 76.889709),
  );
  final destination = AddressSuggestion(
    title: 'Dostyk 15',
    subtitle: 'Almaty',
    location: LatLng(43.245, 76.95),
  );
  final route = TaxiRoute(
    polylinePoints: [pickup.location, destination.location],
    distanceMeters: 5400,
    durationSeconds: 960,
  );
  const estimates = [
    TaxiEstimate(
      carClass: 'economy',
      price: 1200,
      currency: 'KZT',
      etaMinutes: 4,
    ),
    TaxiEstimate(
      carClass: 'comfort',
      price: 1600,
      currency: 'KZT',
      etaMinutes: 6,
    ),
  ];

  setUpAll(() {
    registerFallbackValue(pickup);
    registerFallbackValue(
      EstimateTaxiParams(
        pickup: pickup,
        destination: destination,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      ),
    );
    registerFallbackValue(
      CreateTaxiOrderParams(
        pickup: pickup,
        destination: destination,
        carClass: 'economy',
        paymentMethod: 'card',
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      ),
    );
  });

  setUp(() {
    taxiRepository = _MockTaxiRepository();
    estimateTaxiUseCase = _MockEstimateTaxiUseCase();
    createTaxiOrderUseCase = _MockCreateTaxiOrderUseCase();

    when(
      () => taxiRepository.buildRoute(
        pickup: any(named: 'pickup'),
        destination: any(named: 'destination'),
      ),
    ).thenAnswer((_) async => right(route));
    when(
      () => estimateTaxiUseCase(any()),
    ).thenAnswer((_) async => const Right(estimates));
    when(
      () => createTaxiOrderUseCase(any()),
    ).thenAnswer((_) async => const Right('order-1'));
  });

  TaxiOrderCubit buildCubit() => TaxiOrderCubit(
    taxiRepository: taxiRepository,
    estimateTaxiUseCase: estimateTaxiUseCase,
    createTaxiOrderUseCase: createTaxiOrderUseCase,
  );

  blocTest<TaxiOrderCubit, TaxiOrderState>(
    'moves from idle to selecting after pickup and destination are set',
    build: buildCubit,
    act: (cubit) async {
      await cubit.startNewOrder(initialPickup: pickup);
      await cubit.setDestination(destination);
    },
    expect: () => [
      isA<TaxiOrderState>().having((state) => state.pickup, 'pickup', pickup),
      isA<TaxiOrderState>()
          .having((state) => state.pickup, 'pickup', pickup)
          .having((state) => state.destination, 'destination', destination),
      isA<TaxiOrderState>().having(
        (state) => state.stage,
        'stage',
        TaxiOrderStage.estimating,
      ),
      isA<TaxiOrderState>()
          .having((state) => state.stage, 'stage', TaxiOrderStage.selecting)
          .having(
            (state) => state.selectedEstimate?.carClass,
            'selectedEstimate',
            'economy',
          ),
    ],
  );

  blocTest<TaxiOrderCubit, TaxiOrderState>(
    'moves to confirming after payment step is prepared',
    build: buildCubit,
    seed: () => TaxiOrderState(
      stage: TaxiOrderStage.selecting,
      pickup: pickup,
      destination: destination,
      route: route,
      estimates: estimates,
      selectedEstimate: estimates.first,
    ),
    act: (cubit) => cubit.prepareConfirmation(),
    expect: () => [
      isA<TaxiOrderState>().having(
        (state) => state.stage,
        'stage',
        TaxiOrderStage.confirming,
      ),
    ],
  );

  blocTest<TaxiOrderCubit, TaxiOrderState>(
    'moves to searching and stores order id when order is submitted',
    build: buildCubit,
    seed: () => TaxiOrderState(
      stage: TaxiOrderStage.confirming,
      pickup: pickup,
      destination: destination,
      route: route,
      estimates: estimates,
      selectedEstimate: estimates.first,
    ),
    act: (cubit) => cubit.submitOrder(),
    expect: () => [
      isA<TaxiOrderState>().having(
        (state) => state.stage,
        'stage',
        TaxiOrderStage.searching,
      ),
      isA<TaxiOrderState>()
          .having((state) => state.stage, 'stage', TaxiOrderStage.searching)
          .having((state) => state.createdOrderId, 'createdOrderId', 'order-1'),
    ],
  );

  blocTest<TaxiOrderCubit, TaxiOrderState>(
    'emits an error when create order fails',
    setUp: () {
      when(() => createTaxiOrderUseCase(any())).thenAnswer(
        (_) async =>
            const Left(Failure(code: 'ORDER_FAILED', message: 'Order failed')),
      );
    },
    build: buildCubit,
    seed: () => TaxiOrderState(
      stage: TaxiOrderStage.confirming,
      pickup: pickup,
      destination: destination,
      route: route,
      estimates: estimates,
      selectedEstimate: estimates.first,
    ),
    act: (cubit) => cubit.submitOrder(),
    expect: () => [
      isA<TaxiOrderState>().having(
        (state) => state.stage,
        'stage',
        TaxiOrderStage.searching,
      ),
      isA<TaxiOrderState>()
          .having((state) => state.stage, 'stage', TaxiOrderStage.confirming)
          .having((state) => state.errorMessage, 'error', 'Order failed'),
    ],
  );
}
