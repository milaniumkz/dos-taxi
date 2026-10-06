import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../../../../shared/map/order_route_map.dart';
import '../../domain/entities/taxi_route.dart';

class TaxiRouteMap extends StatelessWidget {
  const TaxiRouteMap({
    required this.pickup,
    required this.destination,
    required this.route,
    this.center,
    this.onTap,
    this.isLoading = false,
    super.key,
  });

  final LatLng? pickup;
  final LatLng? destination;
  final TaxiRoute? route;
  final LatLng? center;
  final ValueChanged<LatLng>? onTap;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return OrderRouteMap(
      pickup: pickup,
      destination: destination,
      routePoints: route?.polylinePoints ?? const [],
      center: center,
      onTap: onTap,
      isLoading: isLoading,
    );
  }
}
