import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_tracking_event.dart';
import 'package:dos_mobile/features/active_order/domain/repositories/active_order_repository.dart';
import 'package:dos_mobile/features/active_order/domain/services/executor_position_interpolator.dart';
import 'package:dos_mobile/features/active_order/presentation/cubit/active_order_cubit.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockActiveOrderRepository extends Mock
    implements ActiveOrderRepository {}

void main() {
  late ActiveOrderRepository activeOrderRepository;
  late StreamController<ActiveOrderTrackingEvent> trackingController;

  final session = ActiveOrderSession(
    orderId: 'order-1',
    serviceType: ActiveOrderServiceType.taxi,
    fromAddress: AddressSuggestion(
      title: 'Abay 10',
      subtitle: 'Almaty',
      location: const LatLng(43.238949, 76.889709),
    ),
    toAddress: AddressSuggestion(
      title: 'Dostyk 15',
      subtitle: 'Almaty',
      location: const LatLng(43.245, 76.95),
    ),
    routePoints: const [LatLng(43.238949, 76.889709), LatLng(43.245, 76.95)],
    price: 1500,
    currency: 'KZT',
    initialEtaSeconds: 900,
    vehicleLabel: 'Эконом',
  );

  setUpAll(() {
    registerFallbackValue(session);
  });

  setUp(() {
    activeOrderRepository = _MockActiveOrderRepository();
    trackingController = StreamController<ActiveOrderTrackingEvent>.broadcast();

    when(
      () => activeOrderRepository.trackOrder(any()),
    ).thenAnswer((_) => trackingController.stream);
    when(
      () => activeOrderRepository.cancelOrder(any()),
    ).thenAnswer((_) async => const Right(null));
  });

  tearDown(() async {
    await trackingController.close();
  });

  ActiveOrderCubit buildCubit() => ActiveOrderCubit(
    session: session,
    activeOrderRepository: activeOrderRepository,
    positionInterpolator: const ExecutorPositionInterpolator(steps: 1),
  );

  blocTest<ActiveOrderCubit, ActiveOrderState>(
    'moves from connecting to accepted when tracking emits executor info',
    build: buildCubit,
    act: (cubit) async {
      await cubit.startTracking();
      trackingController.add(
        const ActiveOrderTrackingEvent.statusChanged(
          orderStatus: 'accepted',
          executorName: 'Aruzhan',
          executorRating: 4.9,
          executorVehicleLabel: 'Hyundai Accent',
          executorPhone: '+7 777 123 45 67',
        ),
      );
    },
    wait: const Duration(milliseconds: 20),
    expect: () => [
      isA<ActiveOrderState>().having(
        (state) => state.isConnecting,
        'isConnecting',
        true,
      ),
      isA<ActiveOrderState>()
          .having((state) => state.isConnecting, 'isConnecting', false)
          .having((state) => state.orderStatus, 'orderStatus', 'accepted')
          .having((state) => state.executorName, 'executorName', 'Aruzhan'),
    ],
  );

  blocTest<ActiveOrderCubit, ActiveOrderState>(
    'marks rating flow when order is completed',
    build: buildCubit,
    act: (cubit) async {
      await cubit.startTracking();
      trackingController.add(
        const ActiveOrderTrackingEvent.statusChanged(orderStatus: 'completed'),
      );
    },
    wait: const Duration(milliseconds: 20),
    expect: () => [
      isA<ActiveOrderState>().having(
        (state) => state.isConnecting,
        'isConnecting',
        true,
      ),
      isA<ActiveOrderState>()
          .having((state) => state.orderStatus, 'orderStatus', 'completed')
          .having((state) => state.shouldOpenRating, 'shouldOpenRating', true),
    ],
  );

  blocTest<ActiveOrderCubit, ActiveOrderState>(
    'cancels the order locally when user confirms cancellation',
    build: buildCubit,
    act: (cubit) => cubit.cancelOrder(),
    expect: () => [
      isA<ActiveOrderState>().having(
        (state) => state.isCancelling,
        'isCancelling',
        true,
      ),
      isA<ActiveOrderState>()
          .having((state) => state.isCancelling, 'isCancelling', false)
          .having(
            (state) => state.orderStatus,
            'orderStatus',
            'cancelled_client',
          ),
    ],
  );
}
