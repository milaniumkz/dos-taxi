import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../domain/entities/nearby_executor.dart';

class MapWidget extends StatefulWidget {
  const MapWidget({
    required this.center,
    required this.recenterRequestId,
    required this.currentLocation,
    required this.nearbyExecutors,
    this.routePoints = const [],
    this.selectedLocation,
    this.pickupLocation,
    this.onTap,
    this.isLoading = false,
    super.key,
  });

  final LatLng center;
  final int recenterRequestId;
  final LatLng currentLocation;
  final List<NearbyExecutor> nearbyExecutors;
  final List<LatLng> routePoints;
  final LatLng? selectedLocation;
  final LatLng? pickupLocation;
  final ValueChanged<LatLng>? onTap;
  final bool isLoading;

  @override
  State<MapWidget> createState() => _MapWidgetState();
}

class _MapWidgetState extends State<MapWidget> {
  final MapController _mapController = MapController();

  @override
  void didUpdateWidget(covariant MapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    final centerChanged = !_isSamePoint(oldWidget.center, widget.center);
    final recenterRequested =
        oldWidget.recenterRequestId != widget.recenterRequestId;
    if (!centerChanged && !recenterRequested) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      final zoom = recenterRequested ? 16.0 : _mapController.camera.zoom;
      _mapController.move(widget.center, zoom);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: widget.center,
            initialZoom: 15,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
            onTap: widget.onTap == null
                ? null
                : (_, point) => widget.onTap!(point),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dos.dos_mobile',
            ),
            if (widget.routePoints.length > 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: widget.routePoints,
                    strokeWidth: 6,
                    color: AppColors.primaryDark,
                  ),
                  Polyline(
                    points: widget.routePoints,
                    strokeWidth: 3,
                    color: AppColors.primary,
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                Marker(
                  point: widget.currentLocation,
                  width: 58,
                  height: 58,
                  child: const _CurrentLocationMarker(),
                ),
                if (widget.selectedLocation != null)
                  Marker(
                    point: widget.selectedLocation!,
                    width: 52,
                    height: 52,
                    child: const _SelectedAddressMarker(),
                  ),
                if (widget.pickupLocation != null)
                  Marker(
                    point: widget.pickupLocation!,
                    width: 48,
                    height: 48,
                    child: const Icon(
                      Icons.trip_origin_rounded,
                      color: AppColors.primaryDark,
                      size: 36,
                    ),
                  ),
                ...widget.nearbyExecutors.map(
                  (executor) => Marker(
                    point: executor.location,
                    width: 48,
                    height: 48,
                    child: const _ExecutorMarker(),
                  ),
                ),
              ],
            ),
          ],
        ),
        const Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(color: Color(0x16FFFFFF)),
            ),
          ),
        ),
        const DosMapOverlay(),
        if (widget.isLoading)
          const Positioned.fill(
            child: IgnorePointer(
              child: Center(child: CircularProgressIndicator()),
            ),
          ),
      ],
    );
  }

  bool _isSamePoint(LatLng first, LatLng second) {
    return (first.latitude - second.latitude).abs() < 0.000001 &&
        (first.longitude - second.longitude).abs() < 0.000001;
  }
}

class DarkDriverMap extends StatelessWidget {
  const DarkDriverMap({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return child;
  }
}

class _CurrentLocationMarker extends StatelessWidget {
  const _CurrentLocationMarker();

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
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: const Icon(
        Icons.person_pin_circle_rounded,
        color: AppColors.text,
        size: 30,
      ),
    );
  }
}

class _ExecutorMarker extends StatelessWidget {
  const _ExecutorMarker();

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -0.55,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: const [
            BoxShadow(
              color: Color(0x33000000),
              blurRadius: 12,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: const Icon(
          Icons.local_taxi_rounded,
          color: AppColors.text,
          size: 25,
        ),
      ),
    );
  }
}

class _SelectedAddressMarker extends StatelessWidget {
  const _SelectedAddressMarker();

  @override
  Widget build(BuildContext context) {
    return const Icon(
      Icons.location_on_rounded,
      color: AppColors.primaryDark,
      size: 48,
    );
  }
}
