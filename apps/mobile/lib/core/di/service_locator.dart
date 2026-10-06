import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';

import '../../features/active_order/data/datasources/active_order_remote_data_source.dart';
import '../../features/active_order/data/repositories/active_order_repository_impl.dart';
import '../../features/active_order/domain/repositories/active_order_repository.dart';
import '../../features/active_order/domain/services/executor_position_interpolator.dart';
import '../../features/auth/data/datasources/auth_local_data_source.dart';
import '../../features/auth/data/datasources/auth_remote_data_source.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/send_otp_use_case.dart';
import '../../features/auth/domain/usecases/verify_otp_use_case.dart';
import '../../features/auth/presentation/cubit/auth_cubit.dart';
import '../../features/delivery/data/datasources/delivery_remote_data_source.dart';
import '../../features/delivery/data/repositories/delivery_repository_impl.dart';
import '../../features/delivery/domain/repositories/delivery_repository.dart';
import '../../features/delivery/domain/usecases/create_delivery_order_use_case.dart';
import '../../features/delivery/domain/usecases/estimate_delivery_use_case.dart';
import '../../features/delivery/domain/usecases/validate_delivery_details_use_case.dart';
import '../../features/delivery/presentation/cubit/delivery_order_cubit.dart';
import '../../features/executor/data/datasources/executor_remote_data_source.dart';
import '../../features/executor/data/repositories/executor_repository_impl.dart';
import '../../features/executor/domain/repositories/executor_repository.dart';
import '../../features/executor/presentation/cubit/executor_status_cubit.dart';
import '../../features/executor/presentation/cubit/incoming_order_cubit.dart';
import '../../features/home/data/datasources/geo_remote_data_source.dart';
import '../../features/home/data/repositories/home_repository_impl.dart';
import '../../features/home/domain/repositories/home_repository.dart';
import '../../features/home/presentation/cubit/home_cubit.dart';
import '../../features/order_history/data/datasources/order_history_remote_data_source.dart';
import '../../features/order_history/data/repositories/order_history_repository_impl.dart';
import '../../features/order_history/domain/repositories/order_history_repository.dart';
import '../../features/order_history/presentation/cubit/order_history_cubit.dart';
import '../../features/profile/presentation/cubit/profile_settings_cubit.dart';
import '../../features/taxi/data/datasources/taxi_remote_data_source.dart';
import '../../features/taxi/data/repositories/taxi_repository_impl.dart';
import '../../features/taxi/domain/repositories/taxi_repository.dart';
import '../../features/taxi/domain/usecases/create_taxi_order_use_case.dart';
import '../../features/taxi/domain/usecases/estimate_taxi_use_case.dart';
import '../../features/taxi/presentation/cubit/taxi_order_cubit.dart';
import '../api/api_client.dart';
import '../auth/auth_session_events.dart';
import '../config/app_config.dart';
import '../location/location_service.dart';
import '../notifications/app_notification_service.dart';
import '../storage/token_storage.dart';

final GetIt serviceLocator = GetIt.instance;

