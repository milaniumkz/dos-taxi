import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failure.dart';
import '../../../order_history/domain/repositories/order_history_repository.dart';
import '../../domain/entities/executor_active_order_session.dart';
import '../../domain/entities/executor_profile.dart';
import '../../domain/entities/incoming_executor_offer.dart';
import '../../domain/repositories/executor_repository.dart';
import '../datasources/executor_remote_data_source.dart';
import '../models/executor_profile_model.dart';

class ExecutorRepositoryImpl implements ExecutorRepository {
  const ExecutorRepositoryImpl({
    required ExecutorRemoteDataSource remoteDataSource,
    required AppConfig config,
  }) : _remoteDataSource = remoteDataSource,
       _config = config;

  final ExecutorRemoteDataSource _remoteDataSource;
  final AppConfig _config;

  bool get _allowsLocalFallback => _config.flavor != AppFlavor.prod;

  @override
  Future<Either<Failure, ExecutorProfile?>> fetchProfile() async {
    try {
      final profile = await _remoteDataSource.fetchProfile();
      return right(profile);
    } on Failure catch (failure) {
      if (_allowsLocalFallback && failure.code == 'NETWORK_UNAVAILABLE') {
        return right(null);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_PROFILE_FETCH_FAILED',
          message: 'Не удалось загрузить профиль исполнителя',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, ExecutorActiveOrderSession?>>
  fetchActiveOrder() async {
    try {
      final session = await _remoteDataSource.fetchActiveOrder();
      return right(session);
    } on Failure catch (failure) {
      if (failure.code == 'EXECUTOR_ACTIVE_ORDER_NOT_FOUND') {
        return right(null);
      }
      if (_allowsLocalFallback && failure.code == 'NETWORK_UNAVAILABLE') {
        return right(null);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_ACTIVE_ORDER_FETCH_FAILED',
          message: 'Не удалось загрузить активный заказ исполнителя',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, ExecutorProfile>> submitOnboarding({
    required String name,
    required String executorType,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
  }) async {
    try {
      final profile = await _remoteDataSource.submitOnboarding(
        name: name,
        executorType: executorType,
        vehicleType: vehicleType,
        vehicleMake: vehicleMake,
        vehicleModel: vehicleModel,
        vehicleYear: vehicleYear,
        vehicleColor: vehicleColor,
        vehiclePlate: vehiclePlate,
      );
      return right(profile);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(
          ExecutorProfileModel.synthetic(
            name: name,
            executorType: executorType,
            vehicleType: vehicleType,
            vehicleMake: vehicleMake,
            vehicleModel: vehicleModel,
            vehicleYear: vehicleYear,
            vehicleColor: vehicleColor,
            vehiclePlate: vehiclePlate,
          ),
        );
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_ONBOARDING_FAILED',
          message: 'Не удалось сохранить анкету исполнителя',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, ExecutorProfile>> updateVehicleSettings({
    required ExecutorProfile profile,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    required List<String> enabledTariffs,
  }) async {
    try {
      final updated = await _remoteDataSource.updateVehicleSettings(
        vehicleMake: vehicleMake,
        vehicleModel: vehicleModel,
        vehicleYear: vehicleYear,
        vehicleColor: vehicleColor,
        vehiclePlate: vehiclePlate,
        enabledTariffs: enabledTariffs,
      );
      return right(updated);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(
          profile.copyWith(
            vehicleMake: vehicleMake,
            vehicleModel: vehicleModel,
            vehicleYear: vehicleYear,
            vehicleColor: vehicleColor,
            vehiclePlate: vehiclePlate,
            enabledTariffs: enabledTariffs,
          ),
        );
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_VEHICLE_UPDATE_FAILED',
          message: 'Не удалось сохранить автомобиль',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, ExecutorProfile>> updateDriverProfile({
    required ExecutorProfile profile,
    required String name,
  }) async {
    try {
      final updated = await _remoteDataSource.updateDriverProfile(name: name);
      return right(updated);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(
          profile.copyWith(name: name, verificationStatus: 'pending'),
        );
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_PROFILE_UPDATE_FAILED',
          message: 'Не удалось сохранить данные водителя',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, ExecutorProfile>> updateOnlineStatus({
    required ExecutorProfile profile,
    required bool isOnline,
    required LatLng location,
    double? heading,
  }) async {
    try {
      final updated = await _remoteDataSource.updateOnlineStatus(
        isOnline: isOnline,
        location: location,
        heading: heading,
      );
      return right(updated);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(profile.copyWith(isOnline: isOnline));
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_STATUS_UPDATE_FAILED',
          message: 'Не удалось обновить статус исполнителя',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, Unit>> requestBalanceTopUp({
    required double amount,
    required String phone,
  }) async {
    try {
      await _remoteDataSource.requestBalanceTopUp(amount: amount, phone: phone);
      return right(unit);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(unit);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_BALANCE_TOP_UP_FAILED',
          message: 'Не удалось отправить заявку на пополнение',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, OrderHistoryPage>> fetchOrderHistory({
    required int limit,
    String? cursor,
  }) async {
    try {
      final page = await _remoteDataSource.fetchOrderHistory(
        limit: limit,
        cursor: cursor,
      );
      return right(page);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_HISTORY_FETCH_FAILED',
          message: 'Не удалось загрузить историю заказов',
        ),
      );
    }
  }

  @override
  Stream<IncomingExecutorOffer> watchIncomingOrders({
    required ExecutorProfile profile,
  }) {
    return _remoteDataSource.watchIncomingOrders(profile: profile);
  }

  @override
  Future<Either<Failure, Unit>> acceptIncomingOrder(String orderId) async {
    try {
      await _remoteDataSource.acceptIncomingOrder(orderId);
      return right(unit);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(unit);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_ACCEPT_ORDER_FAILED',
          message: 'Не удалось принять входящий заказ',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, Unit>> rejectIncomingOrder(String orderId) async {
    try {
      await _remoteDataSource.rejectIncomingOrder(orderId);
      return right(unit);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(unit);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_REJECT_ORDER_FAILED',
          message: 'Не удалось отклонить входящий заказ',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, Unit>> syncActiveOrderStatus({
    required ExecutorActiveOrderSession session,
    required String nextStatus,
    String? proofPhotoPath,
    String? recipientCode,
    String? failureReason,
    LatLng? location,
    int? actualDistanceMeters,
  }) async {
    try {
      await _remoteDataSource.syncActiveOrderStatus(
        orderId: session.orderId,
        serviceType: session.serviceType,
        nextStatus: nextStatus,
        proofPhotoPath: proofPhotoPath,
        recipientCode: recipientCode,
        failureReason: failureReason,
        location: location,
        actualDistanceMeters: actualDistanceMeters,
      );
      return right(unit);
    } on Failure catch (failure) {
      if (_allowsLocalFallback) {
        return right(unit);
      }
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'EXECUTOR_ACTIVE_ORDER_UPDATE_FAILED',
          message: 'Не удалось обновить активный заказ',
        ),
      );
    }
  }
}
