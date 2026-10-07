import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../../shared/widgets/promo_code_field.dart';
import '../../../active_order/domain/entities/active_order_service_type.dart';
import '../../../active_order/domain/entities/active_order_session.dart';
import '../../../active_order/presentation/screens/active_order_screen.dart';
import '../cubit/taxi_order_cubit.dart';

class TaxiPaymentScreen extends StatefulWidget {
  const TaxiPaymentScreen({super.key});

  static const routePath = '/taxi/payment';

  @override
  State<TaxiPaymentScreen> createState() => _TaxiPaymentScreenState();
}

class _TaxiPaymentScreenState extends State<TaxiPaymentScreen> {
  final TextEditingController _promoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _promoController.text = context.read<TaxiOrderCubit>().state.promoCode;
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<TaxiOrderCubit, TaxiOrderState>(
      listenWhen: (previous, current) =>
          previous.errorMessage != current.errorMessage ||
          previous.createdOrderId != current.createdOrderId,
      listener: (context, state) {
        final message = _resolveError(l10n, state.errorMessage);
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }

        if (state.createdOrderId != null &&
            state.pickup != null &&
            state.destination != null) {
          final etaSeconds =
              state.route?.durationSeconds ??
              ((state.selectedEstimate?.etaMinutes ?? 5) * 60);
          context.push(
            ActiveOrderScreen.routePath,
            extra: ActiveOrderSession(
              orderId: state.createdOrderId!,
              serviceType: state.serviceType == 'intercity'
                  ? ActiveOrderServiceType.intercity
                  : ActiveOrderServiceType.taxi,
              fromAddress: state.pickup!,
              toAddress: state.destination!,
              routePoints: [
                state.pickup!.location,
                state.destination!.location,
              ],
              price: state.selectedEstimate?.price ?? 0,
              currency: state.selectedEstimate?.currency ?? 'KZT',
              initialEtaSeconds: etaSeconds,
              vehicleLabel: _taxiVehicleLabel(l10n, state),
            ),
          );
        }
      },
      builder: (context, state) {
        final cubit = context.read<TaxiOrderCubit>();
        final isSubmitting =
            state.stage == TaxiOrderStage.searching ||
            state.createdOrderId != null;
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: Text(l10n.taxiPaymentTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      children: [
                        _PaymentRow(
                          icon: Icons.payments_rounded,
                          title: l10n.taxiPaymentMethodCash,
                          selected:
                              state.paymentMethod == TaxiPaymentMethod.cash,
                          onTap: () =>
                              cubit.setPaymentMethod(TaxiPaymentMethod.cash),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _PaymentRow(
                          icon: Icons.account_balance_wallet_rounded,
                          title: l10n.paymentMethodKaspiTransfer,
                          subtitle: l10n.paymentMethodTransferSubtitle,
                          selected:
                              state.paymentMethod == TaxiPaymentMethod.kaspi,
                          brandColor: AppColors.primary,
                          onTap: () =>
                              cubit.setPaymentMethod(TaxiPaymentMethod.kaspi),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _PaymentRow(
                          icon: Icons.account_balance_rounded,
                          title: l10n.paymentMethodHalykTransfer,
                          subtitle: l10n.paymentMethodTransferSubtitle,
                          selected:
                              state.paymentMethod == TaxiPaymentMethod.halyk,
                          brandColor: AppColors.primary,
                          onTap: () =>
                              cubit.setPaymentMethod(TaxiPaymentMethod.halyk),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        PromoCodeField(
                          controller: _promoController,
                          onChanged: cubit.setPromoCode,
                          onApply: cubit.applyPromoCode,
                          isApplying: state.isApplyingPromo,
                          isApplied: state.appliedPromoCode.isNotEmpty,
                          errorCode: state.promoErrorCode,
                          price: state.selectedEstimate?.price,
                          discountAmount:
                              state.selectedEstimate?.discountAmount ?? 0,
                          currency: state.selectedEstimate?.currency ?? 'KZT',
                          enabled: !state.isApplyingPromo && !isSubmitting,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed:
                          state.selectedEstimate == null ||
                              isSubmitting ||
                              state.isApplyingPromo
                          ? null
                          : cubit.submitOrder,
                      child: isSubmitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(l10n.taxiConfirmOrderAction),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _taxiVehicleLabel(AppLocalizations l10n, TaxiOrderState state) {
    final selectedEstimate = state.selectedEstimate;
    if (selectedEstimate == null) {
      return l10n.taxiClassEconomy;
    }

    switch (selectedEstimate.carClass) {
      case 'intercity':
        return l10n.homeIntercityLabel;
      case 'comfort':
        return l10n.taxiClassComfort;
      case 'comfort_plus':
        return l10n.taxiClassComfortPlus;
      case 'together':
        return l10n.taxiClassTogether;
      case 'child':
        return l10n.taxiClassChild;
      case 'business':
        return l10n.taxiClassBusiness;
      default:
        return l10n.taxiClassEconomy;
    }
  }

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    switch (codeOrMessage) {
      case 'TAXI_CLASS_NOT_SELECTED':
        return l10n.taxiErrorSelectClass;
      case 'TAXI_ORDER_INCOMPLETE':
        return l10n.taxiErrorCompleteOrder;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}

class _PaymentRow extends StatelessWidget {
  const _PaymentRow({
    required this.icon,
    required this.title,
    required this.selected,
    required this.onTap,
    this.subtitle,
    this.brandColor,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool selected;
  final Color? brandColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: DosCard(
        padding: EdgeInsets.zero,
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          leading: CircleAvatar(
            backgroundColor: brandColor ?? AppColors.surfaceAlt,
            child: Icon(
              icon,
              color: brandColor == null ? AppColors.text : AppColors.surface,
            ),
          ),
          title: Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontSize: 14),
          ),
          subtitle: subtitle == null ? null : Text(subtitle!),
          trailing: Icon(
            selected
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            color: selected ? AppColors.primary : AppColors.muted,
          ),
        ),
      ),
    );
  }
}