Future<void> configureDependencies(AppConfig config) async {
  if (serviceLocator.isRegistered<AppConfig>()) {
    await serviceLocator.reset();
  }

  serviceLocator.registerSingleton<AppConfig>(config);

  const secureStorage = FlutterSecureStorage();
  final tokenStorage = TokenStorage(
    secureStorage,
    namespace: 'dos.${config.role.name}',
  );

  serviceLocator.registerSingleton<TokenStorage>(tokenStorage);
  serviceLocator.registerSingleton<AuthSessionEvents>(AuthSessionEvents());
  final notificationService = AppNotificationService();
  await notificationService.initialize();
  serviceLocator.registerSingleton<AppNotificationService>(notificationService);
  serviceLocator.registerLazySingleton<ApiClient>(
    () => ApiClient.create(
      config: config,
      tokenStorage: tokenStorage,
      onRefreshToken: () async {
        final refreshToken = await tokenStorage.readRefreshToken();
        if (refreshToken == null || refreshToken.isEmpty) {
          return null;
        }

        final response = await Dio(BaseOptions(baseUrl: config.apiBaseUrl))
            .post<Map<String, dynamic>>(
              '/auth/refresh',
              data: {'refreshToken': refreshToken},
            );

        final responseData = response.data ?? <String, dynamic>{};
        final accessToken =
            responseData['accessToken'] as String? ??
            responseData['access_token'] as String? ??
            '';
        final nextRefreshToken =
            responseData['refreshToken'] as String? ??
            responseData['refresh_token'] as String? ??
            refreshToken;

        if (accessToken.isEmpty) {
          return null;
        }

        await tokenStorage.writeTokens(
          accessToken: accessToken,
          refreshToken: nextRefreshToken,
        );
        return accessToken;
      },
      authSessionEvents: serviceLocator<AuthSessionEvents>(),
    ),
  );
  serviceLocator.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSource(tokenStorage),
  );
  serviceLocator.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSource(
      apiClient: serviceLocator<ApiClient>(),
      appConfig: config,
      notificationService: serviceLocator<AppNotificationService>(),
    ),
  );
  serviceLocator.registerLazySingleton<IAuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: serviceLocator<AuthRemoteDataSource>(),
      localDataSource: serviceLocator<AuthLocalDataSource>(),
    ),
  );
  serviceLocator.registerLazySingleton<SendOtpUseCase>(
    () => SendOtpUseCase(serviceLocator<IAuthRepository>()),
  );
  serviceLocator.registerLazySingleton<VerifyOtpUseCase>(
    () => VerifyOtpUseCase(serviceLocator<IAuthRepository>()),
  );
  serviceLocator.registerFactory<AuthCubit>(
    () => AuthCubit(
      sendOtpUseCase: serviceLocator<SendOtpUseCase>(),
      verifyOtpUseCase: serviceLocator<VerifyOtpUseCase>(),
      authRepository: serviceLocator<IAuthRepository>(),
    ),
  );
  serviceLocator.registerLazySingleton<GeoRemoteDataSource>(
    () => GeoRemoteDataSource(serviceLocator<ApiClient>()),
  );
  serviceLocator.registerLazySingleton<ActiveOrderRemoteDataSource>(
    () => ActiveOrderRemoteDataSource(
      apiClient: serviceLocator<ApiClient>(),
      config: config,
    ),
  );
  serviceLocator.registerLazySingleton<ActiveOrderRepository>(
    () => ActiveOrderRepositoryImpl(
      serviceLocator<ActiveOrderRemoteDataSource>(),
    ),
  );
  serviceLocator.registerLazySingleton<ExecutorPositionInterpolator>(
    ExecutorPositionInterpolator.new,
  );
  serviceLocator.registerLazySingleton<LocationService>(
    () => LocationService(),
  );
  serviceLocator.registerLazySingleton<HomeRepository>(
    () => HomeRepositoryImpl(serviceLocator<GeoRemoteDataSource>()),
  );
  serviceLocator.registerFactory<HomeCubit>(
    () => HomeCubit(
      serviceLocator<HomeRepository>(),
      serviceLocator<ActiveOrderRepository>(),
      serviceLocator<LocationService>(),
      serviceLocator<TaxiRepository>(),
    ),
  );
  final profileSettingsCubit = ProfileSettingsCubit(
    serviceLocator<IAuthRepository>(),
    serviceLocator<TokenStorage>(),
  );
  await profileSettingsCubit.loadLocalSettings();
  serviceLocator.registerSingleton<ProfileSettingsCubit>(profileSettingsCubit);
  serviceLocator.registerLazySingleton<OrderHistoryRemoteDataSource>(
    () => OrderHistoryRemoteDataSource(serviceLocator<ApiClient>()),
  );
  serviceLocator.registerLazySingleton<OrderHistoryRepository>(
    () => OrderHistoryRepositoryImpl(
      serviceLocator<OrderHistoryRemoteDataSource>(),
    ),
  );
  serviceLocator.registerFactory<OrderHistoryCubit>(
    () => OrderHistoryCubit(serviceLocator<OrderHistoryRepository>()),
  );
  serviceLocator.registerLazySingleton<TaxiRemoteDataSource>(
    () => TaxiRemoteDataSource(serviceLocator<ApiClient>()),
  );
  serviceLocator.registerLazySingleton<TaxiRepository>(
    () => TaxiRepositoryImpl(serviceLocator<TaxiRemoteDataSource>()),
  );
  serviceLocator.registerLazySingleton<EstimateTaxiUseCase>(
    () => EstimateTaxiUseCase(serviceLocator<TaxiRepository>()),
  );
  serviceLocator.registerLazySingleton<CreateTaxiOrderUseCase>(
    () => CreateTaxiOrderUseCase(serviceLocator<TaxiRepository>()),
  );
  serviceLocator.registerSingleton<TaxiOrderCubit>(
    TaxiOrderCubit(
      taxiRepository: serviceLocator<TaxiRepository>(),
      estimateTaxiUseCase: serviceLocator<EstimateTaxiUseCase>(),
      createTaxiOrderUseCase: serviceLocator<CreateTaxiOrderUseCase>(),
    ),
  );
  serviceLocator.registerLazySingleton<DeliveryRemoteDataSource>(
    () => DeliveryRemoteDataSource(serviceLocator<ApiClient>()),
  );
  serviceLocator.registerLazySingleton<DeliveryRepository>(
    () => DeliveryRepositoryImpl(serviceLocator<DeliveryRemoteDataSource>()),
  );
  serviceLocator.registerLazySingleton<EstimateDeliveryUseCase>(
    () => EstimateDeliveryUseCase(serviceLocator<DeliveryRepository>()),
  );
  serviceLocator.registerLazySingleton<CreateDeliveryOrderUseCase>(
    () => CreateDeliveryOrderUseCase(serviceLocator<DeliveryRepository>()),
  );
  serviceLocator.registerLazySingleton<ValidateDeliveryDetailsUseCase>(
    ValidateDeliveryDetailsUseCase.new,
  );
  serviceLocator.registerSingleton<DeliveryOrderCubit>(
    DeliveryOrderCubit(
      deliveryRepository: serviceLocator<DeliveryRepository>(),
      estimateDeliveryUseCase: serviceLocator<EstimateDeliveryUseCase>(),
      createDeliveryOrderUseCase: serviceLocator<CreateDeliveryOrderUseCase>(),
      validateDeliveryDetailsUseCase:
          serviceLocator<ValidateDeliveryDetailsUseCase>(),
    ),
  );
  serviceLocator.registerLazySingleton<ExecutorRemoteDataSource>(
    () => ExecutorRemoteDataSource(
      apiClient: serviceLocator<ApiClient>(),
      config: config,
      tokenStorage: serviceLocator<TokenStorage>(),
    ),
  );
  serviceLocator.registerLazySingleton<ExecutorRepository>(
    () => ExecutorRepositoryImpl(
      remoteDataSource: serviceLocator<ExecutorRemoteDataSource>(),
      config: config,
    ),
  );
  serviceLocator.registerSingleton<ExecutorStatusCubit>(
    ExecutorStatusCubit(
      executorRepository: serviceLocator<ExecutorRepository>(),
      config: config,
      locationService: serviceLocator<LocationService>(),
    ),
  );
  serviceLocator.registerSingleton<IncomingOrderCubit>(
    IncomingOrderCubit(
      executorRepository: serviceLocator<ExecutorRepository>(),
      notificationService: serviceLocator<AppNotificationService>(),
    ),
  );
}
