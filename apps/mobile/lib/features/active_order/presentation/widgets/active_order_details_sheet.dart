import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../taxi/presentation/widgets/summary_row.dart';

class ActiveOrderDetailsSheet extends StatelessWidget {
  const ActiveOrderDetailsSheet({
    required this.scrollController,
    required this.statusLabel,
    required this.driverLabel,
    required this.tariffLabel,
    required this.carLabel,
    required this.fromLabel,
    required this.toLabel,
    required this.priceLabel,
    required this.phoneLabel,
    required this.changePaymentLabel,
    required this.executorName,
    required this.executorRating,
    required this.executorVehicleLabel,
    required this.tariffValue,
    required this.fromAddress,
    required this.toAddress,
    required this.priceValue,
    required this.executorPhoneMasked,
    required this.cancelLabel,
    required this.isCancelling,
    required this.onPay,
    required this.onCall,
    required this.onChat,
    required this.onCancel,
    super.key,
  });

  final ScrollController scrollController;
  final String statusLabel;
  final String driverLabel;
  final String tariffLabel;
  final String carLabel;
  final String fromLabel;
  final String toLabel;
  final String priceLabel;
  final String phoneLabel;
  final String changePaymentLabel;
  final String executorName;
  final String executorRating;
  final String executorVehicleLabel;
  final String tariffValue;
  final String fromAddress;
  final String toAddress;
  final String priceValue;
  final String executorPhoneMasked;
  final String cancelLabel;
  final bool isCancelling;
  final VoidCallback onPay;
  final VoidCallback? onCall;
  final VoidCallback onChat;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        AppSpacing.md,
      ),
      child: DosCard(
        padding: EdgeInsets.zero,
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Center(
              child: Container(
                width: 46,
                height: 5,
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            Row(
              children: [
                const DosAvatar(initials: 'A', radius: 24),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        executorName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        executorVehicleLabel,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    Text(
                      executorRating,
                      style: Theme.of(
                        context,
                      ).textTheme.labelLarge?.copyWith(color: AppColors.danger),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      Icons.star_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _RoundAction(
                    icon: Icons.call_rounded,
                    label: phoneLabel,
                    value: executorPhoneMasked,
                    onTap: onCall,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _RoundAction(
                    icon: Icons.chat_bubble_rounded,
                    label: driverLabel,
                    value: statusLabel,
                    onTap: onChat,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 12,
                ),
                child: Column(
                  children: [
                    SummaryRow(label: fromLabel, value: fromAddress),
                    SummaryRow(label: toLabel, value: toAddress),
                    SummaryRow(label: tariffLabel, value: tariffValue),
                    SummaryRow(label: carLabel, value: executorVehicleLabel),
                    SummaryRow(
                      label: priceLabel,
                      value: priceValue,
                      isHighlighted: true,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onPay,
                child: Text(changePaymentLabel),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: isCancelling ? null : onCancel,
                child: isCancelling
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(cancelLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundAction extends StatelessWidget {
  const _RoundAction({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceAlt,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            children: [
              CircleAvatar(
                radius: 17,
                backgroundColor: AppColors.surface,
                child: Icon(icon, size: 17, color: AppColors.text),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(fontSize: 11),
                    ),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(
                        context,
                      ).textTheme.labelLarge?.copyWith(fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
