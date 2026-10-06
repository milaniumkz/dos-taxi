import 'package:flutter/material.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../taxi/presentation/widgets/summary_row.dart';
import '../../domain/entities/history_order.dart';

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({required this.order, super.key});

  static const routePath = '/history/detail';

  final HistoryOrder order;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.orderHistoryDetailTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.serviceType == 'delivery'
                        ? l10n.homeDeliveryLabel
                        : order.serviceType == 'intercity'
                        ? l10n.homeIntercityLabel
                        : l10n.homeTaxiLabel,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  SummaryRow(
                    label: l10n.taxiAddressPickupLabel,
                    value: order.fromTitle,
                  ),
                  SummaryRow(
                    label: l10n.taxiAddressDestinationLabel,
                    value: order.toTitle,
                  ),
                  SummaryRow(
                    label: l10n.orderHistoryStatusLabel,
                    value: _statusLabel(l10n, order.status),
                  ),
                  SummaryRow(
                    label: l10n.taxiConfirmPriceLabel,
                    value: AppFormatters.formatCurrency(
                      context,
                      order.price,
                      currencyCode: order.currency,
                    ),
                    isHighlighted: true,
                  ),
                  SummaryRow(
                    label: l10n.taxiConfirmDistanceLabel,
                    value: l10n.taxiConfirmDistanceValue(
                      (order.distanceMeters / 1000).toStringAsFixed(1),
                    ),
                  ),
                  SummaryRow(
                    label: l10n.taxiConfirmDurationLabel,
                    value: l10n.taxiConfirmDurationValue(
                      (order.durationSeconds / 60).ceil(),
                    ),
                  ),
                  SummaryRow(
                    label: l10n.orderHistoryDateLabel,
                    value: AppFormatters.formatLongDateTime(
                      context,
                      order.createdAt,
                    ),
                  ),
                  if (order.executorRating != null)
                    SummaryRow(
                      label: l10n.orderHistoryRatingLabel,
                      value: '${order.executorRating}/5',
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'completed':
        return l10n.orderStatusCompleted;
      case 'cancelled_client':
        return l10n.orderStatusCancelled;
      default:
        return l10n.orderStatusInProgress;
    }
  }
}
