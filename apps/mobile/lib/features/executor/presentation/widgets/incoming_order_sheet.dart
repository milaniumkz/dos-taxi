import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../cubit/incoming_order_cubit.dart';

class IncomingOrderSheet extends StatelessWidget {
  const IncomingOrderSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SafeArea(
      child: BlocBuilder<IncomingOrderCubit, IncomingOrderState>(
        builder: (context, state) {
          final offer = state.currentOffer;
          if (offer == null) {
            return const SizedBox.shrink();
          }

          return DecoratedBox(
            decoration: const BoxDecoration(color: AppColors.darkBackground),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
              child: DosCard(
                color: AppColors.darkSurface,
                borderColor: const Color(0x22FFFFFF),
                padding: const EdgeInsets.all(14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            l10n.driverIncomingOrderTitle,
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(color: AppColors.darkText),
                          ),
                        ),
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppColors.darkSurfaceAlt,
                          child: Text(
                            '${state.secondsRemaining}',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(color: AppColors.primary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.driverIncomingOrderCountdown(state.secondsRemaining),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.darkMuted,
                      ),
                    ),
                    const SizedBox(height: 12),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: AppColors.darkSurfaceAlt,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0x1AFFFFFF)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            _RouteLine(
                              label: l10n.driverIncomingOrderPickupLabel,
                              address: offer.pickupAddress,
                              color: AppColors.primary,
                            ),
                            const SizedBox(height: 8),
                            _RouteLine(
                              label: l10n.driverIncomingOrderDestinationLabel,
                              address: offer.destinationAddress,
                              color: AppColors.success,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _MetricTile(
                            label: l10n.driverIncomingOrderPriceLabel,
                            value: AppFormatters.formatCurrency(
                              context,
                              offer.price,
                              currencyCode: offer.currency,
                            ),
                            highlighted: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricTile(
                            label: l10n.driverIncomingOrderDistanceLabel,
                            value: l10n.taxiConfirmDistanceValue(
                              (offer.distanceMeters / 1000).toStringAsFixed(1),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MetricTile(
                            label: l10n.driverIncomingOrderDurationLabel,
                            value: l10n.taxiConfirmDurationValue(
                              (offer.durationSeconds / 60).round(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if ((offer.clientName ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${l10n.driverIncomingOrderClientLabel}: ${offer.clientName!}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.darkMuted,
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: state.isSubmitting
                                ? null
                                : () => context
                                      .read<IncomingOrderCubit>()
                                      .rejectCurrentOffer(),
                            child: Text(l10n.driverIncomingOrderReject),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: state.isSubmitting
                                ? null
                                : () => context
                                      .read<IncomingOrderCubit>()
                                      .acceptCurrentOffer(),
                            child: state.isSubmitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(l10n.driverIncomingOrderAccept),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _RouteLine extends StatelessWidget {
  const _RouteLine({
    required this.label,
    required this.address,
    required this.color,
  });

  final String label;
  final String address;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: DecoratedBox(
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: const SizedBox(width: 9, height: 9),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.darkMuted,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                address,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.darkText,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    this.highlighted = false,
  });

  final String label;
  final String value;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: highlighted ? AppColors.primary : AppColors.darkSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: highlighted ? AppColors.text : AppColors.darkMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: highlighted ? AppColors.text : AppColors.darkText,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
