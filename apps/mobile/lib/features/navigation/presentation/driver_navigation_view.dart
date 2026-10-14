import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/errors/error_message_localizer.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';
import '../domain/navigation_ports.dart';
import '../domain/navigation_route.dart';
import 'navigation_cubit.dart';
import 'navigation_instructions.dart';

class DriverNavigationView extends StatefulWidget {
  const DriverNavigationView({
    super.key,
    required this.initialLocation,
    required this.pickup,
    required this.destination,
    required this.status,
    this.topInset = 90,
    this.bottomInset = 280,
    this.cubit,
    this.showTiles = true,
  });
  final LatLng initialLocation, pickup, destination;
  final String status;
  final double topInset, bottomInset;
  final NavigationCubit? cubit;
  final bool showTiles;
  @override
  State<DriverNavigationView> createState() => DriverNavigationViewState();
}

class DriverNavigationViewState extends State<DriverNavigationView>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final NavigationCubit navigation;
  final _map = MapController(), _header = GlobalKey();
  late final AnimationController _animation;
  LatLng? _from, _to;
  double _bearingFrom = 0, _bearingTo = 0, _headerHeight = 130;
  bool _ready = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    navigation =
        widget.cubit ??
        NavigationCubit(
          repository: serviceLocator<NavigationRepository>(),
          location: serviceLocator<NavigationLocation>(),
          speech: serviceLocator<NavigationSpeech>(),
          initial: widget.initialLocation,
          pickup: widget.pickup,
          destination: widget.destination,
          status: widget.status,
        );
    _animation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    )..addListener(_cameraTick);
    navigation.start();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    unawaited(
      navigation.setLocale(Localizations.localeOf(context).languageCode),
    );
  }

  @override
  void didUpdateWidget(covariant DriverNavigationView oldWidget) {
    super.didUpdateWidget(oldWidget);
    navigation.setStatus(widget.status);
    if (oldWidget.bottomInset != widget.bottomInset) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _follow();
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      navigation.foreground(state == AppLifecycleState.resumed);
  void recenter() {
    navigation.follow();
    _follow();
  }

  void _follow() {
    if (!_ready || !navigation.state.follow) return;
    _from = _to ?? navigation.state.position;
    _to = navigation.state.position;
    _bearingFrom = _ready ? -_map.camera.rotation : 0;
    _bearingTo =
        _bearingFrom +
        ((navigation.state.heading - _bearingFrom + 540) % 360 - 180);
    _animation.forward(from: 0);
  }

  void _cameraTick() {
    if (!_ready ||
        !mounted ||
        !navigation.state.follow ||
        _from == null ||
        _to == null) {
      return;
    }
    final t = Curves.easeOut.transform(_animation.value);
    final p = LatLng(
      _from!.latitude + (_to!.latitude - _from!.latitude) * t,
      _from!.longitude + (_to!.longitude - _from!.longitude) * t,
    );
    _map.rotate(-(_bearingFrom + (_bearingTo - _bearingFrom) * t));
    final top = widget.topInset + _headerHeight + 16,
        bottom = widget.bottomInset;
    _map.move(p, _map.camera.zoom, offset: Offset(0, (top - bottom) / 2));
  }

  void _measure() {
    final box = _header.currentContext?.findRenderObject();
    if (box is RenderBox && (_headerHeight - box.size.height).abs() > 1) {
      _headerHeight = box.size.height;
      _follow();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _animation.dispose();
    _map.dispose();
    unawaited(navigation.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => BlocProvider.value(
    value: navigation,
    child: BlocConsumer<NavigationCubit, NavigationState>(
      listenWhen: (a, b) =>
          a.position != b.position ||
          a.heading != b.heading ||
          a.follow != b.follow ||
          a.cue?.id != b.cue?.id ||
          a.voice != b.voice ||
          a.voiceAvailable != b.voiceAvailable,
      listener: (context, state) {
        _follow();
        final cue = state.cue;
        if (cue != null) {
          unawaited(
            navigation.say(
              cueText(
                AppLocalizations.of(context)!,
                cue,
                pickup: state.pickup,
                arrived: state.arrived,
              ),
              cue,
            ),
          );
        }
      },
      builder: (context, state) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _measure();
        });
        return Stack(
          children: [
            _roadMap(context, state),
            Positioned(
              top: widget.topInset,
              left: 12,
              right: 12,
              child: SizeChangedLayoutNotifier(
                child: NavigationHeader(
                  key: _header,
                  state: state,
                  status: widget.status,
                ),
              ),
            ),
            Positioned(
              bottom: widget.bottomInset + 12,
              right: 12,
              child: FloatingActionButton.small(
                heroTag: 'navigation-follow',
                tooltip: AppLocalizations.of(context)!.navFollow,
                onPressed: recenter,
                child: Icon(
                  state.follow ? Icons.navigation : Icons.my_location,
                ),
              ),
            ),
            Positioned(
              bottom: widget.bottomInset + 2,
              left: 8,
              child: Text(
                AppLocalizations.of(context)!.navMapSource,
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.black,
                  backgroundColor: Colors.white,
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
  Widget _roadMap(BuildContext context, NavigationState state) => FlutterMap(
    mapController: _map,
    options: MapOptions(
      initialCenter: widget.initialLocation,
      initialZoom: 17,
      onMapReady: () {
        _ready = true;
        _follow();
      },
      onPositionChanged: (_, gesture) {
        if (gesture) {
          _animation.stop();
          navigation.pan();
        }
      },
    ),
    children: [
      if (widget.showTiles)
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.dos.dos_mobile',
        ),
      if (state.route != null)
        PolylineLayer(
          polylines: [
            Polyline(
              points: state.route!.points,
              strokeWidth: 7,
              borderStrokeWidth: 2,
              borderColor: Colors.white,
              color: state.routing || state.error != null
                  ? Colors.grey
                  : AppColors.primary,
            ),
          ],
        ),
      MarkerLayer(
        markers: [
          Marker(
            point: state.pickup ? widget.pickup : widget.destination,
            width: 44,
            height: 44,
            rotate: true,
            child: const Icon(Icons.location_on, color: Colors.green, size: 42),
          ),
          Marker(
            point: state.position,
            width: 46,
            height: 46,
            child: Transform.rotate(
              angle: state.heading * math.pi / 180,
              child: Icon(
                Icons.navigation,
                size: 42,
                color: state.gpsReady ? Colors.blue : Colors.grey,
              ),
            ),
          ),
        ],
      ),
    ],
  );
}

class NavigationHeader extends StatelessWidget {
  const NavigationHeader({
    super.key,
    required this.state,
    required this.status,
  });
  final NavigationState state;
  final String status;
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!,
        c = context.read<NavigationCubit>();
    final compact = MediaQuery.sizeOf(context).height < 700;
    final action = state.arrived
        ? (state.pickup ? l.navArrivedPickup : l.navArrivedDestination)
        : state.next == null
        ? l.navStraight
        : maneuverAction(l, state.next!, pickup: state.pickup);
    final message = !state.gpsReady
        ? l.navNoGps
        : state.routing
        ? (state.route == null ? l.navBuilding : l.navRerouting)
        : state.error != null
        ? (ErrorMessageLocalizer.configured(l, state.error!) ?? l.navRouteError)
        : status == 'waiting'
        ? l.navWait
        : !isNavigationActive(status)
        ? l.navFinished
        : null;
    return Material(
      color: AppColors.darkSurface,
      borderRadius: BorderRadius.circular(18),
      elevation: 5,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    state.pickup ? l.navToPickup : l.navToDestination,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                IconButton(
                  visualDensity: compact
                      ? VisualDensity.compact
                      : VisualDensity.standard,
                  tooltip: state.voiceAvailable == false
                      ? l.navVoiceUnavailable
                      : l.navSound,
                  onPressed: c.toggleVoice,
                  icon: Icon(
                    state.voice && state.voiceAvailable == true
                        ? Icons.volume_up
                        : Icons.volume_off,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            if (message != null)
              Text(message, style: const TextStyle(color: Colors.white))
            else ...[
              Text(
                '${l.navMetres(state.turnDistance.round())} · $action',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: compact ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if ((state.next?.roadName ?? '').isNotEmpty)
                Text(
                  l.navRoad(state.next!.roadName),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70),
                ),
              Text(
                l.navRemaining(
                  state.remaining.round(),
                  state.route == null
                      ? 0
                      : math.max(
                          1,
                          (state.route!.duration *
                                  state.remaining /
                                  math.max(1, state.route!.distance) /
                                  60)
                              .ceil(),
                        ),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
            if (state.voice &&
                state.voiceAvailable == false &&
                MediaQuery.sizeOf(context).height >= 700)
              Text(
                l.navVoiceUnavailable,
                style: const TextStyle(color: Colors.amber, fontSize: 12),
              ),
            if (state.error != null || !state.gpsReady)
              TextButton(onPressed: c.retry, child: Text(l.navRetry)),
          ],
        ),
      ),
    );
  }
}
