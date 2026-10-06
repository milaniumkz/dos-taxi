import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../cubit/taxi_order_cubit.dart';
import '../widgets/taxi_estimate_card.dart';
import 'taxi_payment_screen.dart';

class TaxiClassScreen extends StatelessWidget {
  const TaxiClassScreen({super.key});

  static const routePath = '/taxi/class';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocBuilder<TaxiOrderCubit, TaxiOrderState>(
      builder: (context, state) {
        final cubit = context.read<TaxiOrderCubit>();
        final isLoadingEstimates =
            state.stage == TaxiOrderStage.estimating && state.estimates.isEmpty;
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: Text(l10n.taxiClassTitle),
            leading: IconButton(
              onPressed: () => context.pop(),
              icon: const Icon(Icons.arrow_back_rounded),
            ),
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DosCard(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      children: [
                        _RouteLine(
                          icon: Icons.trip_origin_rounded,
                          label:
                              state.pickup?.displayTitle ??
                              l10n.taxiAddressPickupLabel,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _RouteLine(
                          icon: Icons.location_on_rounded,
                          label:
                              state.destination?.displayTitle ??
                              l10n.taxiAddressDestinationLabel,
                          highlighted: true,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    l10n.taxiClassEmpty,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Expanded(
                    child: isLoadingEstimates
                        ? const Center(child: CircularProgressIndicator())
                        : ListView.separated(
                            itemCount: state.estimates.length,
                            separatorBuilder: (context, _) =>
                                const SizedBox(height: AppSpacing.sm),
                            itemBuilder: (context, index) {
                              final estimate = state.estimates[index];
                              return TaxiEstimateCard(
                                estimate: estimate,
                                isSelected:
                                    state.selectedEstimate?.carClass ==
                                    estimate.carClass,
                                onTap: () =>
                                    cubit.selectCarClass(estimate.carClass),
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.selectedEstimate != null
                          ? () => context.push(TaxiPaymentScreen.routePath)
                          : null,
                      child: Text(l10n.taxiClassContinue),
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
}

class _RouteLine extends StatelessWidget {
  const _RouteLine({
    required this.icon,
    required this.label,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: highlighted ? AppColors.primary : AppColors.muted,
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}
