import 'package:dartz/dartz.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/errors/failure.dart';
import 'navigation_route.dart';

abstract interface class NavigationRepository {
  Future<Either<Failure, RoadRoute>> route(LatLng from, LatLng to);
}

abstract interface class NavigationLocation {
  Stream<NavigationFix> watch();
}

abstract interface class NavigationSpeech {
  Future<bool> enable(String locale);
  Future<void> speak(String text);
  Future<void> stop();
  Future<void> dispose();
}
