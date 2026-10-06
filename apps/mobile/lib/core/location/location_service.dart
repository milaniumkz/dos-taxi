import 'package:dartz/dartz.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../errors/failure.dart';

class LocationService {
  const LocationService();

  Future<Either<Failure, LatLng>> currentLocation() async {
    if (!kIsWeb) {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return left(
          const Failure(
            code: 'HOME_LOCATION_SERVICE_DISABLED',
            message: 'Геолокация выключена',
          ),
        );
      }
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return left(
        const Failure(
          code: 'HOME_LOCATION_PERMISSION_DENIED',
          message: 'Нет разрешения на геолокацию',
        ),
      );
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: kIsWeb
            ? WebSettings(
                accuracy: LocationAccuracy.high,
                maximumAge: Duration.zero,
                timeLimit: const Duration(seconds: 25),
              )
            : const LocationSettings(
                accuracy: LocationAccuracy.high,
                timeLimit: Duration(seconds: 25),
              ),
      );

      return right(LatLng(position.latitude, position.longitude));
    } catch (_) {
      final lastKnownPosition = await Geolocator.getLastKnownPosition();
      if (lastKnownPosition != null) {
        return right(
          LatLng(lastKnownPosition.latitude, lastKnownPosition.longitude),
        );
      }

      return left(
        const Failure(
          code: 'HOME_LOCATION_UNAVAILABLE',
          message: 'Геолокация недоступна',
        ),
      );
    }
  }
}
