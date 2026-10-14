import 'dart:async';
import 'dart:math' as math;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';
import '../domain/navigation_ports.dart';
import '../domain/navigation_route.dart';

class NavigationCue {
  const NavigationCue(this.id, this.maneuver, this.metres, this.immediate);
  final String id;
  final NavigationManeuver maneuver;
  final int metres;
  final bool immediate;
}

class NavigationState {
  const NavigationState({
    required this.position,
    this.route,
    this.heading = 0,
    this.remaining = 0,
    this.turnDistance = 0,
    this.next,
    this.routing = false,
    this.gpsReady = false,
    this.error,
    this.follow = true,
    this.voice = true,
    this.voiceAvailable,
    this.cue,
    this.arrived = false,
    this.pickup = true,
  });
  final LatLng position;
  final RoadRoute? route;
  final double heading, remaining, turnDistance;
  final NavigationManeuver? next;
  final bool routing, gpsReady, follow, voice, arrived, pickup;
  final bool? voiceAvailable;
  final String? error;
  final NavigationCue? cue;
  NavigationState copy({
    LatLng? position,
    RoadRoute? route,
    double? heading,
    double? remaining,
    double? turnDistance,
    NavigationManeuver? next,
    bool? routing,
    bool? gpsReady,
    String? error,
    bool clearError = false,
    bool? follow,
    bool? voice,
    bool? voiceAvailable,
    NavigationCue? cue,
    bool? arrived,
    bool? pickup,
    bool reset = false,
  }) => NavigationState(
    position: position ?? this.position,
    route: reset ? null : route ?? this.route,
    heading: heading ?? this.heading,
    remaining: remaining ?? this.remaining,
    turnDistance: turnDistance ?? this.turnDistance,
    next: reset ? null : next ?? this.next,
    routing: routing ?? this.routing,
    gpsReady: gpsReady ?? this.gpsReady,
    error: clearError ? null : error ?? this.error,
    follow: follow ?? this.follow,
    voice: voice ?? this.voice,
    voiceAvailable: voiceAvailable ?? this.voiceAvailable,
    cue: reset ? null : cue ?? this.cue,
    arrived: arrived ?? this.arrived,
    pickup: pickup ?? this.pickup,
  );
}

