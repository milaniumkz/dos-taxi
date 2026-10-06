import 'package:flutter/material.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../domain/entities/taxi_estimate.dart';

class TaxiEstimateCard extends StatelessWidget {
  const TaxiEstimateCard({
    required this.estimate,
    required this.isSelected,
    required this.onTap,
    super.key,
  });

  final TaxiEstimate estimate;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: 12,
        ),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0E000000),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.text : AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                Icons.local_taxi_rounded,
                color: isSelected ? AppColors.primary : AppColors.text,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _titleForClass(l10n, estimate.carClass),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    l10n.taxiClassEtaMinutes(estimate.etaMinutes),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: isSelected
                          ? AppColors.text.withValues(alpha: 0.72)
                          : AppColors.muted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  l10n.taxiClassMinimumPriceLabel,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: isSelected
                        ? AppColors.text.withValues(alpha: 0.68)
                        : AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  AppFormatters.formatCurrency(
                    context,
                    estimate.price,
                    currencyCode: estimate.currency,
                  ),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _titleForClass(AppLocalizations l10n, String carClass) {
    switch (carClass) {
      case 'intercity':
        return l10n.homeIntercityLabel;
      case 'comfort':
        return l10n.taxiClassComfort;
      case 'comfort_plus':
        return l10n.taxiClassComfortPlus;
      case 'business':
        return l10n.taxiClassBusiness;
      default:
        return l10n.taxiClassEconomy;
    }
  }
}
