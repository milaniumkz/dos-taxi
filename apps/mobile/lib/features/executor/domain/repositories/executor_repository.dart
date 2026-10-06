import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../order_history/domain/repositories/order_history_repository.dart';
import '../entities/executor_active_order_session.dart';
import '../entities/executor_profile.dart';
import '../entities/driver_bonus_progress.dart';
import '../entities/incoming_executor_offer.dart';

abstract class ExecutorRepository {
  Future<Either<Failure, DriverBonusProgress>> fetchBonusProgress();

  Future<Either<Failure, ExecutorProfile?>> fetchProfile();

  Future<Either<Failure, ExecutorActiveOrderSession?>> fetchActiveOrder();

  Future<Either<Failure, ExecutorProfile>> submitOnboarding({
    required String name,
    required String executorType,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
  });

  Future<Either<Failure, ExecutorProfile>> updateVehicleSettings({
    required ExecutorProfile profile,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    required List<String> enabledTariffs,
  });

  Future<Either<Failure, ExecutorProfile>> updateDriverProfile({
    required ExecutorProfile profile,
    required String name,
  });

  Future<Either<Failure, ExecutorProfile>> updateOnlineStatus({
    required ExecutorProfile profile,
    required bool isOnline,
    required LatLng location,
    double? heading,
  });

  Future<Either<Failure, Unit>> requestBalanceTopUp({
    required double amount,
    required String phone,
  });

  Future<Either<Failure, OrderHistoryPage>> fetchOrderHistory({
    required int limit,
    String? cursor,
  });

  Stream<IncomingExecutorOffer> watchIncomingOrders({
    required ExecutorProfile profile,
  });

  Future<Either<Failure, Unit>> acceptIncomingOrder(String orderId);

  Future<Either<Failure, Unit>> rejectIncomingOrder(String orderId);

  Future<Either<Failure, Unit>> syncActiveOrderStatus({
    required ExecutorActiveOrderSession session,
    required String nextStatus,
    String? proofPhotoPath,
    String? recipientCode,
    String? failureReason,
    LatLng? location,
    int? actualDistanceMeters,
  });
}
