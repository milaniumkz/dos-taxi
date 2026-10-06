import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/config/app_config.dart';
import '../../core/di/service_locator.dart';
import '../../features/active_order/domain/entities/active_order_session.dart';
import '../../features/active_order/domain/repositories/active_order_repository.dart';
import '../../features/active_order/domain/services/executor_position_interpolator.dart';
import '../../features/active_order/presentation/cubit/active_order_cubit.dart';
import '../../features/active_order/presentation/screens/active_order_screen.dart';
import '../../features/active_order/presentation/screens/rating_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/auth/presentation/screens/phone_input_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/delivery/presentation/cubit/delivery_order_cubit.dart';
import '../../features/delivery/presentation/screens/delivery_address_screen.dart';
import '../../features/delivery/presentation/screens/delivery_confirm_screen.dart';
import '../../features/delivery/presentation/screens/delivery_details_screen.dart';
import '../../features/delivery/presentation/screens/delivery_payment_screen.dart';
import '../../features/delivery/presentation/screens/delivery_vehicle_screen.dart';
import '../../features/executor/presentation/cubit/executor_status_cubit.dart';
import '../../features/executor/presentation/cubit/incoming_order_cubit.dart';
import '../../features/executor/presentation/screens/executor_active_order_screen.dart';
import '../../features/executor/presentation/screens/executor_home_screen.dart';
import '../../features/favorites/presentation/screens/favorites_screen.dart';
import '../../features/home/presentation/screens/passenger_home_placeholder_screen.dart';
import '../../features/legal/presentation/screens/legal_screen.dart';
import '../../features/order_history/domain/entities/history_order.dart';
import '../../features/order_history/presentation/cubit/order_history_cubit.dart';
import '../../features/order_history/presentation/screens/order_detail_screen.dart';
import '../../features/order_history/presentation/screens/order_history_screen.dart';
import '../../features/order_chat/presentation/screens/order_chat_screen.dart';
import '../../features/payments/presentation/screens/payments_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/support/presentation/screens/support_chat_screen.dart';
import '../../features/taxi/presentation/cubit/taxi_order_cubit.dart';
import '../../features/taxi/presentation/screens/taxi_class_screen.dart';
import '../../features/taxi/presentation/screens/taxi_payment_screen.dart';
import 'home_route.dart';

