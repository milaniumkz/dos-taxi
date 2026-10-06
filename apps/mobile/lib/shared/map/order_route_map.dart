import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../core/theme/app_colors.dart';
import '../widgets/dos_ui.dart';

class OrderRouteMap extends StatelessWidget {
  const OrderRouteMap({
    required this.pickup,
    required this.destination,
    this.routePoints = const [],
    this.center,
    this.onTap,
    this.isLoading = false,
    super.key,
  });

  final LatLng? pickup;
  final LatLng? destination;
  final List<LatLng> routePoints;
  final LatLng? center;
  final ValueChanged<LatLng>? onTap;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final firstRoutePoint = routePoints.isNotEmpty ? routePoints.first : null;
    final mapCenter =
        center ??
        pickup ??
        destination ??
        firstRoutePoint ??
        const LatLng(43.238949, 76.889709);

    return Stack(
      children: [
        FlutterMap(
          key: ValueKey(
            '${mapCenter.latitude},${mapCenter.longitude},'
            '${pickup?.latitude},${pickup?.longitude},'
            '${destination?.latitude},${destination?.longitude}',
          ),
          options: MapOptions(
            initialCenter: mapCenter,
            initialZoom: routePoints.length >= 2 ? 13.6 : 16,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
            onTap: onTap == null
                ? null
                : (_, point) {
                    onTap!(point);
                  },
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dos.dos_mobile',
            ),
            if (routePoints.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePoints,
                    strokeWidth: 6,
                    color: AppColors.primaryDark,
                  ),
                  Polyline(
                    points: routePoints,
                    strokeWidth: 3,
                    color: AppColors.primary,
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                if (pickup != null)
                  Marker(
                    point: pickup!,
                    width: 48,
                    height: 48,
                    child: const _RouteMarker(
                      icon: Icons.trip_origin_rounded,
                      color: AppColors.success,
                    ),
                  ),
                if (destination != null)
                  Marker(
                    point: destination!,
                    width: 48,
                    height: 48,
                    child: const _RouteMarker(
                      icon: Icons.location_on_rounded,
                      color: AppColors.primaryDark,
                    ),
                  ),
              ],
            ),
          ],
        ),
        const DosMapOverlay(),
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(color: Color(0x10FFFFFF)),
            ),
          ),
        ),
        if (isLoading)
          const Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(color: Color(0x33000000)),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
      ],
    );
  }
}

class _RouteMarker extends StatelessWidget {
  const _RouteMarker({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 12,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white),
    );
  }
}
