import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../cubit/home_cubit.dart';

class ServiceSwitcher extends StatelessWidget {
  const ServiceSwitcher({
    required this.selectedService,
    required this.onChanged,
    required this.taxiLabel,
    required this.deliveryLabel,
    super.key,
  });

  final HomeServiceType selectedService;
  final ValueChanged<HomeServiceType> onChanged;
  final String taxiLabel;
  final String deliveryLabel;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: DosPill(
            label: taxiLabel,
            icon: Icons.local_taxi_rounded,
            selected: selectedService == HomeServiceType.taxi,
            onTap: () => onChanged(HomeServiceType.taxi),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: DosPill(
            label: deliveryLabel,
            icon: Icons.local_shipping_rounded,
            selected: selectedService == HomeServiceType.delivery,
            onTap: () => onChanged(HomeServiceType.delivery),
          ),
        ),
      ],
    );
  }
}