GoRouter buildAppRouter(AppConfig config) {
  final initialLocation = homeRouteForRole(config.role);

  return GoRouter(
    initialLocation: SplashScreen.routePath,
    routes: [
      GoRoute(
        path: SplashScreen.routePath,
        builder: (context, state) =>
            SplashScreen(nextLocation: initialLocation),
      ),
      GoRoute(
        path: PhoneInputScreen.routePath,
        builder: (context, state) => const PhoneInputScreen(),
      ),
      GoRoute(
        path: OtpScreen.routePath,
        builder: (context, state) => OtpScreen(
          phoneNumber: state.uri.queryParameters['phone'] ?? '',
          initialDevCode: state.uri.queryParameters['devCode'],
        ),
      ),
      GoRoute(
        path: PassengerHomePlaceholderScreen.routePath,
        builder: (context, state) => const PassengerHomePlaceholderScreen(),
      ),
      GoRoute(
        path: ExecutorHomeScreen.routePath,
        builder: (context, state) => MultiBlocProvider(
          providers: [
            BlocProvider<ExecutorStatusCubit>.value(
              value: serviceLocator<ExecutorStatusCubit>(),
            ),
            BlocProvider<IncomingOrderCubit>.value(
              value: serviceLocator<IncomingOrderCubit>(),
            ),
          ],
          child: const ExecutorHomeScreen(),
        ),
      ),
      GoRoute(
        path: TaxiClassScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<TaxiOrderCubit>(),
          child: const TaxiClassScreen(),
        ),
      ),
      GoRoute(
        path: TaxiPaymentScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<TaxiOrderCubit>(),
          child: const TaxiPaymentScreen(),
        ),
      ),
      GoRoute(
        path: DeliveryAddressScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<DeliveryOrderCubit>(),
          child: const DeliveryAddressScreen(),
        ),
      ),
      GoRoute(
        path: DeliveryDetailsScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<DeliveryOrderCubit>(),
          child: const DeliveryDetailsScreen(),
        ),
      ),
      GoRoute(
        path: DeliveryVehicleScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<DeliveryOrderCubit>(),
          child: const DeliveryVehicleScreen(),
        ),
      ),
      GoRoute(
        path: DeliveryPaymentScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<DeliveryOrderCubit>(),
          child: const DeliveryPaymentScreen(),
        ),
      ),
      GoRoute(
        path: DeliveryConfirmScreen.routePath,
        builder: (context, state) => BlocProvider.value(
          value: serviceLocator<DeliveryOrderCubit>(),
          child: const DeliveryConfirmScreen(),
        ),
      ),
      GoRoute(
        path: OrderHistoryScreen.routePath,
        builder: (context, state) => BlocProvider<OrderHistoryCubit>(
          create: (_) => serviceLocator<OrderHistoryCubit>()..loadInitial(),
          child: const OrderHistoryScreen(),
        ),
      ),
      GoRoute(
        path: OrderDetailScreen.routePath,
        builder: (context, state) => OrderDetailScreen(
          order: state.extra is HistoryOrder
              ? state.extra! as HistoryOrder
              : HistoryOrder(
                  id: '',
                  serviceType: 'taxi',
                  status: 'completed',
                  fromTitle: '',
                  toTitle: '',
                  price: 0,
                  currency: 'KZT',
                  createdAt: DateTime.fromMillisecondsSinceEpoch(0),
                  distanceMeters: 0,
                  durationSeconds: 0,
                ),
        ),
      ),
      GoRoute(
        path: ProfileScreen.routePath,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: FavoritesScreen.routePath,
        builder: (context, state) => const FavoritesScreen(),
      ),
      GoRoute(
        path: PaymentsScreen.routePath,
        builder: (context, state) => const PaymentsScreen(),
      ),
      GoRoute(
        path: SupportChatScreen.routePath,
        builder: (context, state) => const SupportChatScreen(),
      ),
      GoRoute(
        path: LegalScreen.privacyRoutePath,
        builder: (context, state) =>
            const LegalScreen(type: LegalDocumentType.privacy),
      ),
      GoRoute(
        path: LegalScreen.termsRoutePath,
        builder: (context, state) =>
            const LegalScreen(type: LegalDocumentType.terms),
      ),
      GoRoute(
        path: OrderChatScreen.routePath,
        builder: (context, state) => OrderChatScreen(
          args: state.extra is OrderChatArgs
              ? state.extra! as OrderChatArgs
              : const OrderChatArgs(
                  orderId: '',
                  isExecutor: false,
                  isClosed: true,
                ),
        ),
      ),
      GoRoute(
        path: ActiveOrderScreen.routePath,
        builder: (context, state) {
          final session = state.extra;
          if (session is! ActiveOrderSession) {
            return const PassengerHomePlaceholderScreen();
          }

          return BlocProvider(
            create: (_) => ActiveOrderCubit(
              session: session,
              activeOrderRepository: serviceLocator<ActiveOrderRepository>(),
              positionInterpolator:
                  serviceLocator<ExecutorPositionInterpolator>(),
            )..startTracking(),
            child: const ActiveOrderScreen(),
          );
        },
      ),
      GoRoute(
        path: RatingScreen.routePath,
        builder: (context, state) => RatingScreen(
          orderId: state.extra is String ? state.extra! as String : '',
          activeOrderRepository: serviceLocator<ActiveOrderRepository>(),
        ),
      ),
      GoRoute(
        path: ExecutorActiveOrderScreen.routePath,
        builder: (context, state) => MultiBlocProvider(
          providers: [
            BlocProvider<ExecutorStatusCubit>.value(
              value: serviceLocator<ExecutorStatusCubit>(),
            ),
            BlocProvider<IncomingOrderCubit>.value(
              value: serviceLocator<IncomingOrderCubit>(),
            ),
          ],
          child: const ExecutorActiveOrderScreen(),
        ),
      ),
    ],
  );
}
