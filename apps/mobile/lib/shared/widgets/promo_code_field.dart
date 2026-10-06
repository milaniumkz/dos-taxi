import 'package:flutter/material.dart';

import '../../core/errors/error_message_localizer.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/utils/app_formatters.dart';
import 'dos_ui.dart';
import '../../features/taxi/presentation/widgets/summary_row.dart';

class PromoCodeField extends StatelessWidget {
  const PromoCodeField({
    required this.controller,
    required this.onChanged,
    required this.onApply,
    required this.isApplying,
    required this.isApplied,
    required this.price,
    required this.discountAmount,
    required this.currency,
    this.errorCode,
    this.enabled = true,
    super.key,
  });
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onApply;
  final bool isApplying;
  final bool isApplied;
  final bool enabled;
  final double? price;
  final double discountAmount;
  final String currency;
  final String? errorCode;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    String money(double value) =>
        AppFormatters.formatCurrency(context, value, currencyCode: currency);
    return DosCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            enabled: enabled && !isApplying,
            textCapitalization: TextCapitalization.characters,
            onChanged: onChanged,
            onSubmitted: (_) {
              FocusScope.of(context).unfocus();
              onApply();
            },
            decoration: InputDecoration(
              labelText: l10n.taxiPaymentPromoLabel,
              hintText: l10n.taxiPaymentPromoHint,
              suffixIcon: isApplying
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : isApplied
                  ? const Icon(Icons.check_circle_rounded, color: Colors.green)
                  : TextButton(
                      onPressed: enabled
                          ? () {
                              FocusScope.of(context).unfocus();
                              onApply();
                            }
                          : null,
                      child: Text(l10n.promoApplyAction),
                    ),
            ),
          ),
          if (errorCode != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                ErrorMessageLocalizer.resolve(l10n, errorCode),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (isApplied)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(l10n.promoApplied),
            ),
          if (price != null) ...[
            const SizedBox(height: 12),
            if (discountAmount > 0) ...[
              SummaryRow(
                label: l10n.promoOriginalPrice,
                value: money(price! + discountAmount),
              ),
              SummaryRow(
                label: l10n.promoDiscount,
                value: '−${money(discountAmount)}',
              ),
            ],
            SummaryRow(
              label: l10n.promoTotal,
              value: money(price!),
              isHighlighted: true,
            ),
          ],
        ],
      ),
    );
  }
}
