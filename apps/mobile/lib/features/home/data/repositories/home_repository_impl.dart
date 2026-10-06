import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/address_suggestion.dart';
import '../../domain/entities/nearby_executor.dart';
import '../../domain/repositories/home_repository.dart';
import '../datasources/geo_remote_data_source.dart';

class HomeRepositoryImpl implements HomeRepository {
  const HomeRepositoryImpl(this._geoRemoteDataSource);

  final GeoRemoteDataSource _geoRemoteDataSource;

  @override
  Future<Either<Failure, List<NearbyExecutor>>> fetchNearbyExecutors({
    required LatLng location,
    required String serviceType,
  }) async {
    try {
      final items = await _geoRemoteDataSource.fetchNearbyExecutors(
        lat: location.latitude,
        lng: location.longitude,
        serviceType: serviceType,
      );
      return right(items);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'HOME_NEARBY_EXECUTORS_FAILED',
          message: 'Не удалось загрузить ближайших исполнителей',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, List<AddressSuggestion>>> searchAddresses({
    required String query,
    String? cityId,
    LatLng? locationBias,
    double radiusKm = 20,
  }) async {
    try {
      final items = await _geoRemoteDataSource.searchAddresses(
        query: query,
        cityId: cityId,
        lat: locationBias?.latitude,
        lng: locationBias?.longitude,
        radiusKm: radiusKm,
      );
      return right(items);
    } on Failure catch (failure) {
      return left(failure);
    } catch (error) {
      return left(
        Failure(
          code: 'HOME_ADDRESS_SEARCH_FAILED',
          message: 'Не удалось найти адреса: $error',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, AddressSuggestion>> reverseGeocode({
    required LatLng location,
  }) async {
    try {
      final item = await _geoRemoteDataSource.reverseGeocode(
        lat: location.latitude,
        lng: location.longitude,
      );
      return right(item);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'HOME_REVERSE_GEOCODE_FAILED',
          message: 'Не удалось определить текущий адрес',
        ),
      );
    }
  }
}