class NavigationCubit extends Cubit<NavigationState> {
  NavigationCubit({
    required this.repository,
    required this.location,
    required this.speech,
    required LatLng initial,
    required this.pickup,
    required this.destination,
    required String status,
    DateTime Function()? now,
  }) : _status = status,
       _now = now ?? DateTime.now,
       super(
         NavigationState(position: initial, pickup: isPickupNavigation(status)),
       );
  final NavigationRepository repository;
  final NavigationLocation location;
  final NavigationSpeech speech;
  final LatLng pickup, destination;
  final DateTime Function() _now;
  String _status, _locale = 'ru';
  StreamSubscription<NavigationFix>? _gps;
  Timer? _watchdog;
  NavigationFix? _lastFix;
  double _progress = 0;
  int _request = 0, _epoch = 0, _offRoute = 0, _voiceEpoch = 0;
  bool _foreground = true;
  DateTime? _lastRequest;
  final Set<String> _spoken = {};
  Future<bool>? _preparingVoice;
  String? _speakingCue;
  LatLng get target => isPickupNavigation(_status) ? pickup : destination;
  void start() {
    _watchGps();
    _watchdog = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!isClosed &&
          _lastFix != null &&
          _now().difference(_lastFix!.timestamp).inSeconds > 15 &&
          state.gpsReady) {
        emit(state.copy(gpsReady: false));
        unawaited(speech.stop());
      }
    });
  }

  void _watchGps() {
    unawaited(_gps?.cancel());
    _gps = location.watch().listen(
      update,
      onError: (_) {
        if (!isClosed) {
          emit(state.copy(gpsReady: false));
          unawaited(speech.stop());
        }
      },
    );
  }

  Future<void> setLocale(String locale) async {
    if (locale == _locale && _preparingVoice != null) return;
    _locale = locale;
    _voiceEpoch++;
    _speakingCue = null;
    _spoken.clear();
    await speech.stop();
    if (isClosed) return;
    await _prepareVoice();
    if (!isClosed) _cue();
  }

  Future<bool> _prepareVoice() {
    final epoch = _voiceEpoch, locale = _locale;
    final previous = _preparingVoice;
    return _preparingVoice = () async {
      if (previous != null) await previous;
      if (isClosed || epoch != _voiceEpoch) return false;
      final available = await speech.enable(locale == 'kk' ? 'kk-KZ' : 'ru-RU');
      if (!isClosed && epoch == _voiceEpoch) {
        emit(state.copy(voiceAvailable: available));
      }
      return available;
    }();
  }

  Future<void> toggleVoice() async {
    final enable = !state.voice || state.voiceAvailable != true;
    final epoch = ++_voiceEpoch;
    _speakingCue = null;
    emit(state.copy(voice: false));
    await speech.stop();
    if (enable) {
      _spoken.clear();
      await _prepareVoice();
      if (!isClosed && epoch == _voiceEpoch) {
        emit(state.copy(voice: true));
        _cue();
      }
    }
  }

  Future<void> say(String text, NavigationCue cue) async {
    final epoch = _voiceEpoch;
    if (!state.voice ||
        !state.gpsReady ||
        !_foreground ||
        !isNavigationActive(_status) ||
        state.routing ||
        state.error != null ||
        _offRoute > 0) {
      return;
    }
    if (_speakingCue == cue.id || !cue.id.endsWith(':$_locale')) return;
    _speakingCue = cue.id;
    final ready = await (_preparingVoice ?? _prepareVoice());
    if (isClosed ||
        epoch != _voiceEpoch ||
        !ready ||
        state.cue?.id != cue.id ||
        !state.voice ||
        !state.gpsReady ||
        !isNavigationActive(_status) ||
        state.routing ||
        state.error != null ||
        _offRoute > 0) {
      return;
    }
    try {
      await speech.speak(text);
    } catch (_) {
      if (!isClosed) emit(state.copy(voiceAvailable: false));
    }
  }

  void setStatus(String status) {
    if (status == _status) return;
    final oldPickup = isPickupNavigation(_status);
    _status = status;
    _voiceEpoch++;
    _speakingCue = null;
    if (isNavigationActive(status)) unawaited(_prepareVoice());
    if (!isNavigationActive(status)) {
      unawaited(speech.stop());
      _request++;
      emit(state.copy(routing: false));
    }
    if (oldPickup != isPickupNavigation(status) && isNavigationActive(status)) {
      _request++;
      _epoch++;
      _progress = 0;
      _lastRequest = null;
      _offRoute = 0;
      _spoken.clear();
      unawaited(speech.stop());
      emit(
        state.copy(
          reset: true,
          routing: false,
          clearError: true,
          remaining: 0,
          turnDistance: 0,
          arrived: false,
          pickup: isPickupNavigation(status),
        ),
      );
      if (state.gpsReady) unawaited(rebuild(force: true));
    }
  }

  void follow() {
    emit(state.copy(follow: true));
  }

  void pan() {
    if (state.follow) emit(state.copy(follow: false));
  }

  void foreground(bool value) {
    _foreground = value;
    if (!value) {
      unawaited(speech.stop());
    } else {
      _watchGps();
    }
  }

  Future<void> retry() async {
    _watchGps();
    if (state.gpsReady) await rebuild(force: true);
  }

  void update(NavigationFix fix) {
    if (isClosed ||
        !fix.valid(_now()) ||
        (_lastFix != null && !fix.timestamp.isAfter(_lastFix!.timestamp))) {
      return;
    }
    final old = _lastFix;
    _lastFix = fix;
    var heading = state.heading;
    if (fix.speed > 1.5 &&
        fix.heading.isFinite &&
        fix.heading >= 0 &&
        fix.heading < 360) {
      heading = fix.heading;
    } else if (old != null &&
        const Distance().as(LengthUnit.Meter, old.point, fix.point) > 6) {
      heading = (const Distance().bearing(old.point, fix.point) + 360) % 360;
    }
    emit(state.copy(position: fix.point, heading: heading, gpsReady: true));
    if (!isNavigationActive(_status) || !_foreground) return;
    if (state.route == null) {
      unawaited(rebuild());
      return;
    }
    _track();
  }

  void _track() {
    final route = state.route;
    if (route == null) return;
    final projection = route.project(
      state.position,
      progress: _progress,
      initial: _progress == 0,
    );
    final wrongWay =
        projection.along < _progress - 45 && (_lastFix?.speed ?? 0) > 2;
    final off =
        projection.distance > math.max(45, (_lastFix?.accuracy ?? 0) * 1.5) ||
        wrongWay;
    _offRoute = off ? _offRoute + 1 : 0;
    if (_offRoute >= 3) {
      unawaited(rebuild());
      return;
    }
    if (off) {
      unawaited(speech.stop());
      return;
    }
    _progress = math.max(_progress, projection.along);
    final progress = route.routeMetres(_progress);
    final next =
        route.maneuvers
            .where((m) => m.type != 'depart' && m.distance >= progress - 12)
            .firstOrNull ??
        route.maneuvers.last;
    final remaining = math.max(0.0, route.distance - progress);
    final arrived =
        remaining < 30 &&
        const Distance().as(LengthUnit.Meter, state.position, target) < 45;
    emit(
      state.copy(
        next: next,
        remaining: remaining,
        turnDistance: math.max(0, next.distance - progress),
        arrived: arrived,
      ),
    );
    if (!state.routing && state.error == null) _cue();
  }

  void _cue() {
    final maneuver = state.next;
    if (maneuver == null ||
        !state.gpsReady ||
        !isNavigationActive(_status) ||
        !_foreground) {
      return;
    }
    final d = state.turnDistance;
    final stage = d <= 25
        ? 0
        : d <= 100
        ? 100
        : d <= 300
        ? 300
        : 1000;
    final id = '$_epoch:${maneuver.distance}:$stage:$_locale';
    if (!_spoken.add(id)) return;
    final rounded = d > 1000
        ? (d / 100).round() * 100
        : d > 100
        ? (d / 50).round() * 50
        : d > 25
        ? (d / 10).round() * 10
        : 0;
    emit(state.copy(cue: NavigationCue(id, maneuver, rounded, d <= 25)));
  }

  Future<void> rebuild({bool force = false}) async {
    if (isClosed ||
        !state.gpsReady ||
        !_foreground ||
        !isNavigationActive(_status) ||
        state.routing) {
      return;
    }
    if (!force &&
        _lastRequest != null &&
        _now().difference(_lastRequest!).inSeconds < 8) {
      return;
    }
    _lastRequest = _now();
    final request = ++_request;
    final destination = target;
    emit(state.copy(routing: true, clearError: true));
    await speech.stop();
    final result = await repository.route(state.position, destination);
    if (isClosed || request != _request) return;
    result.fold(
      (failure) => emit(state.copy(routing: false, error: failure.code)),
      (route) {
        _epoch++;
        _progress = 0;
        _offRoute = 0;
        _spoken.clear();
        emit(state.copy(route: route, routing: false, clearError: true));
        _track();
      },
    );
  }

  @override
  Future<void> close() async {
    _request++;
    _voiceEpoch++;
    _watchdog?.cancel();
    await _gps?.cancel();
    await _preparingVoice;
    await speech.dispose();
    return super.close();
  }
}
