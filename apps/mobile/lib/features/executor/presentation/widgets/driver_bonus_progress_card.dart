import 'dart:async';

import 'package:dartz/dartz.dart' show Either;
import 'package:flutter/material.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/errors/failure.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../domain/entities/driver_bonus_progress.dart';
import '../../domain/repositories/executor_repository.dart';

class DriverBonusProgressCard extends StatefulWidget {
  const DriverBonusProgressCard({required this.balance, super.key});
  final double balance;
  @override
  State<DriverBonusProgressCard> createState() =>
      _DriverBonusProgressCardState();
}

class _DriverBonusProgressCardState extends State<DriverBonusProgressCard>
    with WidgetsBindingObserver {
  late Future<Either<Failure, DriverBonusProgress>> _progress;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _progress = serviceLocator<ExecutorRepository>().fetchBonusProgress();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  void _refresh() {
    if (mounted) {
      setState(() {
        _progress = serviceLocator<ExecutorRepository>().fetchBonusProgress();
      });
    }
  }

  @override
  void didUpdateWidget(covariant DriverBonusProgressCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.balance != widget.balance) _refresh();
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return FutureBuilder<Either<Failure, DriverBonusProgress>>(
      future: _progress,
      builder: (context, snapshot) {
        if (snapshot.data == null && !snapshot.hasError) {
          return const Padding(
            padding: EdgeInsets.all(8),
            child: LinearProgressIndicator(),
          );
        }
        final progress = snapshot.data?.fold<DriverBonusProgress?>(
          (_) => null,
          (value) => value,
        );
        if (progress == null) {
          return Row(
            children: [
              Expanded(
                child: Text(
                  l10n.driverBonusUnavailable,
                  style: const TextStyle(color: AppColors.darkMuted),
                ),
              ),
              IconButton(
                onPressed: _refresh,
                tooltip: l10n.driverBonusRefresh,
                icon: const Icon(
                  Icons.refresh_rounded,
                  color: AppColors.primary,
                ),
              ),
            ],
          );
        }
        if (!progress.isEnabled) {
          return Text(
            l10n.driverBonusDisabled,
            style: const TextStyle(color: AppColors.darkMuted),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.driverBonusesLabel,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.darkText,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _refresh,
                  tooltip: l10n.driverBonusRefresh,
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            Text(
              l10n.driverBonusConditions(
                progress.ordersRequired,
                AppFormatters.formatCurrency(
                  context,
                  progress.bonusAmount,
                  currencyCode: progress.currency,
                ),
              ),
              style: const TextStyle(color: AppColors.darkText),
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress.fraction,
                minHeight: 10,
                backgroundColor: AppColors.darkSurfaceAlt,
                color: AppColors.primary,
                semanticsLabel: l10n.driverBonusesLabel,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.driverBonusProgress(
                progress.completedInCycle,
                progress.ordersRequired,
                progress.remainingOrders,
              ),
              style: const TextStyle(color: AppColors.darkMuted),
            ),
          ],
        );
      },
    );
  }
}
