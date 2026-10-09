import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../home/presentation/widgets/map_widget.dart';

class ExecutorHeatMap extends StatefulWidget {
  const ExecutorHeatMap({
    required this.currentLocation,
    this.recenterRequestId = 0,
    this.viewportOcclusion = EdgeInsets.zero,
    super.key,
  });

  final EdgeInsets viewportOcclusion;
  final LatLng currentLocation;
  final int recenterRequestId;

  @override
  State<ExecutorHeatMap> createState() => _ExecutorHeatMapState();
}

class _ExecutorHeatMapState extends State<ExecutorHeatMap> {
  final _mapController = MapController();

  @override
  void didUpdateWidget(covariant ExecutorHeatMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_isSamePoint(oldWidget.currentLocation, widget.currentLocation) &&
        oldWidget.recenterRequestId == widget.recenterRequestId &&
        oldWidget.viewportOcclusion == widget.viewportOcclusion) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _recenter();
    });
  }

  void _recenter() {
    final padding = widget.viewportOcclusion;
    _mapController.move(
      widget.currentLocation,
      _mapController.camera.zoom,
      offset: Offset(
        (padding.left - padding.right) / 2,
        (padding.top - padding.bottom) / 2,
      ),
    );
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: DarkDriverMap(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                onMapReady: _recenter,
                initialCenter: widget.currentLocation,
                initialZoom: 15,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.dos.dos_mobile',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: widget.currentLocation,
                      width: 56,
                      height: 56,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.darkText,
                            width: 3,
                          ),
                        ),
                        child: const Icon(
                          Icons.navigation_rounded,
                          color: AppColors.text,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  bool _isSamePoint(LatLng a, LatLng b) {
    return (a.latitude - b.latitude).abs() < 0.000001 &&
        (a.longitude - b.longitude).abs() < 0.000001;
  }
}
