import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/driver_statistics.dart';
import '../../domain/repositories/executor_repository.dart';

class DriverProfileStatistics extends StatefulWidget {
  const DriverProfileStatistics({super.key, required this.repository});
  final ExecutorRepository repository;

  @override
  State<DriverProfileStatistics> createState() =>
      _DriverProfileStatisticsState();
}

class _DriverProfileStatisticsState extends State<DriverProfileStatistics>
    with WidgetsBindingObserver {
  DriverStatistics? _statistics;
  Timer? _timer;
  bool _busy = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _refresh() async {
    if (_busy) return;
    _busy = true;
    try {
      final result = await widget.repository.fetchStatistics();
      if (!mounted) return;
      final statistics = result.fold<DriverStatistics?>(
        (_) => null,
        (value) => value,
      );
      setState(() {
        _statistics = statistics;
        _failed = statistics == null;
      });
    } catch (_) {
      if (mounted)
        setState(() {
          _statistics = null;
          _failed = true;
        });
    } finally {
      _busy = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final statistics = _statistics;
    return Column(
      children: [
        _StatisticsRow(statistics: statistics),
        const SizedBox(height: 6),
        if (_failed)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  l10n.driverStatisticsUnavailable,
                  style: const TextStyle(fontSize: 11),
                ),
              ),
              IconButton(
                onPressed: _refresh,
                tooltip: l10n.driverStatisticsRefresh,
                icon: const Icon(Icons.refresh, size: 18),
              ),
            ],
          )
        else if (statistics == null)
          const SizedBox(height: 2, child: LinearProgressIndicator())
        else
          Text(
            l10n.driverStatisticsPeriod,
            style: const TextStyle(fontSize: 11, color: AppColors.text),
          ),
      ],
    );
  }
}

class _StatisticsRow extends StatelessWidget {
  const _StatisticsRow({required this.statistics});
  final DriverStatistics? statistics;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final statistics = this.statistics;
    final rating = statistics?.rating;
    final activity = statistics?.activityPercent;
    final ratingFormat = NumberFormat.decimalPattern(l10n.localeName)
      ..minimumFractionDigits = 2
      ..maximumFractionDigits = 2;
    final activityFormat = NumberFormat.decimalPattern(l10n.localeName)
      ..maximumFractionDigits = 1;
    return Row(
      children: [
        Expanded(
          child: _Statistic(
            label: l10n.driverRatingLabel,
            value: rating == null ? '—' : ratingFormat.format(rating),
            hint: statistics != null && statistics.ratedOrders == 0
                ? l10n.driverStatisticsNoRatings
                : null,
          ),
        ),
        Expanded(
          child: _Statistic(
            label: l10n.driverActivityLabel,
            value: activity == null
                ? '—'
                : '${activityFormat.format(activity)}%',
            hint: l10n.driverActivityDescription,
          ),
        ),
        Expanded(
          child: _Statistic(
            label: l10n.driverTripsLabel,
            value: statistics == null
                ? '—'
                : NumberFormat.decimalPattern(
                    l10n.localeName,
                  ).format(statistics.completedOrders),
          ),
        ),
      ],
    );
  }
}

class _Statistic extends StatelessWidget {
  const _Statistic({required this.label, required this.value, this.hint});
  final String label;
  final String value;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final labelWidget = Text(
      label,
      style: Theme.of(
        context,
      ).textTheme.bodyMedium?.copyWith(color: AppColors.text, fontSize: 11),
    );
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleMedium),
        if (hint == null)
          labelWidget
        else
          Tooltip(message: hint!, child: labelWidget),
      ],
    );
  }
}
