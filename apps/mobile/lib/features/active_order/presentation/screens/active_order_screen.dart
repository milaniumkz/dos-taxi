import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../home/presentation/screens/passenger_home_placeholder_screen.dart';
import '../../../order_chat/presentation/screens/order_chat_screen.dart';
import '../cubit/active_order_cubit.dart';
import '../widgets/active_order_details_sheet.dart';
import '../widgets/active_order_map.dart';
import 'rating_screen.dart';

class ActiveOrderScreen extends StatelessWidget {
  const ActiveOrderScreen({super.key});

  static const routePath = '/active-order';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<ActiveOrderCubit, ActiveOrderState>(
      listenWhen: (previous, current) =>
          previous.errorMessage != current.errorMessage ||
          previous.orderStatus != current.orderStatus ||
          (!previous.shouldOpenRating && current.shouldOpenRating),
      listener: (context, state) {
        final message = _resolveError(l10n, state.errorMessage);
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }

        final statusMessage = _statusNotificationLabel(l10n, state.orderStatus);
        if (statusMessage != null) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(statusMessage)));
        }

        if (_isCancelled(state.orderStatus)) {
          context.go(PassengerHomePlaceholderScreen.routePath);
          return;
        }

        if (state.shouldOpenRating) {
          context.read<ActiveOrderCubit>().markRatingOpened();
          context.push(RatingScreen.routePath, extra: state.session.orderId);
        }
      },
      builder: (context, state) {
        return Scaffold(
          extendBodyBehindAppBar: true,
          body: Stack(
            children: [
              Positioned.fill(
                child: ActiveOrderMap(
                  session: state.session,
                  executorLocation: state.executorLocation,
                ),
              ),
              Positioned(
                top: AppSpacing.md,
                left: AppSpacing.md,
                right: AppSpacing.md,
                child: SafeArea(
                  bottom: false,
                  child: Row(
                    children: [
                      const CircleAvatar(
                        radius: 22,
                        backgroundColor: AppColors.surface,
                        child: Icon(Icons.menu_rounded, color: AppColors.text),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: DosCard(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          radius: 20,
                          child: Row(
                            children: [
                              if (state.isConnecting) ...[
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                              ],
                              Expanded(
                                child: Text(
                                  _statusLabel(l10n, state.orderStatus),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              DraggableScrollableSheet(
                initialChildSize: 0.32,
                minChildSize: 0.18,
                maxChildSize: 0.78,
                snap: true,
                snapSizes: const [0.18, 0.32, 0.78],
                builder: (context, scrollController) {
                  return SafeArea(
                    top: false,
                    child: ActiveOrderDetailsSheet(
                      scrollController: scrollController,
                      statusLabel: _statusLabel(l10n, state.orderStatus),
                      driverLabel: l10n.activeOrderDetailDriver,
                      tariffLabel: l10n.activeOrderDetailTariff,
                      carLabel: l10n.activeOrderDetailCar,
                      fromLabel: l10n.activeOrderDetailFrom,
                      toLabel: l10n.activeOrderDetailTo,
                      priceLabel: l10n.activeOrderDetailPrice,
                      phoneLabel: l10n.activeOrderDetailPhone,
                      changePaymentLabel: l10n.activeOrderChangePaymentAction,
                      executorName:
                          state.executorName ?? l10n.activeOrderExecutorPending,
                      executorRating: state.executorRating != null
                          ? AppFormatters.formatDecimal(
                              context,
                              state.executorRating!,
                              decimalDigits: 1,
                            )
                          : '—',
                      executorVehicleLabel:
                          _localizedVehicleLabel(
                            l10n,
                            state.executorVehicleLabel ??
                                state.session.executorVehicleLabel,
                          ) ??
                          l10n.activeOrderVehicleNotAssigned,
                      tariffValue: _localizedTariffLabel(
                        l10n,
                        state.session.vehicleLabel,
                      ),
                      fromAddress: state.session.fromAddress.displayTitle,
                      toAddress: state.session.toAddress.displayTitle,
                      priceValue: _paymentAmount(context, state),
                      executorPhoneMasked: state.executorPhoneMasked ?? '—',
                      cancelLabel: l10n.activeOrderCancelAction,
                      isCancelling: state.isCancelling,
                      onPay: () => ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(l10n.activeOrderChangePaymentAction),
                        ),
                      ),
                      onCall: state.executorPhone == null
                          ? null
                          : () => _callPhone(context, state.executorPhone!),
                      onChat: () => context.push(
                        OrderChatScreen.routePath,
                        extra: OrderChatArgs(
                          orderId: state.session.orderId,
                          isExecutor: false,
                          isClosed: _isChatClosed(state.orderStatus),
                        ),
                      ),
                      onCancel: () => _confirmCancel(context, l10n),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _callPhone(BuildContext context, String phone) async {
    final normalized = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final opened = await launchUrl(
      Uri(scheme: 'tel', path: normalized),
      mode: LaunchMode.externalApplication,
    );
    if (!context.mounted || opened) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          AppLocalizations.of(context)!.driverActiveOrderNavigationUnavailable,
        ),
      ),
    );
  }

  Future<void> _confirmCancel(
    BuildContext context,
    AppLocalizations l10n,
  ) async {
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.activeOrderCancelConfirmTitle),
        content: Text(l10n.activeOrderCancelConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(l10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(l10n.activeOrderCancelConfirmAction),
          ),
        ],
      ),
    );

    if (shouldCancel == true && context.mounted) {
      context.read<ActiveOrderCubit>().cancelOrder();
    }
  }

  String _statusLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'accepted':
        return l10n.activeOrderStatusAccepted;
      case 'arriving':
        return l10n.activeOrderStatusArriving;
      case 'waiting':
        return l10n.activeOrderStatusWaiting;
      case 'in_progress':
        return l10n.activeOrderStatusInProgress;
      case 'completed':
        return l10n.activeOrderStatusCompleted;
      case 'cancelled_client':
        return l10n.activeOrderStatusCancelled;
      default:
        return l10n.activeOrderStatusSearching;
    }
  }

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    switch (codeOrMessage) {
      case 'ACTIVE_ORDER_TRACKING_FAILED':
        return l10n.activeOrderTrackingFailed;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }

  String? _statusNotificationLabel(AppLocalizations l10n, String status) {
    switch (status) {
      case 'accepted':
        return l10n.activeOrderStatusAccepted;
      case 'waiting':
        return l10n.activeOrderStatusWaiting;
      case 'in_progress':
        return l10n.activeOrderStatusInProgress;
      case 'completed':
        return l10n.activeOrderStatusCompleted;
      default:
        return null;
    }
  }

  String _paymentAmount(BuildContext context, ActiveOrderState state) {
    return AppFormatters.formatCurrency(
      context,
      state.session.price,
      currencyCode: state.session.currency,
    );
  }

  String _localizedTariffLabel(AppLocalizations l10n, String value) {
    switch (value.trim().toLowerCase()) {
      case 'economy':
      case 'эконом':
      case 'taxi':
        return l10n.taxiClassEconomy;
      case 'comfort':
        return l10n.taxiClassComfort;
      case 'comfort_plus':
      case 'comfort plus':
      case 'комфорт+':
        return l10n.taxiClassComfortPlus;
      case 'business':
      case 'бизнес':
        return l10n.taxiClassBusiness;
      case 'bicycle':
        return l10n.deliveryVehicleBicycle;
      case 'moped':
        return l10n.deliveryVehicleMoped;
      case 'scooter':
        return l10n.deliveryVehicleScooter;
      case 'car':
        return l10n.deliveryVehicleCar;
      default:
        return value.trim().isEmpty ? l10n.taxiClassEconomy : value;
    }
  }

  String? _localizedVehicleLabel(AppLocalizations l10n, String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }

    final normalized = value.trim().toLowerCase();
    if (normalized == 'economy' || normalized == 'taxi') {
      return null;
    }
    if (normalized == 'comfort') {
      return null;
    }
    if (normalized == 'comfort_plus' || normalized == 'comfort plus') {
      return null;
    }
    if (normalized == 'business') {
      return null;
    }
    if (normalized == 'bicycle') {
      return l10n.deliveryVehicleBicycle;
    }
    if (normalized == 'moped') {
      return l10n.deliveryVehicleMoped;
    }
    if (normalized == 'scooter') {
      return l10n.deliveryVehicleScooter;
    }
    if (normalized == 'car') {
      return l10n.deliveryVehicleCar;
    }

    return value;
  }

  bool _isChatClosed(String status) {
    return status == 'searching' ||
        status == 'completed' ||
        status == 'cancelled_client' ||
        status == 'cancelled_executor' ||
        status == 'cancelled_system' ||
        status == 'failed';
  }

  bool _isCancelled(String status) {
    return status == 'cancelled_client' ||
        status == 'cancelled_executor' ||
        status == 'cancelled_system' ||
        status == 'failed';
  }
}
