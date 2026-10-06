import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../entities/create_taxi_order_params.dart';
import '../entities/taxi_estimate.dart';
import '../entities/taxi_route.dart';
import '../usecases/estimate_taxi_use_case.dart';

abstract interface class TaxiRepository {
  Future<Either<Failure, List<AddressSuggestion>>> searchAddresses({
    required String query,
    LatLng? locationBias,
    double radiusKm = 20,
  });

  Future<Either<Failure, AddressSuggestion>> reverseGeocode({
    required LatLng location,
  });

  Future<Either<Failure, TaxiRoute>> buildRoute({
    required AddressSuggestion pickup,
    required AddressSuggestion destination,
  });

  Future<Either<Failure, List<TaxiEstimate>>> estimateTaxi(
    EstimateTaxiParams params,
  );

  Future<Either<Failure, String>> createTaxiOrder(CreateTaxiOrderParams params);
}
