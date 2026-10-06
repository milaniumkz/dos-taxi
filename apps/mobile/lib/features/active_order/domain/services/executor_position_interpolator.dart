import 'package:latlong2/latlong.dart';

class ExecutorPositionInterpolator {
  const ExecutorPositionInterpolator({this.steps = 6});

  final int steps;

  List<LatLng> interpolate(LatLng from, LatLng to, {int? steps}) {
    final segmentCount = (steps ?? this.steps).clamp(1, 100);
    return [
      for (var index = 0; index <= segmentCount; index += 1)
        LatLng(
          from.latitude +
              (to.latitude - from.latitude) * (index / segmentCount),
          from.longitude +
              (to.longitude - from.longitude) * (index / segmentCount),
        ),
    ];
  }
}
