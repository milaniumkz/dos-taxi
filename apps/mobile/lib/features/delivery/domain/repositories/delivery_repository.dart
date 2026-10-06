import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../entities/create_delivery_order_params.dart';
import '../entities/delivery_estimate.dart';
import '../entities/delivery_route_info.dart';
import '../usecases/estimate_delivery_use_case.dart';

abstract interface class DeliveryRepository {
  Future<Either<Failure, List<AddressSuggestion>>> searchAddresses({
    required String query,
    LatLng? locationBias,
    double radiusKm = 20,
  });

  Future<Either<Failure, AddressSuggestion>> reverseGeocode({
    required LatLng location,
  });

  Future<Either<Failure, DeliveryRouteInfo>> buildRouteInfo({
    required AddressSuggestion fromAddress,
    required AddressSuggestion toAddress,
  });

  Future<Either<Failure, List<DeliveryEstimate>>> estimateDelivery(
    EstimateDeliveryParams params,
  );

  Future<Either<Failure, String>> createDeliveryOrder(
    CreateDeliveryOrderParams params,
  );
}
