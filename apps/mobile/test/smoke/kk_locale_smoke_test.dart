import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart' show Right;
import 'package:dos_mobile/features/executor/domain/entities/driver_bonus_progress.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dio/dio.dart';
import 'package:dos_mobile/core/api/api_client.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/presentation/cubit/active_order_cubit.dart';
import 'package:dos_mobile/features/active_order/presentation/screens/active_order_screen.dart';
import 'package:dos_mobile/features/auth/domain/entities/user.dart';
import 'package:dos_mobile/features/delivery/domain/entities/delivery_estimate.dart';
import 'package:dos_mobile/features/delivery/domain/entities/delivery_route_info.dart';
import 'package:dos_mobile/features/delivery/domain/enums/courier_vehicle_type.dart';
import 'package:dos_mobile/features/delivery/presentation/cubit/delivery_order_cubit.dart';
import 'package:dos_mobile/features/delivery/presentation/screens/delivery_confirm_screen.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_profile.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/incoming_order_cubit.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/executor_status_cubit.dart';
import 'package:dos_mobile/features/executor/presentation/screens/executor_home_screen.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/order_history/domain/entities/history_order.dart';
import 'package:dos_mobile/features/order_history/presentation/cubit/order_history_cubit.dart';
import 'package:dos_mobile/features/order_history/presentation/screens/order_detail_screen.dart';
import 'package:dos_mobile/features/order_history/presentation/screens/order_history_screen.dart';
import 'package:dos_mobile/features/payments/presentation/screens/payments_screen.dart';
import 'package:dos_mobile/features/profile/presentation/cubit/profile_settings_cubit.dart';
import 'package:dos_mobile/features/profile/presentation/screens/profile_screen.dart';
import 'package:dos_mobile/features/taxi/domain/entities/taxi_estimate.dart';
import 'package:dos_mobile/features/taxi/domain/entities/taxi_route.dart';
import 'package:dos_mobile/features/taxi/presentation/cubit/taxi_order_cubit.dart';
import 'package:dos_mobile/features/taxi/presentation/screens/taxi_payment_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _MockOrderHistoryCubit extends MockCubit<OrderHistoryState>
    implements OrderHistoryCubit {}

class _MockTaxiOrderCubit extends MockCubit<TaxiOrderState>
    implements TaxiOrderCubit {}

class _MockDeliveryOrderCubit extends MockCubit<DeliveryOrderState>
    implements DeliveryOrderCubit {}

class _MockActiveOrderCubit extends MockCubit<ActiveOrderState>
    implements ActiveOrderCubit {}

class _MockExecutorStatusCubit extends MockCubit<ExecutorStatusState>
    implements ExecutorStatusCubit {}

class _MockIncomingOrderCubit extends MockCubit<IncomingOrderState>
    implements IncomingOrderCubit {}

class _MockExecutorRepository extends Mock implements ExecutorRepository {}

class _MockApiClient extends Mock implements ApiClient {}

Widget _localizedApp(Widget child) {
  return MaterialApp(
    locale: const Locale('kk'),
    supportedLocales: const [Locale('ru'), Locale('kk')],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
    ],
    home: child,
  );
}

Future<void> _pumpScreen(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 3;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });

  await tester.pumpWidget(_localizedApp(child));
  await tester.pumpAndSettle();
  expect(tester.takeException(), isNull);
}

