import 'dart:math';

import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/create_taxi_order_params.dart';
import '../../domain/entities/taxi_estimate.dart';
import '../../domain/entities/taxi_route.dart';
import '../../domain/repositories/taxi_repository.dart';
import '../../domain/usecases/estimate_taxi_use_case.dart';
import '../datasources/taxi_remote_data_source.dart';

class TaxiRepositoryImpl implements TaxiRepository {
  const TaxiRepositoryImpl(this._remoteDataSource);

  final TaxiRemoteDataSource _remoteDataSource;

  @override
  Future<Either<Failure, TaxiRoute>> buildRoute({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
  }) async {
    try {
      final route = await _remoteDataSource.buildRoute(
        pickup: pickup,
        destination: destination,
      );
      return right(route);
    } on Failure {
      return right(_fallbackRoute(pickup: pickup, destination: destination));
    } catch (_) {
      return right(_fallbackRoute(pickup: pickup, destination: destination));
    }
  }

  @override
  Future<Either<Failure, String>> createTaxiOrder(
    CreateTaxiOrderParams params,
  ) async {
    try {
      final orderId = await _remoteDataSource.createTaxiOrder(
        pickup: params.pickup,
        destination: params.destination,
        carClass: params.carClass,
        paymentMethod: params.paymentMethod,
        distanceMeters: params.distanceMeters,
        durationSeconds: params.durationSeconds,
        serviceType: params.serviceType,
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
          code: 'TAXI_ORDER_CREATE_FAILED',
          message: 'Не удалось создать заказ такси',
        ),
      );
    }

    return left(
      const Failure(
        code: 'TAXI_ORDER_CREATE_EMPTY_ID',
        message: 'Backend не вернул номер заказа такси',
      ),
    );
  }

  @override
  Future<Either<Failure, List<TaxiEstimate>>> estimateTaxi(
    EstimateTaxiParams params,
  ) async {
    try {
      final estimates = await _remoteDataSource.estimateTaxi(
        pickup: params.pickup,
        destination: params.destination,
        distanceMeters: params.distanceMeters,
        durationSeconds: params.durationSeconds,
        promoCode: params.promoCode,
        serviceType: params.serviceType,
      );
      return right(estimates);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'TAXI_ESTIMATE_FAILED',
          message: 'Не удалось рассчитать стоимость такси',
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
          code: 'TAXI_ADDRESS_SEARCH_FAILED',
          message: 'Не удалось найти адреса такси',
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
          code: 'TAXI_REVERSE_GEOCODE_FAILED',
          message: 'Не удалось определить выбранную точку на карте',
        ),
      );
    }
  }

  TaxiRoute _fallbackRoute({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
  }) {
    final distanceMeters = max(
      1,
      const Distance().distance(pickup.location, destination.location).round(),
    );
    final durationSeconds = max(300, (distanceMeters / 8.5).round());

    return TaxiRoute(
      polylinePoints: [pickup.location, destination.location],
      distanceMeters: distanceMeters,
      durationSeconds: durationSeconds,
    );
  }
}
