import 'package:flutter/material.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../domain/entities/delivery_estimate.dart';
import '../../domain/enums/courier_vehicle_type.dart';

class DeliveryEstimateCard extends StatelessWidget {
  const DeliveryEstimateCard({
    required this.estimate,
    required this.isSelected,
    required this.onTap,
    super.key,
  });

  final DeliveryEstimate estimate;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.18) : null,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected ? AppColors.primaryDark : const Color(0x14000000),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(_iconForVehicle(estimate.vehicleType)),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _titleForVehicle(l10n, estimate.vehicleType),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    l10n.deliveryVehicleEtaMinutes(estimate.etaMinutes),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Text(
              AppFormatters.formatCurrency(
                context,
                estimate.price,
                currencyCode: estimate.currency,
              ),
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForVehicle(CourierVehicleType vehicleType) {
    switch (vehicleType) {
      case CourierVehicleType.bicycle:
        return Icons.pedal_bike_rounded;
      case CourierVehicleType.moped:
        return Icons.two_wheeler_rounded;
      case CourierVehicleType.scooter:
        return Icons.electric_scooter_rounded;
      case CourierVehicleType.car:
        return Icons.directions_car_filled_rounded;
    }
  }

  String _titleForVehicle(
    AppLocalizations l10n,
    CourierVehicleType vehicleType,
  ) {
    switch (vehicleType) {
      case CourierVehicleType.bicycle:
        return l10n.deliveryVehicleBicycle;
      case CourierVehicleType.moped:
        return l10n.deliveryVehicleMoped;
      case CourierVehicleType.scooter:
        return l10n.deliveryVehicleScooter;
      case CourierVehicleType.car:
        return l10n.deliveryVehicleCar;
    }
  }
}