void main() {
  final pickup = AddressSuggestion(
    title: 'Абай даңғылы 10',
    subtitle: 'Алматы',
    location: const LatLng(43.238949, 76.889709),
  );
  final destination = AddressSuggestion(
    title: 'Достық даңғылы 15',
    subtitle: 'Алматы',
    location: const LatLng(43.245, 76.95),
  );

  tearDown(() async {
    await serviceLocator.reset();
  });

  testWidgets('renders profile screen in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = ProfileSettingsCubit()
      ..syncAuthenticatedUser(
        const User(
          id: 'user-1',
          phone: '+77771234567',
          name: 'Аружан',
          preferredLanguage: 'kk',
          preferredCurrency: 'KZT',
        ),
      );

    await _pumpScreen(
      tester,
      BlocProvider.value(value: cubit, child: const ProfileScreen()),
    );
  });

  testWidgets('renders payments screen in Kazakh without overflow', (
    tester,
  ) async {
    final apiClient = _MockApiClient();
    when(() => apiClient.guard<Response<dynamic>>(any())).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/payments/methods'),
        data: const [],
      ),
    );
    serviceLocator.registerSingleton<ApiClient>(apiClient);

    await _pumpScreen(tester, const PaymentsScreen());
  });

  testWidgets('renders order history list in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = _MockOrderHistoryCubit();
    final state = OrderHistoryState(
      items: [
        HistoryOrder(
          id: 'order-1',
          serviceType: 'delivery',
          status: 'completed',
          fromTitle: pickup.title,
          toTitle: destination.title,
          price: 2400,
          currency: 'KZT',
          createdAt: DateTime(2025, 1, 2, 12, 30),
          distanceMeters: 5600,
          durationSeconds: 900,
        ),
      ],
    );
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      const Stream<OrderHistoryState>.empty(),
      initialState: state,
    );

    await _pumpScreen(
      tester,
      BlocProvider<OrderHistoryCubit>.value(
        value: cubit,
        child: const OrderHistoryScreen(),
      ),
    );
  });

  testWidgets('renders order detail screen in Kazakh without overflow', (
    tester,
  ) async {
    await _pumpScreen(
      tester,
      OrderDetailScreen(
        order: HistoryOrder(
          id: 'order-1',
          serviceType: 'taxi',
          status: 'completed',
          fromTitle: pickup.title,
          toTitle: destination.title,
          price: 1900,
          currency: 'KZT',
          createdAt: DateTime(2025, 1, 2, 10),
          distanceMeters: 6200,
          durationSeconds: 1020,
          executorRating: 5,
        ),
      ),
    );
  });

  testWidgets('renders taxi payment screen in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = _MockTaxiOrderCubit();
    final state = TaxiOrderState(
      stage: TaxiOrderStage.selecting,
      pickup: pickup,
      destination: destination,
      route: const TaxiRoute(
        polylinePoints: [LatLng(43.238949, 76.889709), LatLng(43.245, 76.95)],
        distanceMeters: 6200,
        durationSeconds: 960,
      ),
      estimates: const [
        TaxiEstimate(
          carClass: 'comfort',
          price: 2200,
          currency: 'KZT',
          etaMinutes: 6,
        ),
      ],
      selectedEstimate: const TaxiEstimate(
        carClass: 'comfort',
        price: 2200,
        currency: 'KZT',
        etaMinutes: 6,
      ),
      promoCode: 'ALMATY10',
    );
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      const Stream<TaxiOrderState>.empty(),
      initialState: state,
    );

    await _pumpScreen(
      tester,
      BlocProvider<TaxiOrderCubit>.value(
        value: cubit,
        child: const TaxiPaymentScreen(),
      ),
    );
  });

  testWidgets('renders delivery confirm screen in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = _MockDeliveryOrderCubit();
    final state = DeliveryOrderState(
      stage: DeliveryOrderStage.confirming,
      fromAddress: pickup,
      toAddress: destination,
      routeInfo: const DeliveryRouteInfo(
        distanceMeters: 7300,
        durationSeconds: 1140,
      ),
      packageDescription: 'Құжаттар',
      contactName: 'Дана',
      contactPhone: '+77015554433',
      estimates: const [
        DeliveryEstimate(
          vehicleType: CourierVehicleType.scooter,
          price: 2600,
          currency: 'KZT',
          etaMinutes: 8,
        ),
      ],
      selectedEstimate: const DeliveryEstimate(
        vehicleType: CourierVehicleType.scooter,
        price: 2600,
        currency: 'KZT',
        etaMinutes: 8,
      ),
      promoCode: 'DELIVERY15',
    );
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      const Stream<DeliveryOrderState>.empty(),
      initialState: state,
    );

    await _pumpScreen(
      tester,
      BlocProvider<DeliveryOrderCubit>.value(
        value: cubit,
        child: const DeliveryConfirmScreen(),
      ),
    );
  });

  testWidgets('renders driver onboarding screen in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = _MockExecutorStatusCubit();
    final incomingCubit = _MockIncomingOrderCubit();
    const state = ExecutorStatusState(
      stage: ExecutorScreenStage.onboarding,
      currentLocation: LatLng(43.238949, 76.889709),
    );
    const incomingState = IncomingOrderState();
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      const Stream<ExecutorStatusState>.empty(),
      initialState: state,
    );
    when(() => cubit.initialize()).thenAnswer((_) async {});
    when(() => incomingCubit.state).thenReturn(incomingState);
    whenListen(
      incomingCubit,
      const Stream<IncomingOrderState>.empty(),
      initialState: incomingState,
    );

    await _pumpScreen(
      tester,
      MultiBlocProvider(
        providers: [
          BlocProvider<ExecutorStatusCubit>.value(value: cubit),
          BlocProvider<IncomingOrderCubit>.value(value: incomingCubit),
        ],
        child: const ExecutorHomeScreen(),
      ),
    );
  });

  testWidgets(
    'renders driver verification pending screen in Kazakh without overflow',
    (tester) async {
      final cubit = _MockExecutorStatusCubit();
      final incomingCubit = _MockIncomingOrderCubit();
      const state = ExecutorStatusState(
        stage: ExecutorScreenStage.verificationPending,
        currentLocation: LatLng(43.238949, 76.889709),
        profile: ExecutorProfile(
          id: 'executor-1',
          phone: '+77000000000',
          name: 'Аружан',
          executorType: 'courier',
          vehicleType: 'bicycle',
          carClass: null,
          isOnline: false,
          balance: 0,
          verificationStatus: 'pending',
          preferredLanguage: 'kk',
          cityName: 'Алматы',
        ),
      );
      const incomingState = IncomingOrderState();
      when(() => cubit.state).thenReturn(state);
      whenListen(
        cubit,
        const Stream<ExecutorStatusState>.empty(),
        initialState: state,
      );
      when(() => cubit.initialize()).thenAnswer((_) async {});
      when(() => incomingCubit.state).thenReturn(incomingState);
      whenListen(
        incomingCubit,
        const Stream<IncomingOrderState>.empty(),
        initialState: incomingState,
      );

      await _pumpScreen(
        tester,
        MultiBlocProvider(
          providers: [
            BlocProvider<ExecutorStatusCubit>.value(value: cubit),
            BlocProvider<IncomingOrderCubit>.value(value: incomingCubit),
          ],
          child: const ExecutorHomeScreen(),
        ),
      );
    },
  );

  testWidgets('renders active order screen in Kazakh without overflow', (
    tester,
  ) async {
    final cubit = _MockActiveOrderCubit();
    final session = ActiveOrderSession(
      orderId: 'order-1',
      serviceType: ActiveOrderServiceType.taxi,
      fromAddress: pickup,
      toAddress: destination,
      routePoints: const [LatLng(43.238949, 76.889709), LatLng(43.245, 76.95)],
      price: 2100,
      currency: 'KZT',
      initialEtaSeconds: 540,
      vehicleLabel: 'Comfort',
    );
    final state = ActiveOrderState(
      session: session,
      orderStatus: 'arriving',
      etaSeconds: 540,
      executorName: 'Нұрлан',
      executorRating: 4.8,
      executorVehicleLabel: 'Hyundai Accent',
      executorPhoneMasked: '+7 ••• ••• •• 67',
    );
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      const Stream<ActiveOrderState>.empty(),
      initialState: state,
    );

    await _pumpScreen(
      tester,
      BlocProvider<ActiveOrderCubit>.value(
        value: cubit,
        child: const ActiveOrderScreen(),
      ),
    );
  });
  testWidgets(
    'driver dashboard shows bonus progress and a tappable location icon',
    (tester) async {
      final status = _MockExecutorStatusCubit();
      final incoming = _MockIncomingOrderCubit();
      final repository = _MockExecutorRepository();
      when(() => repository.fetchBonusProgress()).thenAnswer(
        (_) async => const Right(
          DriverBonusProgress(
            isEnabled: true,
            ordersRequired: 20,
            bonusAmount: 5000,
            currency: 'KZT',
            totalCompletedOrders: 7,
            completedInCycle: 7,
            remainingOrders: 13,
            nextThreshold: 20,
          ),
        ),
      );
      serviceLocator.registerSingleton<ExecutorRepository>(repository);
      const state = ExecutorStatusState(
        stage: ExecutorScreenStage.dashboard,
        currentLocation: LatLng(43.238949, 76.889709),
        profile: ExecutorProfile(
          id: 'driver',
          phone: '+77000000000',
          name: 'Driver',
          executorType: 'driver',
          vehicleType: null,
          carClass: 'economy',
          isOnline: false,
          balance: 0,
          verificationStatus: 'verified',
          preferredLanguage: 'kk',
          cityName: 'Алматы',
        ),
      );
      whenListen(
        status,
        const Stream<ExecutorStatusState>.empty(),
        initialState: state,
      );
      whenListen(
        incoming,
        const Stream<IncomingOrderState>.empty(),
        initialState: const IncomingOrderState(),
      );
      when(() => status.initialize()).thenAnswer((_) async {});
      when(() => status.centerOnCurrentLocation()).thenAnswer((_) async {});
      await _pumpScreen(
        tester,
        MultiBlocProvider(
          providers: [
            BlocProvider<ExecutorStatusCubit>.value(value: status),
            BlocProvider<IncomingOrderCubit>.value(value: incoming),
          ],
          child: const ExecutorHomeScreen(),
        ),
      );
      expect(find.textContaining('13'), findsOneWidget);
      final bar = tester
          .widgetList<LinearProgressIndicator>(
            find.byType(LinearProgressIndicator),
          )
          .single;
      expect(bar.value, 0.35);
      final icon = find.widgetWithIcon(
        FloatingActionButton,
        Icons.my_location_rounded,
      );
      expect(icon, findsOneWidget);
      await tester.tap(icon);
      verify(() => status.centerOnCurrentLocation()).called(1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
