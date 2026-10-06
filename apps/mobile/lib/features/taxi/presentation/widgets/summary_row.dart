import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class SummaryRow extends StatelessWidget {
  const SummaryRow({
    required this.label,
    required this.value,
    this.isHighlighted = false,
    this.dark = false,
    super.key,
  });

  final String label;
  final String value;
  final bool isHighlighted;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final valueStyle = isHighlighted
        ? Theme.of(context).textTheme.titleLarge?.copyWith(
            color: dark ? AppColors.primary : AppColors.text,
          )
        : Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: dark ? AppColors.darkText : AppColors.text,
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: dark ? AppColors.darkMuted : AppColors.muted,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Flexible(
            child: Text(value, textAlign: TextAlign.right, style: valueStyle),
          ),
        ],
      ),
    );
  }
}
