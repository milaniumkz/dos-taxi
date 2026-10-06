import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../active_order/presentation/screens/active_order_screen.dart';
import '../../../delivery/presentation/cubit/delivery_order_cubit.dart';
import '../../../delivery/presentation/screens/delivery_address_screen.dart';
import '../../../favorites/presentation/screens/favorites_screen.dart';
import '../../../order_history/presentation/screens/order_history_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';
import '../../../taxi/presentation/cubit/taxi_order_cubit.dart';
import '../../../taxi/presentation/screens/taxi_class_screen.dart';
import '../cubit/home_cubit.dart';
import '../../domain/entities/address_suggestion.dart';
import '../widgets/address_search_bar.dart';
import '../widgets/map_widget.dart';

class PassengerHomePlaceholderScreen extends StatefulWidget {
  const PassengerHomePlaceholderScreen({super.key});

  static const routePath = '/passenger/home';

  @override
  State<PassengerHomePlaceholderScreen> createState() =>
      _PassengerHomePlaceholderScreenState();
}

class _PassengerHomePlaceholderScreenState
    extends State<PassengerHomePlaceholderScreen> {
  final TextEditingController _destinationController = TextEditingController();

  @override
  void dispose() {
    _destinationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocProvider<HomeCubit>(
      create: (_) => serviceLocator<HomeCubit>()..initialize(),
      child: BlocConsumer<HomeCubit, HomeState>(
        listener: (context, state) {
          if (state.restoredActiveOrderSession != null) {
            final session = state.restoredActiveOrderSession!;
            context.read<HomeCubit>().consumeRestoredActiveOrder();
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (context.mounted) {
                context.go(ActiveOrderScreen.routePath, extra: session);
              }
            });
            return;
          }

          final selectedAddressLabel = state.selectedAddress?.displayTitle;
          if (selectedAddressLabel != null &&
              _destinationController.text != selectedAddressLabel) {
            _destinationController.value = TextEditingValue(
              text: selectedAddressLabel,
              selection: TextSelection.collapsed(
                offset: selectedAddressLabel.length,
              ),
            );
          }

          if (state.errorMessage != null && state.errorMessage!.isNotEmpty) {
            final message = _resolveHomeError(l10n, state.errorMessage!);
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text(message)));
          }
        },
        builder: (context, state) {
          final cubit = context.read<HomeCubit>();
          return Scaffold(
            extendBody: true,
            body: Stack(
              children: [
                Positioned.fill(
                  child: MapWidget(
                    center: state.mapCenter,
                    recenterRequestId: state.recenterRequestId,
                    currentLocation: state.currentLocation,
                    nearbyExecutors: state.nearbyExecutors,
                    routePoints: state.routePoints,
                    selectedLocation: state.selectedAddress?.location,
                    isLoading: state.isResolvingMapAddress,
                    onTap: cubit.selectDestinationFromMap,
                  ),
                ),
                if (state.currentAddress == null &&
                    state.isResolvingCurrentLocation)
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: const BoxDecoration(color: Colors.white),
                      child: SafeArea(
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.xl),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircularProgressIndicator(),
                                const SizedBox(height: AppSpacing.md),
                                Text(
                                  l10n.homeResolvingCurrentAddress,
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      children: [
                        const Spacer(),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FloatingActionButton.small(
                            heroTag: 'passenger-location',
                            backgroundColor: AppColors.surface,
                            foregroundColor: AppColors.text,
                            onPressed: state.isResolvingCurrentLocation
                                ? null
                                : cubit.recenterToCurrentPosition,
                            child: state.isResolvingCurrentLocation
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.my_location_rounded),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _PassengerOrderPanel(
                          state: state,
                          destinationController: _destinationController,
                          onServiceChanged: cubit.setService,
                          onDestinationChanged: cubit.onSearchQueryChanged,
                          onDestinationSelected: cubit.selectAddress,
                          onOrder: () => _startOrder(context, state),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        DosBottomNav(
                          selectedIndex: 0,
                          items: [
                            DosBottomNavItem(
                              icon: Icons.home_rounded,
                              label: l10n.navMain,
                              onTap: () {},
                            ),
                            DosBottomNavItem(
                              icon: Icons.receipt_long_rounded,
                              label: l10n.navHistory,
                              onTap: () =>
                                  context.push(OrderHistoryScreen.routePath),
                            ),
                            DosBottomNavItem(
                              icon: Icons.favorite_rounded,
                              label: l10n.navFavorites,
                              onTap: () =>
                                  context.push(FavoritesScreen.routePath),
                            ),
                            DosBottomNavItem(
                              icon: Icons.person_rounded,
                              label: l10n.navProfile,
                              onTap: () =>
                                  context.push(ProfileScreen.routePath),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _startOrder(BuildContext context, HomeState state) async {
    if (state.currentAddress == null ||
        state.currentAddress!.displayTitle.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.homeLocationUnavailable),
        ),
      );
      return;
    }

    final currentAddress = state.currentAddress!;

    if (state.selectedService == HomeServiceType.delivery) {
      await serviceLocator<DeliveryOrderCubit>().startNewOrder(
        initialFromAddress: currentAddress,
        initialToAddress: state.selectedAddress,
      );
      if (context.mounted) {
        context.push(DeliveryAddressScreen.routePath);
      }
      return;
    }

    if (state.selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.taxiErrorCompleteOrder),
        ),
      );
      return;
    }

    unawaited(
      serviceLocator<TaxiOrderCubit>().startNewOrder(
        initialPickup: currentAddress,
        initialDestination: state.selectedAddress,
        serviceType: state.selectedService.apiValue,
      ),
    );
    if (context.mounted) {
      context.push(TaxiClassScreen.routePath);
    }
  }

  String _resolveHomeError(AppLocalizations l10n, String codeOrMessage) {
    switch (codeOrMessage) {
      case 'HOME_LOCATION_SERVICE_DISABLED':
        return l10n.homeLocationServiceDisabled;
      case 'HOME_LOCATION_PERMISSION_DENIED':
        return l10n.homeLocationPermissionDenied;
      case 'HOME_LOCATION_UNAVAILABLE':
        return l10n.homeLocationUnavailable;
      case 'HOME_REVERSE_GEOCODE_FAILED':
        return l10n.homeReverseGeocodeFailed;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}

class _PassengerOrderPanel extends StatelessWidget {
  const _PassengerOrderPanel({
    required this.state,
    required this.destinationController,
    required this.onServiceChanged,
    required this.onDestinationChanged,
    required this.onDestinationSelected,
    required this.onOrder,
  });

  final HomeState state;
  final TextEditingController destinationController;
  final ValueChanged<HomeServiceType> onServiceChanged;
  final ValueChanged<String> onDestinationChanged;
  final ValueChanged<AddressSuggestion> onDestinationSelected;
  final VoidCallback onOrder;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pickup = state.currentAddress?.displayTitle.isNotEmpty == true
        ? state.currentAddress!.displayTitle
        : state.isResolvingCurrentLocation
        ? l10n.homeResolvingCurrentAddress
        : l10n.commonCurrentLocation;
    final showSearchResults =
        state.searchResults.isNotEmpty ||
        state.isSearching ||
        (state.query.isNotEmpty &&
            state.selectedAddress == null &&
            !state.isResolvingMapAddress);

    return DosCard(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: _ServiceTile(
                  icon: Icons.local_taxi_rounded,
                  label: l10n.homeTaxiLabel,
                  selected: state.selectedService == HomeServiceType.taxi,
                  onTap: () => onServiceChanged(HomeServiceType.taxi),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _ServiceTile(
                  icon: Icons.local_shipping_rounded,
                  label: l10n.homeDeliveryLabel,
                  selected: state.selectedService == HomeServiceType.delivery,
                  onTap: () => onServiceChanged(HomeServiceType.delivery),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _ServiceTile(
                  icon: Icons.route_rounded,
                  label: l10n.homeIntercityLabel,
                  selected: state.selectedService == HomeServiceType.intercity,
                  onTap: () => onServiceChanged(HomeServiceType.intercity),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _RouteRow(
            icon: Icons.my_location_rounded,
            label: pickup,
            isPickup: true,
          ),
          const SizedBox(height: 6),
          _DestinationSearchField(
            controller: destinationController,
            hintText: state.isResolvingMapAddress
                ? l10n.homeResolvingCurrentAddress
                : l10n.homeSearchPlaceholder,
            onChanged: onDestinationChanged,
          ),
          if (showSearchResults) ...[
            const SizedBox(height: 6),
            _DestinationSearchResults(
              state: state,
              onSelected: onDestinationSelected,
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: onOrder,
              child: Text(
                state.selectedService == HomeServiceType.delivery
                    ? l10n.deliveryConfirmOrderAction
                    : l10n.homeOrderAction,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppColors.text, size: 14),
            const SizedBox(width: 3),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontSize: 10,
                  height: 1,
                  color: onTap == null ? AppColors.muted : AppColors.text,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DestinationSearchField extends StatelessWidget {
  const _DestinationSearchField({
    required this.controller,
    required this.hintText,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String hintText;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(15),
      ),
      child: AddressSearchBar(
        controller: controller,
        hintText: hintText,
        onChanged: onChanged,
      ),
    );
  }
}

class _DestinationSearchResults extends StatelessWidget {
  const _DestinationSearchResults({
    required this.state,
    required this.onSelected,
  });

  final HomeState state;
  final ValueChanged<AddressSuggestion> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 168),
        child: state.isSearching
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: CircularProgressIndicator(),
                ),
              )
            : state.searchResults.isEmpty
            ? ListTile(
                dense: true,
                leading: const Icon(
                  Icons.search_off_rounded,
                  color: AppColors.muted,
                ),
                title: Text(l10n.addressPickerAddressNotFound),
                subtitle: Text(l10n.addressPickerDestinationMapHint),
              )
            : ListView.separated(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: state.searchResults.length,
                separatorBuilder: (context, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final suggestion = state.searchResults[index];
                  return ListTile(
                    dense: true,
                    leading: const Icon(
                      Icons.location_on_rounded,
                      color: AppColors.primary,
                    ),
                    title: Text(
                      suggestion.displayTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      suggestion.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () {
                      FocusScope.of(context).unfocus();
                      onSelected(suggestion);
                    },
                  );
                },
              ),
      ),
    );
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({
    required this.icon,
    required this.label,
    required this.isPickup,
  });

  final IconData icon;
  final String label;
  final bool isPickup;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Icon(
              icon,
              size: 16,
              color: isPickup ? AppColors.text : AppColors.primary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            Icon(
              isPickup
                  ? Icons.keyboard_arrow_down_rounded
                  : Icons.arrow_forward_rounded,
              color: AppColors.muted,
            ),
          ],
        ),
      ),
    );
  }
}
