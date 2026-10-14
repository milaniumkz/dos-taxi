import 'dart:math' as math;
import 'package:latlong2/latlong.dart';

class NavigationManeuver {
  const NavigationManeuver({
    required this.point,
    required this.type,
    required this.modifier,
    required this.distance,
    required this.roadName,
    this.exit,
  });
  final LatLng point;
  final String type, modifier, roadName;
  final double distance;
  final int? exit;
}

class RoadRoute {
  RoadRoute({
    required this.points,
    required this.maneuvers,
    required this.distance,
    required this.duration,
  });
  final List<LatLng> points;
  final List<NavigationManeuver> maneuvers;
  final double distance, duration;
  late final List<double> cumulative = _cumulative(points);
  static List<double> _cumulative(List<LatLng> points) {
    final result = <double>[0];
    for (var i = 1; i < points.length; i++) {
      result.add(
        result.last +
            const Distance().as(LengthUnit.Meter, points[i - 1], points[i]),
      );
    }
    return result;
  }

  RouteProjection project(
    LatLng p, {
    double progress = 0,
    bool initial = false,
  }) {
    var best = const RouteProjection(distance: double.infinity, along: 0);
    final latitude = p.latitude * math.pi / 180, scale = math.cos(latitude);
    for (var i = 0; i < points.length - 1; i++) {
      if (!initial &&
          (cumulative[i + 1] < progress - 120 ||
              cumulative[i] > progress + 1500)) {
        continue;
      }
      final a = points[i], b = points[i + 1];
      final ax = (a.longitude - p.longitude) * scale,
          ay = a.latitude - p.latitude;
      final dx = (b.longitude - a.longitude) * scale,
          dy = b.latitude - a.latitude;
      final denominator = dx * dx + dy * dy;
      final t = denominator == 0
          ? 0.0
          : (-(ax * dx + ay * dy) / denominator).clamp(0.0, 1.0);
      final projected = LatLng(
        a.latitude + (b.latitude - a.latitude) * t,
        a.longitude + (b.longitude - a.longitude) * t,
      );
      final distance = const Distance().as(LengthUnit.Meter, p, projected);
      final along = cumulative[i] + (cumulative[i + 1] - cumulative[i]) * t;
      if (distance < best.distance) {
        best = RouteProjection(distance: distance, along: along);
      }
    }
    return best;
  }

  // OSRM and great-circle distances may differ slightly; align progress to OSRM metres.
  double routeMetres(double geometryMetres) =>
      cumulative.last <= 0 ? 0 : geometryMetres / cumulative.last * distance;
}

class RouteProjection {
  const RouteProjection({required this.distance, required this.along});
  final double distance, along;
}

class NavigationFix {
  const NavigationFix(
    this.point, {
    required this.accuracy,
    required this.timestamp,
    this.heading = -1,
    this.speed = 0,
  });
  final LatLng point;
  final double accuracy, heading, speed;
  final DateTime timestamp;
  bool valid(DateTime now) =>
      accuracy.isFinite &&
      accuracy >= 0 &&
      accuracy <= 60 &&
      now.difference(timestamp).inSeconds.abs() <= 20;
}

bool isPickupNavigation(String status) =>
    ['accepted', 'arriving', 'waiting', 'pending_pickup'].contains(status);
bool isNavigationActive(String status) => [
  'accepted',
  'arriving',
  'in_progress',
  'picked_up',
  'in_transit',
].contains(status);
