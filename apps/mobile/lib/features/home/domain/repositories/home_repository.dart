import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../entities/address_suggestion.dart';
import '../entities/nearby_executor.dart';

abstract class HomeRepository {
  Future<Either<Failure, List<AddressSuggestion>>> searchAddresses({
    required String query,
    String? cityId,
    LatLng? locationBias,
    double radiusKm = 20,
  });

  Future<Either<Failure, AddressSuggestion>> reverseGeocode({
    required LatLng location,
  });

  Future<Either<Failure, List<NearbyExecutor>>> fetchNearbyExecutors({
    required LatLng location,
    required String serviceType,
  });
}
