import 'package:dos_mobile/features/active_order/domain/services/executor_position_interpolator.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  test('interpolates intermediate executor positions', () {
    const interpolator = ExecutorPositionInterpolator(steps: 4);

    final points = interpolator.interpolate(
      const LatLng(43.238949, 76.889709),
      const LatLng(43.242949, 76.893709),
    );

    expect(points, hasLength(5));
    expect(points.first.latitude, closeTo(43.238949, 0.000001));
    expect(points[2].latitude, closeTo(43.240949, 0.000001));
    expect(points.last.longitude, closeTo(76.893709, 0.000001));
  });
}
