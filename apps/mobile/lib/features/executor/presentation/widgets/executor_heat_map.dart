import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../home/presentation/widgets/map_widget.dart';

class ExecutorHeatMap extends StatefulWidget {
  const ExecutorHeatMap({
    required this.currentLocation,
    this.onLocatePressed,
    super.key,
  });

  final LatLng currentLocation;
  final VoidCallback? onLocatePressed;

  @override
  State<ExecutorHeatMap> createState() => _ExecutorHeatMapState();
}

class _ExecutorHeatMapState extends State<ExecutorHeatMap> {
  final _mapController = MapController();

  @override
  void didUpdateWidget(covariant ExecutorHeatMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_isSamePoint(oldWidget.currentLocation, widget.currentLocation)) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _mapController.move(widget.currentLocation, _mapController.camera.zoom);
    });
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
        Positioned(
          right: 18,
          bottom: 190,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: widget.onLocatePressed,
              child: Ink(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0x22FFFFFF)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x55000000),
                      blurRadius: 18,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.my_location_rounded,
                  color: AppColors.primary,
                ),
              ),
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
