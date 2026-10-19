import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../domain/entities/active_order_session.dart';
import '../../domain/entities/active_order_service_type.dart';

class ActiveOrderMap extends StatefulWidget {
  const ActiveOrderMap({
    required this.session,
    required this.executorLocation,
    this.bottomFraction = 0.32,
    super.key,
  });

  final ActiveOrderSession session;
  final LatLng? executorLocation;

  final double bottomFraction;

  @override
  State<ActiveOrderMap> createState() => _ActiveOrderMapState();
}

class _ActiveOrderMapState extends State<ActiveOrderMap> {
  final MapController _controller = MapController();
  bool _ready = false;
  Size _size = Size.zero;

  void _follow() {
    if (!_ready) return;
    final center = widget.executorLocation ?? widget.session.fromAddress.location;
    _controller.move(center, _controller.camera.zoom,
      offset: Offset(0, -_size.height * widget.bottomFraction / 2 + 35));
  }

  @override
  void didUpdateWidget(covariant ActiveOrderMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _follow(); });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final executorLocation = widget.executorLocation;
    final center = executorLocation ?? session.fromAddress.location;
    return LayoutBuilder(builder: (context, constraints) {
      final size = constraints.biggest;
      if (size != _size) {
        _size = size;
        WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _follow(); });
      }
      return Stack(
      children: [
        FlutterMap(
          mapController: _controller,
          options: MapOptions(initialCenter: center, initialZoom: 16,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.pinchZoom | InteractiveFlag.doubleTapZoom | InteractiveFlag.scrollWheelZoom),
            onPositionChanged: (_, gesture) {
              if (gesture) WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _follow(); });
            },
            onMapReady: () { _ready = true; _follow(); }),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.dos.dos_mobile',
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
                    child: _ExecutorMarker(icon: session.serviceType == ActiveOrderServiceType.delivery
                      ? Icons.local_shipping_rounded : Icons.local_taxi_rounded),
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
    });
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
  const _ExecutorMarker({required this.icon});

  final IconData icon;

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
      child: Icon(
        icon,
        color: AppColors.text,
        size: 28,
      ),
    );
  }
}
