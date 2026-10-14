import 'package:dartz/dartz.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/api/api_client.dart';
import '../../../core/errors/failure.dart';
import '../domain/navigation_ports.dart';
import '../domain/navigation_route.dart';

class ApiNavigationRepository implements NavigationRepository {
  ApiNavigationRepository(this.client);
  final ApiClient client;
  @override
  Future<Either<Failure, RoadRoute>> route(LatLng from, LatLng to) async {
    try {
      final response = await client.guard(
        () => client.dio.post<Map<String, dynamic>>(
          '/geo/navigation',
          data: {
            'from': {'lat': from.latitude, 'lng': from.longitude},
            'to': {'lat': to.latitude, 'lng': to.longitude},
          },
        ),
      );
      return Right(parse(response.data!));
    } on Failure catch (f) {
      return Left(f);
    } catch (_) {
      return const Left(
        Failure(
          code: 'GEO_ROUTE_UNAVAILABLE',
          message: 'GEO_ROUTE_UNAVAILABLE',
        ),
      );
    }
  }

  static RoadRoute parse(Map<String, dynamic> data) {
    final points = (data['points'] as List)
        .map(
          (p) => LatLng(
            (p['lat'] as num).toDouble(),
            (p['lng'] as num).toDouble(),
          ),
        )
        .toList();
    final maneuvers = (data['maneuvers'] as List)
        .map(
          (m) => NavigationManeuver(
            point: LatLng(
              (m['point']['lat'] as num).toDouble(),
              (m['point']['lng'] as num).toDouble(),
            ),
            type: m['type'] as String,
            modifier: m['modifier'] as String? ?? '',
            roadName: m['roadName'] as String? ?? '',
            distance: (m['distanceFromStartMeters'] as num).toDouble(),
            exit: (m['exit'] as num?)?.toInt(),
          ),
        )
        .toList();
    if (points.length < 2 || maneuvers.length < 2) {
      throw const FormatException('Road route missing');
    }
    return RoadRoute(
      points: points,
      maneuvers: maneuvers,
      distance: (data['distanceMeters'] as num).toDouble(),
      duration: (data['durationSeconds'] as num).toDouble(),
    );
  }
}

class GpsNavigationLocation implements NavigationLocation {
  @override
  Stream<NavigationFix> watch() async* {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const Failure(
        code: 'HOME_LOCATION_PERMISSION_DENIED',
        message: 'HOME_LOCATION_PERMISSION_DENIED',
      );
    }
    final settings = kIsWeb
        ? WebSettings(
            accuracy: LocationAccuracy.best,
            maximumAge: Duration.zero,
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.bestForNavigation,
            distanceFilter: 3,
          );
    await for (final p in Geolocator.getPositionStream(
      locationSettings: settings,
    )) {
      yield NavigationFix(
        LatLng(p.latitude, p.longitude),
        accuracy: p.accuracy,
        timestamp: p.timestamp,
        heading: p.heading,
        speed: p.speed,
      );
    }
  }
}

class SystemNavigationSpeech implements NavigationSpeech {
  final FlutterTts _tts = FlutterTts();
  bool _enabled = false;
  @override
  Future<bool> enable(String locale) async {
    _enabled = false;
    await stop();
    try {
      final language = locale.split('-').first;
      for (var attempt = 0; attempt < 5; attempt++) {
        final voices = await _tts.getVoices;
        if (voices is List) {
          final available = voices
              .whereType<Map>()
              .where(
                (v) =>
                    (v['locale']
                                ?.toString()
                                .replaceAll('_', '-')
                                .toLowerCase() ??
                            '')
                        .split('-')
                        .first ==
                    language,
              )
              .toList();
          if (available.isNotEmpty) {
            final v = available.first;
            final voiceLocale = v['locale'].toString().replaceAll('_', '-');
            await _tts.setLanguage(voiceLocale);
            await _tts.setVoice({
              'name': v['name'].toString(),
              'locale': voiceLocale,
            });
            await _tts.setSpeechRate(0.48);
            await _tts.setVolume(1);
            _enabled = true;
            return true;
          }
        }
        await Future<void>.delayed(const Duration(milliseconds: 150));
      }
    } catch (_) {
      _enabled = false;
    }
    return false;
  }

  @override
  Future<void> speak(String text) async {
    if (_enabled) {
      await _tts.stop();
      await _tts.speak(text);
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }

  @override
  Future<void> dispose() => stop();
}
