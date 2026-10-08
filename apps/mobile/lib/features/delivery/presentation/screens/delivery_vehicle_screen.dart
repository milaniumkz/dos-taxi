import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_spacing.dart';
import '../cubit/delivery_order_cubit.dart';
import '../widgets/delivery_estimate_card.dart';
import 'delivery_payment_screen.dart';

class DeliveryVehicleScreen extends StatelessWidget {
  const DeliveryVehicleScreen({super.key});

  static const routePath = '/delivery/vehicle';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<DeliveryOrderCubit, DeliveryOrderState>(
      listener: (context, state) {
        final message = _resolveError(l10n, state.errorMessage);
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      },
      builder: (context, state) {
        final cubit = context.read<DeliveryOrderCubit>();
        return Scaffold(
          appBar: AppBar(title: Text(l10n.deliveryVehicleTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.deliveryVehicleHint,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Expanded(
                    child: ListView.separated(
                      itemCount: state.estimates.length,
                      separatorBuilder: (context, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final estimate = state.estimates[index];
                        return DeliveryEstimateCard(
                          estimate: estimate,
                          isSelected:
                              state.selectedEstimate?.vehicleType ==
                              estimate.vehicleType,
                          onTap: () =>
                              cubit.selectVehicle(estimate.vehicleType),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        if (cubit.preparePayment()) {
                          context.push(DeliveryPaymentScreen.routePath);
                        }
                      },
                      child: Text(l10n.deliveryVehicleContinue),
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

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    if (codeOrMessage == null || codeOrMessage.trim().isEmpty) return null;
    final configured = ErrorMessageLocalizer.configured(l10n, codeOrMessage);
    if (configured != null) return configured;
    switch (codeOrMessage) {
      case 'DELIVERY_VEHICLE_REQUIRED':
        return l10n.deliveryErrorVehicle;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}
