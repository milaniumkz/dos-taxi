import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../domain/entities/active_order_session.dart';

class ActiveOrderMap extends StatelessWidget {
  const ActiveOrderMap({
    required this.session,
    required this.executorLocation,
    super.key,
  });

  final ActiveOrderSession session;
  final LatLng? executorLocation;

  @override
  Widget build(BuildContext context) {
    final rideRoutePoints = session.routePoints.length >= 2
        ? session.routePoints
        : [session.fromAddress.location, session.toAddress.location];
    final pickupRoutePoints = executorLocation == null
        ? const <LatLng>[]
        : [executorLocation!, session.fromAddress.location];
    final center =
        executorLocation ??
        (session.routePoints.isNotEmpty
            ? session.routePoints.first
            : session.fromAddress.location);

    return Stack(
      children: [
        FlutterMap(
          options: MapOptions(initialCenter: center, initialZoom: 13),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dos.dos_mobile',
            ),
            if (rideRoutePoints.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: rideRoutePoints,
                    strokeWidth: 5,
                    color: AppColors.primaryDark,
                  ),
                  Polyline(
                    points: rideRoutePoints,
                    strokeWidth: 3,
                    color: AppColors.primary,
                  ),
                  if (pickupRoutePoints.length >= 2)
                    Polyline(
                      points: pickupRoutePoints,
                      strokeWidth: 4,
                      color: AppColors.text.withValues(alpha: 0.62),
                    ),
                ],
              ),
            MarkerLayer(
              markers: [
                Marker(
                  point: session.fromAddress.location,
                  width: 50,
                  height: 50,
                  child: const _OrderMarker(
                    icon: Icons.trip_origin_rounded,
                    color: AppColors.success,
                  ),
                ),
                Marker(
                  point: session.toAddress.location,
                  width: 54,
                  height: 54,
                  child: const _OrderMarker(
                    icon: Icons.location_on_rounded,
                    color: AppColors.primaryDark,
                  ),
                ),
                if (executorLocation != null)
                  Marker(
                    point: executorLocation!,
                    width: 58,
                    height: 58,
                    child: const _ExecutorMarker(),
                  ),
              ],
            ),
          ],
        ),
        const DosMapOverlay(),
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(color: Color(0x0EFFFFFF)),
            ),
          ),
        ),
      ],
    );
  }
}

class _OrderMarker extends StatelessWidget {
  const _OrderMarker({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 14,
            offset: Offset(0, 7),
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white),
    );
  }
}

class _ExecutorMarker extends StatelessWidget {
  const _ExecutorMarker();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.primary,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 4),
        boxShadow: const [
          BoxShadow(
            color: Color(0x44000000),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(
        Icons.local_taxi_rounded,
        color: AppColors.text,
        size: 28,
      ),
    );
  }
}
