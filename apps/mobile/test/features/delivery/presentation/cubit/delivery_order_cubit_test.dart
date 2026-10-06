import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/features/delivery/domain/entities/create_delivery_order_params.dart';
import 'package:dos_mobile/features/delivery/domain/entities/delivery_estimate.dart';
import 'package:dos_mobile/features/delivery/domain/entities/delivery_route_info.dart';
import 'package:dos_mobile/features/delivery/domain/enums/courier_vehicle_type.dart';
import 'package:dos_mobile/features/delivery/domain/repositories/delivery_repository.dart';
import 'package:dos_mobile/features/delivery/domain/usecases/create_delivery_order_use_case.dart';
import 'package:dos_mobile/features/delivery/domain/usecases/estimate_delivery_use_case.dart';
import 'package:dos_mobile/features/delivery/domain/usecases/validate_delivery_details_use_case.dart';
import 'package:dos_mobile/features/delivery/presentation/cubit/delivery_order_cubit.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockDeliveryRepository extends Mock implements DeliveryRepository {}

class _MockEstimateDeliveryUseCase extends Mock
    implements EstimateDeliveryUseCase {}

class _MockCreateDeliveryOrderUseCase extends Mock
    implements CreateDeliveryOrderUseCase {}

void main() {
  late DeliveryRepository deliveryRepository;
  late EstimateDeliveryUseCase estimateDeliveryUseCase;
  late CreateDeliveryOrderUseCase createDeliveryOrderUseCase;

  const validateDeliveryDetailsUseCase = ValidateDeliveryDetailsUseCase();
  final fromAddress = AddressSuggestion(
    title: 'Abay 10',
    subtitle: 'Almaty',
    location: LatLng(43.238949, 76.889709),
  );
  final toAddress = AddressSuggestion(
    title: 'Dostyk 15',
    subtitle: 'Almaty',
    location: LatLng(43.245, 76.95),
  );
  const routeInfo = DeliveryRouteInfo(
    distanceMeters: 4800,
    durationSeconds: 960,
  );
  const estimates = [
    DeliveryEstimate(
      vehicleType: CourierVehicleType.bicycle,
      price: 950,
      currency: 'KZT',
      etaMinutes: 18,
    ),
    DeliveryEstimate(
      vehicleType: CourierVehicleType.car,
      price: 1600,
      currency: 'KZT',
      etaMinutes: 10,
    ),
  ];

  setUpAll(() {
    registerFallbackValue(fromAddress);
    registerFallbackValue(
      EstimateDeliveryParams(
        fromAddress: fromAddress,
        toAddress: toAddress,
        distanceMeters: routeInfo.distanceMeters,
        durationSeconds: routeInfo.durationSeconds,
        isFragile: false,
        requiresReturn: false,
      ),
    );
    registerFallbackValue(
      CreateDeliveryOrderParams(
        fromAddress: fromAddress,
        toAddress: toAddress,
        courierVehicleType: CourierVehicleType.bicycle,
        packageDescription: 'Documents',
        isFragile: false,
        requiresReturn: false,
        contactName: 'Aruzhan',
        contactPhone: '+77010000000',
        distanceMeters: routeInfo.distanceMeters,
        durationSeconds: routeInfo.durationSeconds,
        paymentMethod: 'card',
      ),
    );
  });

  setUp(() {
    deliveryRepository = _MockDeliveryRepository();
    estimateDeliveryUseCase = _MockEstimateDeliveryUseCase();
    createDeliveryOrderUseCase = _MockCreateDeliveryOrderUseCase();

    when(
      () => deliveryRepository.buildRouteInfo(
        fromAddress: any(named: 'fromAddress'),
        toAddress: any(named: 'toAddress'),
      ),
    ).thenAnswer((_) async => const Right(routeInfo));
    when(
      () => estimateDeliveryUseCase(any()),
    ).thenAnswer((_) async => const Right(estimates));
    when(
      () => createDeliveryOrderUseCase(any()),
    ).thenAnswer((_) async => const Right('delivery-1'));
  });

  DeliveryOrderCubit buildCubit() => DeliveryOrderCubit(
    deliveryRepository: deliveryRepository,
    estimateDeliveryUseCase: estimateDeliveryUseCase,
    createDeliveryOrderUseCase: createDeliveryOrderUseCase,
    validateDeliveryDetailsUseCase: validateDeliveryDetailsUseCase,
  );

  blocTest<DeliveryOrderCubit, DeliveryOrderState>(
    'moves to selecting after addresses and package details are set',
    build: buildCubit,
    act: (cubit) async {
      await cubit.startNewOrder(
        initialFromAddress: fromAddress,
        initialToAddress: toAddress,
      );
      await cubit.saveDetails(
        packageDescription: 'Documents',
        contactName: 'Aruzhan',
        contactPhone: '+77010000000',
        isFragile: false,
        requiresReturn: false,
      );
    },
    expect: () => [
      isA<DeliveryOrderState>()
          .having((state) => state.fromAddress, 'fromAddress', fromAddress)
          .having((state) => state.toAddress, 'toAddress', toAddress),
      isA<DeliveryOrderState>()
          .having(
            (state) => state.packageDescription,
            'packageDescription',
            'Documents',
          )
          .having((state) => state.contactName, 'contactName', 'Aruzhan')
          .having(
            (state) => state.contactPhone,
            'contactPhone',
            '+77010000000',
          ),
      isA<DeliveryOrderState>().having(
        (state) => state.stage,
        'stage',
        DeliveryOrderStage.estimating,
      ),
      isA<DeliveryOrderState>()
          .having((state) => state.stage, 'stage', DeliveryOrderStage.selecting)
          .having(
            (state) => state.selectedEstimate?.vehicleType,
            'selectedEstimate',
            CourierVehicleType.bicycle,
          ),
    ],
  );

  blocTest<DeliveryOrderCubit, DeliveryOrderState>(
    'submits a delivery order and stores the created order id',
    build: buildCubit,
    seed: () => DeliveryOrderState(
      stage: DeliveryOrderStage.confirming,
      fromAddress: fromAddress,
      toAddress: toAddress,
      routeInfo: routeInfo,
      packageDescription: 'Documents',
      contactName: 'Aruzhan',
      contactPhone: '+77010000000',
      estimates: estimates,
      selectedEstimate: estimates.first,
    ),
    act: (cubit) => cubit.submitOrder(),
    expect: () => [
      isA<DeliveryOrderState>().having(
        (state) => state.stage,
        'stage',
        DeliveryOrderStage.searching,
      ),
      isA<DeliveryOrderState>()
          .having((state) => state.stage, 'stage', DeliveryOrderStage.searching)
          .having(
            (state) => state.createdOrderId,
            'createdOrderId',
            'delivery-1',
          ),
    ],
  );

  blocTest<DeliveryOrderCubit, DeliveryOrderState>(
    'returns validation error when recipient phone is empty',
    build: buildCubit,
    seed: () =>
        DeliveryOrderState(fromAddress: fromAddress, toAddress: toAddress),
    act: (cubit) => cubit.saveDetails(
      packageDescription: 'Documents',
      contactName: 'Aruzhan',
      contactPhone: '   ',
      isFragile: false,
      requiresReturn: false,
    ),
    expect: () => [
      isA<DeliveryOrderState>().having(
        (state) => state.errorMessage,
        'errorMessage',
        'DELIVERY_RECIPIENT_PHONE_REQUIRED',
      ),
    ],
    verify: (_) {
      verifyNever(
        () => deliveryRepository.buildRouteInfo(
          fromAddress: any(named: 'fromAddress'),
          toAddress: any(named: 'toAddress'),
        ),
      );
    },
  );
}
