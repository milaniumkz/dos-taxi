import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/di/service_locator.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/location/location_service.dart';

class CurrentCityBadge extends StatefulWidget {
  const CurrentCityBadge({super.key, this.locate});

  final Future<Map<String, dynamic>?> Function()? locate;

  @override
  State<CurrentCityBadge> createState() => _CurrentCityBadgeState();
}

class _CurrentCityBadgeState extends State<CurrentCityBadge>
    with WidgetsBindingObserver {
  Timer? _timer;
  Map<String, dynamic>? _city;
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_refresh());
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _refresh());
  }

  Future<Map<String, dynamic>?> _locate() async {
    if (!serviceLocator.isRegistered<LocationService>() ||
        !serviceLocator.isRegistered<ApiClient>()) {
      return null;
    }
    final result = await serviceLocator<LocationService>().currentLocation();
    return result.fold((_) async => null, (location) async {
      final client = serviceLocator<ApiClient>();
      final response = await client.guard(
        () => client.dio.get<Map<String, dynamic>>(
          '/ride-requests/current-city',
          queryParameters: {
            'lat': location.latitude,
            'lng': location.longitude,
          },
        ),
      );
      return response.data;
    });
  }

  Future<void> _refresh() async {
    if (_busy) return;
    _busy = true;
    Map<String, dynamic>? city;
    try {
      city = await (widget.locate?.call() ?? _locate());
    } catch (_) {
      city = null;
    }
    _busy = false;
    if (!mounted) return;
    setState(() {
      _city = city;
      _loading = false;
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final language = Localizations.localeOf(context).languageCode;
    final name =
        (_city?[language == 'kk' ? 'nameKk' : 'nameRu'] ?? _city?['nameRu'])
            ?.toString()
            .trim();
    final label = name != null && name.isNotEmpty
        ? name
        : (_loading ? l.cityDetecting : l.cityNotDetected);
    return Material(
      color: Theme.of(context).colorScheme.surface,
      elevation: 2,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_city_rounded, size: 16),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
