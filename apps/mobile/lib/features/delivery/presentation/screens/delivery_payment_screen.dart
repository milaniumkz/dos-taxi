import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../shared/widgets/promo_code_field.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../taxi/presentation/widgets/payment_method_card.dart';
import '../../../taxi/presentation/widgets/summary_row.dart';
import '../../domain/enums/courier_vehicle_type.dart';
import '../cubit/delivery_order_cubit.dart';
import 'delivery_confirm_screen.dart';

class DeliveryPaymentScreen extends StatefulWidget {
  const DeliveryPaymentScreen({super.key});

  static const routePath = '/delivery/payment';

  @override
  State<DeliveryPaymentScreen> createState() => _DeliveryPaymentScreenState();
}

class _DeliveryPaymentScreenState extends State<DeliveryPaymentScreen> {
  final TextEditingController _promoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _promoController.text = context.read<DeliveryOrderCubit>().state.promoCode;
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocBuilder<DeliveryOrderCubit, DeliveryOrderState>(
      builder: (context, state) {
        final cubit = context.read<DeliveryOrderCubit>();
        return Scaffold(
          appBar: AppBar(title: Text(l10n.deliveryPaymentTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      children: [
                        PaymentMethodCard(
                          title: l10n.deliveryPaymentMethodCash,
                          icon: Icons.payments_rounded,
                          isSelected:
                              state.paymentMethod == DeliveryPaymentMethod.cash,
                          onTap: () => cubit.setPaymentMethod(
                            DeliveryPaymentMethod.cash,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        PaymentMethodCard(
                          title: l10n.paymentMethodKaspiTransfer,
                          subtitle: l10n.paymentMethodTransferSubtitle,
                          icon: Icons.account_balance_wallet_rounded,
                          isSelected:
                              state.paymentMethod ==
                              DeliveryPaymentMethod.kaspi,
                          onTap: () => cubit.setPaymentMethod(
                            DeliveryPaymentMethod.kaspi,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        PaymentMethodCard(
                          title: l10n.paymentMethodHalykTransfer,
                          subtitle: l10n.paymentMethodTransferSubtitle,
                          icon: Icons.account_balance_rounded,
                          isSelected:
                              state.paymentMethod ==
                              DeliveryPaymentMethod.halyk,
                          onTap: () => cubit.setPaymentMethod(
                            DeliveryPaymentMethod.halyk,
                          ),
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
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l10n.deliveryPaymentSummaryTitle,
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                SummaryRow(
                                  label: l10n.deliveryVehicleTitle,
                                  value: _vehicleLabel(
                                    l10n,
                                    state.selectedEstimate?.vehicleType,
                                  ),
                                ),
                                SummaryRow(
                                  label: l10n.deliveryPaymentTitle,
                                  value: _paymentLabel(
                                    l10n,
                                    state.paymentMethod,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isApplyingPromo
                          ? null
                          : () async {
                              if (state.promoCode.isNotEmpty &&
                                  state.appliedPromoCode != state.promoCode &&
                                  !await cubit.applyPromoCode()) {
                                return;
                              }
                              if (context.mounted &&
                                  cubit.prepareConfirmation()) {
                                context.push(DeliveryConfirmScreen.routePath);
                              }
                            },
                      child: Text(l10n.deliveryPaymentContinue),
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

  String _paymentLabel(
    AppLocalizations l10n,
    DeliveryPaymentMethod paymentMethod,
  ) {
    switch (paymentMethod) {
      case DeliveryPaymentMethod.cash:
        return l10n.deliveryPaymentMethodCash;
      case DeliveryPaymentMethod.kaspi:
        return l10n.paymentMethodKaspiTransfer;
      case DeliveryPaymentMethod.halyk:
        return l10n.paymentMethodHalykTransfer;
    }
  }

  String _vehicleLabel(AppLocalizations l10n, CourierVehicleType? vehicleType) {
    switch (vehicleType) {
      case CourierVehicleType.moped:
        return l10n.deliveryVehicleMoped;
      case CourierVehicleType.scooter:
        return l10n.deliveryVehicleScooter;
      case CourierVehicleType.car:
        return l10n.deliveryVehicleCar;
      case CourierVehicleType.bicycle:
      case null:
        return l10n.deliveryVehicleBicycle;
    }
  }
}
