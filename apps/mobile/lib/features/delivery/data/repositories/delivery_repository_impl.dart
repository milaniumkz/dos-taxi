import 'dart:math';

import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/create_delivery_order_params.dart';
import '../../domain/entities/delivery_estimate.dart';
import '../../domain/entities/delivery_route_info.dart';
import '../../domain/repositories/delivery_repository.dart';
import '../../domain/usecases/estimate_delivery_use_case.dart';
import '../datasources/delivery_remote_data_source.dart';

class DeliveryRepositoryImpl implements DeliveryRepository {
  const DeliveryRepositoryImpl(this._remoteDataSource);

  final DeliveryRemoteDataSource _remoteDataSource;

  @override
  Future<Either<Failure, DeliveryRouteInfo>> buildRouteInfo({
    required AddressSuggestion fromAddress,
    required AddressSuggestion toAddress,
  }) async {
    try {
      final routeInfo = await _remoteDataSource.buildRouteInfo(
        fromAddress: fromAddress,
        toAddress: toAddress,
      );
      return right(routeInfo);
    } on Failure {
      return right(_fallbackRouteInfo(fromAddress, toAddress));
    } catch (_) {
      return right(_fallbackRouteInfo(fromAddress, toAddress));
    }
  }

  @override
  Future<Either<Failure, String>> createDeliveryOrder(
    CreateDeliveryOrderParams params,
  ) async {
    try {
      final orderId = await _remoteDataSource.createDeliveryOrder(
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        vehicleType: params.courierVehicleType,
        packageDescription: params.packageDescription,
        isFragile: params.isFragile,
        requiresReturn: params.requiresReturn,
        contactName: params.contactName,
        contactPhone: params.contactPhone,
        distanceMeters: params.distanceMeters,
        durationSeconds: params.durationSeconds,
        paymentMethod: params.paymentMethod,
        packagePhotoPath: params.packagePhotoPath,
        declaredValue: params.declaredValue,
        cashOnDelivery: params.cashOnDelivery,
        promoCode: params.promoCode,
      );
      if (orderId.isNotEmpty) {
        return right(orderId);
      }
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'DELIVERY_ORDER_CREATE_FAILED',
          message: 'Не удалось создать заказ доставки',
        ),
      );
    }

    return left(
      const Failure(
        code: 'DELIVERY_ORDER_CREATE_EMPTY_ID',
        message: 'Backend не вернул номер заказа доставки',
      ),
    );
  }

  @override
  Future<Either<Failure, List<DeliveryEstimate>>> estimateDelivery(
    EstimateDeliveryParams params,
  ) async {
    try {
      final estimates = await _remoteDataSource.estimateDelivery(
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        distanceMeters: params.distanceMeters,
        durationSeconds: params.durationSeconds,
        promoCode: params.promoCode,
        isFragile: params.isFragile,
        requiresReturn: params.requiresReturn,
        declaredValue: params.declaredValue,
        cashOnDelivery: params.cashOnDelivery,
      );
      return right(estimates);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'DELIVERY_ESTIMATE_FAILED',
          message: 'Не удалось рассчитать стоимость доставки',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, List<AddressSuggestion>>> searchAddresses({
    required String query,
    LatLng? locationBias,
    double radiusKm = 20,
  }) async {
    try {
      final items = await _remoteDataSource.searchAddresses(
        query: query,
        locationBias: locationBias,
        radiusKm: radiusKm,
      );
      return right(items);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'DELIVERY_ADDRESS_SEARCH_FAILED',
          message: 'Не удалось найти адреса доставки',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, AddressSuggestion>> reverseGeocode({
    required LatLng location,
  }) async {
    try {
      final item = await _remoteDataSource.reverseGeocode(location: location);
      return right(item);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'DELIVERY_REVERSE_GEOCODE_FAILED',
          message: 'Не удалось определить выбранную точку на карте',
        ),
      );
    }
  }

  DeliveryRouteInfo _fallbackRouteInfo(
    AddressSuggestion fromAddress,
    AddressSuggestion toAddress,
  ) {
    final distanceMeters = max(
      1,
      const Distance()
          .distance(fromAddress.location, toAddress.location)
          .round(),
    );
    final durationSeconds = max(420, (distanceMeters / 6.5).round());

    return DeliveryRouteInfo(
      distanceMeters: distanceMeters,
      durationSeconds: durationSeconds,
    );
  }
}
