import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../active_order/domain/entities/active_order_service_type.dart';
import '../../../active_order/domain/entities/active_order_session.dart';
import '../../../active_order/presentation/screens/active_order_screen.dart';
import '../../../taxi/presentation/widgets/summary_row.dart';
import '../../domain/enums/courier_vehicle_type.dart';
import '../cubit/delivery_order_cubit.dart';

class DeliveryConfirmScreen extends StatelessWidget {
  const DeliveryConfirmScreen({super.key});

  static const routePath = '/delivery/confirm';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<DeliveryOrderCubit, DeliveryOrderState>(
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
            state.fromAddress != null &&
            state.toAddress != null) {
          final etaSeconds =
              state.routeInfo?.durationSeconds ??
              ((state.selectedEstimate?.etaMinutes ?? 8) * 60);
          context.push(
            ActiveOrderScreen.routePath,
            extra: ActiveOrderSession(
              orderId: state.createdOrderId!,
              serviceType: ActiveOrderServiceType.delivery,
              fromAddress: state.fromAddress!,
              toAddress: state.toAddress!,
              routePoints: [
                state.fromAddress!.location,
                state.toAddress!.location,
              ],
              price: state.selectedEstimate?.price ?? 0,
              currency: state.selectedEstimate?.currency ?? 'KZT',
              initialEtaSeconds: etaSeconds,
              vehicleLabel: _vehicleLabel(
                l10n,
                state.selectedEstimate?.vehicleType,
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        final cubit = context.read<DeliveryOrderCubit>();
        final isSubmitting =
            state.stage == DeliveryOrderStage.searching ||
            state.createdOrderId != null;
        return Scaffold(
          appBar: AppBar(title: Text(l10n.deliveryConfirmTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    l10n.deliveryConfirmSummaryTitle,
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  SummaryRow(
                                    label: l10n.deliveryAddressFromLabel,
                                    value:
                                        state
                                                .fromAddress
                                                ?.displayTitle
                                                .isNotEmpty ==
                                            true
                                        ? state.fromAddress!.displayTitle
                                        : l10n.commonCurrentLocation,
                                  ),
                                  SummaryRow(
                                    label: l10n.deliveryAddressToLabel,
                                    value: state.toAddress?.displayTitle ?? '',
                                  ),
                                  SummaryRow(
                                    label: l10n.deliveryConfirmPackageLabel,
                                    value: state.packageDescription,
                                  ),
                                  SummaryRow(
                                    label: l10n.deliveryConfirmRecipientLabel,
                                    value:
                                        '${state.contactName} · ${AppFormatters.formatKazakhstanPhone(state.contactPhone)}',
                                  ),
                                  SummaryRow(
                                    label: l10n.deliveryVehicleTitle,
                                    value: _vehicleLabel(
                                      l10n,
                                      state.selectedEstimate?.vehicleType,
                                    ),
                                  ),
                                  SummaryRow(
                                    label: l10n.deliveryConfirmPaymentLabel,
                                    value: _paymentLabel(
                                      l10n,
                                      state.paymentMethod,
                                    ),
                                  ),
                                  if (state.promoCode.isNotEmpty)
                                    SummaryRow(
                                      label: l10n.deliveryConfirmPromoLabel,
                                      value: state.promoCode,
                                    ),
                                  if (state.routeInfo != null) ...[
                                    SummaryRow(
                                      label: l10n.deliveryConfirmDistanceLabel,
                                      value: l10n.deliveryConfirmDistanceValue(
                                        (state.routeInfo!.distanceMeters / 1000)
                                            .toStringAsFixed(1),
                                      ),
                                    ),
                                    SummaryRow(
                                      label: l10n.deliveryConfirmDurationLabel,
                                      value: l10n.deliveryConfirmDurationValue(
                                        (state.routeInfo!.durationSeconds / 60)
                                            .ceil(),
                                      ),
                                    ),
                                  ],
                                  SummaryRow(
                                    label: l10n.deliveryConfirmPriceLabel,
                                    value: _formattedPrice(context, state),
                                    isHighlighted: true,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          if (isSubmitting)
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(AppSpacing.lg),
                                child: Column(
                                  children: [
                                    const CircularProgressIndicator(),
                                    const SizedBox(height: AppSpacing.md),
                                    Text(
                                      l10n.deliveryConfirmSearchingTitle,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleLarge,
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    Text(
                                      l10n.deliveryConfirmSearchingSubtitle,
                                      textAlign: TextAlign.center,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodyMedium,
                                    ),
                                    if (state.createdOrderId != null) ...[
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        l10n.deliveryConfirmOrderId(
                                          state.createdOrderId!,
                                        ),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodyLarge,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSubmitting ? null : cubit.submitOrder,
                      child: isSubmitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                              ),
                            )
                          : Text(l10n.deliveryConfirmOrderAction),
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

  String _formattedPrice(BuildContext context, DeliveryOrderState state) {
    final estimate = state.selectedEstimate;
    if (estimate == null) {
      return '';
    }

    return AppFormatters.formatCurrency(
      context,
      estimate.price,
      currencyCode: estimate.currency,
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

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    if (codeOrMessage == null || codeOrMessage.trim().isEmpty) return null;
    final configured = ErrorMessageLocalizer.configured(l10n, codeOrMessage);
    if (configured != null) return configured;
    switch (codeOrMessage) {
      case 'DELIVERY_ORDER_INCOMPLETE':
        return l10n.deliveryErrorCompleteOrder;
      case 'DELIVERY_VEHICLE_REQUIRED':
        return l10n.deliveryErrorVehicle;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}
