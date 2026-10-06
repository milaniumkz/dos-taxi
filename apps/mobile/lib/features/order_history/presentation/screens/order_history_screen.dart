import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../favorites/presentation/screens/favorites_screen.dart';
import '../../domain/entities/history_order.dart';
import '../cubit/order_history_cubit.dart';
import 'order_detail_screen.dart';

class OrderHistoryScreen extends StatelessWidget {
  const OrderHistoryScreen({super.key});

  static const routePath = '/history';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<OrderHistoryCubit, OrderHistoryState>(
      listener: (context, state) {
        if (state.errorMessage != null && state.errorMessage!.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                ErrorMessageLocalizer.resolve(l10n, state.errorMessage),
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        final cubit = context.read<OrderHistoryCubit>();
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: Text(l10n.historyTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        DosPill(
                          label: l10n.orderHistoryFilterAll,
                          selected: state.filter == OrderHistoryFilter.all,
                          onTap: () => cubit.setFilter(OrderHistoryFilter.all),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        DosPill(
                          label: l10n.orderHistoryFilterTaxi,
                          selected: state.filter == OrderHistoryFilter.taxi,
                          onTap: () => cubit.setFilter(OrderHistoryFilter.taxi),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        DosPill(
                          label: l10n.orderHistoryFilterDelivery,
                          selected: state.filter == OrderHistoryFilter.delivery,
                          onTap: () =>
                              cubit.setFilter(OrderHistoryFilter.delivery),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Expanded(
                    child: state.isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : state.visibleItems.isEmpty
                        ? Center(child: Text(l10n.orderHistoryEmpty))
                        : ListView.separated(
                            itemCount:
                                state.visibleItems.length +
                                (state.nextCursor != null ? 1 : 0),
                            separatorBuilder: (context, _) =>
                                const SizedBox(height: AppSpacing.sm),
                            itemBuilder: (context, index) {
                              if (index >= state.visibleItems.length) {
                                return OutlinedButton(
                                  onPressed: cubit.loadMore,
                                  child: state.isLoadingMore
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Text(l10n.orderHistoryLoadMore),
                                );
                              }

                              final item = state.visibleItems[index];
                              return _HistoryOrderCard(
                                order: item,
                                serviceLabel: item.serviceType == 'delivery'
                                    ? l10n.homeDeliveryLabel
                                    : item.serviceType == 'intercity'
                                    ? l10n.homeIntercityLabel
                                    : l10n.homeTaxiLabel,
                                statusLabel: _statusLabel(l10n, item.status),
                                formattedDate:
                                    AppFormatters.formatShortDateTime(
                                      context,
                                      item.createdAt,
                                    ),
                                formattedPrice: _formatPrice(item, context),
                                onTap: () => context.push(
                                  OrderDetailScreen.routePath,
                                  extra: item,
                                ),
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  DosBottomNav(
                    selectedIndex: 1,
                    items: [
                      DosBottomNavItem(
                        icon: Icons.home_rounded,
                        label: l10n.navMain,
                        onTap: () => context.go('/passenger/home'),
                      ),
                      DosBottomNavItem(
                        icon: Icons.receipt_long_rounded,
                        label: l10n.navHistory,
                        onTap: () {},
                      ),
                      DosBottomNavItem(
                        icon: Icons.favorite_rounded,
                        label: l10n.navFavorites,
                        onTap: () => context.go(FavoritesScreen.routePath),
                      ),
                      DosBottomNavItem(
                        icon: Icons.person_rounded,
                        label: l10n.navProfile,
                        onTap: () => context.go('/profile'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'completed':
        return l10n.orderStatusCompleted;
      case 'cancelled_client':
        return l10n.orderStatusCancelled;
      default:
        return l10n.orderStatusInProgress;
    }
  }

  String _formatPrice(HistoryOrder order, BuildContext context) {
    return AppFormatters.formatCurrency(
      context,
      order.price,
      currencyCode: order.currency,
    );
  }
}

class _HistoryOrderCard extends StatelessWidget {
  const _HistoryOrderCard({
    required this.order,
    required this.serviceLabel,
    required this.statusLabel,
    required this.formattedDate,
    required this.formattedPrice,
    required this.onTap,
  });

  final HistoryOrder order;
  final String serviceLabel;
  final String statusLabel;
  final String formattedDate;
  final String formattedPrice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: DosCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: order.serviceType == 'delivery'
                      ? AppColors.surfaceAlt
                      : AppColors.primary,
                  child: Icon(
                    order.serviceType == 'delivery'
                        ? Icons.local_shipping_rounded
                        : order.serviceType == 'intercity'
                        ? Icons.route_rounded
                        : Icons.local_taxi_rounded,
                    color: AppColors.text,
                    size: 19,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    serviceLabel,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Text(
                  formattedPrice,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(formattedDate, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: AppSpacing.sm),
            _PointRow(color: AppColors.success, label: order.fromTitle),
            const SizedBox(height: AppSpacing.xs),
            _PointRow(color: AppColors.primary, label: order.toTitle),
            const SizedBox(height: AppSpacing.sm),
            Text(
              statusLabel,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _PointRow extends StatelessWidget {
  const _PointRow({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.circle, size: 7, color: color),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
