import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../navigation/domain/navigation_route.dart';
import '../../../navigation/presentation/driver_navigation_view.dart';
import '../../../order_chat/presentation/screens/order_chat_screen.dart';
import '../../domain/entities/executor_active_order_session.dart';
import '../cubit/executor_status_cubit.dart';
import '../cubit/incoming_order_cubit.dart';

class ExecutorActiveOrderScreen extends StatefulWidget {
  const ExecutorActiveOrderScreen({super.key});

  static const routePath = '/driver/active-order';

  @override
  State<ExecutorActiveOrderScreen> createState() =>
      _ExecutorActiveOrderScreenState();
}

class _ExecutorActiveOrderScreenState extends State<ExecutorActiveOrderScreen> {
  final _navigationKey = GlobalKey<DriverNavigationViewState>();
  final _controlsKey = GlobalKey();
  double _controlsHeight = 280;
  final _recipientCodeController = TextEditingController();
  final _picker = ImagePicker();
  XFile? _proofPhoto;
  String? _taximeterOrderId;
  String? _taximeterStatus;
  LatLng? _lastTaximeterLocation;
  int _taximeterDistanceMeters = 0;

  @override
  void dispose() {
    _recipientCodeController.dispose();
    super.dispose();
  }

  void _measureControls() {
    final box = _controlsKey.currentContext?.findRenderObject();
    if (box is RenderBox) {
      final height =
          box.size.height +
          AppSpacing.md * 2 +
          MediaQuery.paddingOf(context).bottom;
      if ((_controlsHeight - height).abs() > 1) {
        setState(() => _controlsHeight = height);
      }
    }
  }

  Future<void> _pickProofPhoto() async {
    final image = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (!mounted || image == null) {
      return;
    }
    setState(() {
      _proofPhoto = image;
    });
  }

  Future<void> _callPhone(
    BuildContext context,
    AppLocalizations l10n,
    String phone,
  ) async {
    final normalized = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final opened = await launchUrl(
      Uri(scheme: 'tel', path: normalized),
      mode: LaunchMode.externalApplication,
    );
    if (!context.mounted || opened) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.driverActiveOrderNavigationUnavailable)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocListener<IncomingOrderCubit, IncomingOrderState>(
      listenWhen: (previous, current) =>
          previous.shouldCloseActiveOrder != current.shouldCloseActiveOrder,
      listener: (context, state) {
        if (!state.shouldCloseActiveOrder) {
          return;
        }
        context.read<IncomingOrderCubit>().clearClosedActiveOrder();
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/driver/home');
        }
      },
      child: BlocBuilder<IncomingOrderCubit, IncomingOrderState>(
        builder: (context, incomingState) {
          final session = incomingState.activeOrderSession;
          if (session == null) {
            return Scaffold(
              appBar: AppBar(title: Text(l10n.driverActiveOrderTitle)),
              body: const Center(child: CircularProgressIndicator()),
            );
          }

          final locationState = context.watch<ExecutorStatusCubit>().state;
          final taximeterDistanceMeters = _taximeterDistanceFor(
            session,
            locationState.currentLocation,
          );

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _measureControls();
          });
          return Scaffold(
            backgroundColor: AppColors.darkBackground,
            body: Stack(
              children: [
                Positioned.fill(
                  child: DriverNavigationView(
                    key: _navigationKey,
                    topInset: MediaQuery.paddingOf(context).top + 72,
                    bottomInset: _controlsHeight,
                    initialLocation: locationState.currentLocation,
                    pickup: session.pickupLocation,
                    destination: session.destinationLocation,
                    status: session.status,
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
                        Expanded(
                          child: DosCard(
                            color: AppColors.darkSurface,
                            borderColor: const Color(0x22FFFFFF),
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: 12,
                            ),
                            radius: 22,
                            child: Row(
                              children: [
                                const CircleAvatar(
                                  radius: 17,
                                  backgroundColor: AppColors.primary,
                                  child: Icon(
                                    Icons.navigation_rounded,
                                    color: AppColors.text,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        _statusLabel(l10n, session.status),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelLarge
                                            ?.copyWith(
                                              color: AppColors.darkText,
                                            ),
                                      ),
                                      Text(
                                        l10n.driverActiveOrderClientLabel,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(
                                              color: AppColors.darkMuted,
                                              fontSize: 11,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        InkWell(
                          onTap: () {
                            if (context.canPop()) {
                              context.pop();
                            }
                          },
                          borderRadius: BorderRadius.circular(22),
                          child: const CircleAvatar(
                            radius: 22,
                            backgroundColor: AppColors.darkSurface,
                            child: Icon(
                              Icons.close_rounded,
                              color: AppColors.darkText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: _DriverActiveOrderCard(
                        key: _controlsKey,
                        l10n: l10n,
                        session: session,
                        incomingState: incomingState,
                        recipientCodeController: _recipientCodeController,
                        proofPhoto: _proofPhoto,
                        onPickProofPhoto: _pickProofPhoto,
                        onOpenNavigation: () =>
                            _navigationKey.currentState?.recenter(),
                        onOpenChat: () => context.push(
                          OrderChatScreen.routePath,
                          extra: OrderChatArgs(
                            orderId: session.orderId,
                            isExecutor: true,
                            isClosed: _isChatClosed(session.status),
                          ),
                        ),
                        onCallClient: session.clientPhone == null
                            ? null
                            : () => unawaited(
                                _callPhone(context, l10n, session.clientPhone!),
                              ),
                        actionButtons: _buildActionButtons(
                          context: context,
                          l10n: l10n,
                          state: incomingState,
                          sessionStatus: session.status,
                          isDelivery: session.isDelivery,
                          currentLocation: locationState.currentLocation,
                          actualDistanceMeters: taximeterDistanceMeters,
                        ),
                      ),
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

  List<Widget> _buildActionButtons({
    required BuildContext context,
    required AppLocalizations l10n,
    required IncomingOrderState state,
    required String sessionStatus,
    required bool isDelivery,
    required LatLng currentLocation,
    required int actualDistanceMeters,
  }) {
    if (!isDelivery) {
      if (sessionStatus == 'accepted') {
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () => context.read<IncomingOrderCubit>().markTaxiArrived(
                    location: currentLocation,
                  ),
            label: l10n.driverActiveOrderPrimaryArrived,
            isLoading: state.isSubmitting,
          ),
        ];
      }
      if (sessionStatus == 'waiting') {
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () => context.read<IncomingOrderCubit>().startTaxiTrip(
                    location: currentLocation,
                  ),
            label: l10n.driverActiveOrderPrimaryStart,
            isLoading: state.isSubmitting,
          ),
        ];
      }
      return [
        _PrimaryActionButton(
          onPressed: state.isSubmitting
              ? null
              : () => context.read<IncomingOrderCubit>().completeTaxiTrip(
                  location: currentLocation,
                  actualDistanceMeters: actualDistanceMeters,
                ),
          label: l10n.driverActiveOrderPrimaryComplete,
          isLoading: state.isSubmitting,
        ),
      ];
    }

    switch (sessionStatus) {
      case 'accepted':
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () =>
                      context.read<IncomingOrderCubit>().pickupDeliveryOrder(),
            label: l10n.driverActiveOrderDeliveryPickup,
            isLoading: state.isSubmitting,
          ),
        ];
      case 'picked_up':
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () => context
                      .read<IncomingOrderCubit>()
                      .markDeliveryInTransit(),
            label: l10n.driverActiveOrderDeliveryTransit,
            isLoading: state.isSubmitting,
          ),
        ];
      case 'in_transit':
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () => context.read<IncomingOrderCubit>().markDeliveryAtDoor(),
            label: l10n.driverActiveOrderDeliveryAtDoor,
            isLoading: state.isSubmitting,
          ),
        ];
      default:
        return [
          _PrimaryActionButton(
            onPressed: state.isSubmitting
                ? null
                : () => context.read<IncomingOrderCubit>().completeDelivery(
                    proofPhotoPath: _proofPhoto?.path,
                    recipientCode: _recipientCodeController.text.trim().isEmpty
                        ? null
                        : _recipientCodeController.text.trim(),
                  ),
            label: l10n.driverActiveOrderDeliveryDelivered,
            isLoading: state.isSubmitting,
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: state.isSubmitting
                ? null
                : () => context.read<IncomingOrderCubit>().failDelivery(),
            child: Text(l10n.driverActiveOrderDeliveryFailed),
          ),
        ];
    }
  }

  String _statusLabel(AppLocalizations l10n, String value) {
    switch (value) {
      case 'accepted':
        return l10n.driverActiveOrderStatusAccepted;
      case 'waiting':
        return l10n.driverActiveOrderStatusWaiting;
      case 'in_progress':
        return l10n.driverActiveOrderStatusInProgress;
      case 'picked_up':
        return l10n.driverActiveOrderStatusPickedUp;
      case 'in_transit':
        return l10n.driverActiveOrderStatusInTransit;
      case 'at_door':
        return l10n.driverActiveOrderStatusAtDoor;
      case 'delivery_failed':
        return l10n.driverActiveOrderStatusFailed;
      default:
        return l10n.driverActiveOrderStatusCompleted;
    }
  }

  int _taximeterDistanceFor(
    ExecutorActiveOrderSession session,
    LatLng currentLocation,
  ) {
    if (_taximeterOrderId != session.orderId ||
        _taximeterStatus != session.status) {
      _taximeterOrderId = session.orderId;
      _taximeterStatus = session.status;
      _taximeterDistanceMeters = 0;
      _lastTaximeterLocation = session.status == 'in_progress'
          ? session.pickupLocation
          : currentLocation;
    }

    if (session.status != 'in_progress') {
      return 0;
    }

    final lastLocation = _lastTaximeterLocation ?? currentLocation;
    final segmentMeters = const Distance().distance(
      lastLocation,
      currentLocation,
    );
    if (segmentMeters >= 5 && segmentMeters <= 2000) {
      _taximeterDistanceMeters += segmentMeters.round();
      _lastTaximeterLocation = currentLocation;
    } else if (segmentMeters > 2000) {
      _lastTaximeterLocation = currentLocation;
    }

    return _taximeterDistanceMeters;
  }

  bool _isChatClosed(String status) {
    return status == 'completed' ||
        status == 'cancelled_client' ||
        status == 'cancelled_executor' ||
        status == 'cancelled_system' ||
        status == 'failed' ||
        status == 'delivery_failed' ||
        status == 'delivered_confirmed';
  }
}

class _PrimaryActionButton extends StatelessWidget {
  const _PrimaryActionButton({
    required this.onPressed,
    required this.label,
    required this.isLoading,
  });

  final VoidCallback? onPressed;
  final String label;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onPressed,
        child: isLoading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Text(label),
      ),
    );
  }
}

class _DriverActiveOrderCard extends StatelessWidget {
  const _DriverActiveOrderCard({
    super.key,
    required this.l10n,
    required this.session,
    required this.incomingState,
    required this.recipientCodeController,
    required this.proofPhoto,
    required this.onPickProofPhoto,
    required this.onOpenNavigation,
    required this.onOpenChat,
    required this.onCallClient,
    required this.actionButtons,
  });

  final AppLocalizations l10n;
  final ExecutorActiveOrderSession session;
  final IncomingOrderState incomingState;
  final TextEditingController recipientCodeController;
  final XFile? proofPhoto;
  final VoidCallback onPickProofPhoto;
  final VoidCallback onOpenNavigation;
  final VoidCallback onOpenChat;
  final VoidCallback? onCallClient;
  final List<Widget> actionButtons;

  @override
  Widget build(BuildContext context) {
    final targetLabel = _targetLabel;
    final targetAddress = _targetAddress;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.45,
      ),
      child: SingleChildScrollView(
        child: DosCard(
          color: AppColors.darkSurface,
          borderColor: const Color(0x22FFFFFF),
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    radius: 18,
                    backgroundColor: AppColors.primary,
                    child: Icon(
                      Icons.navigation_rounded,
                      color: AppColors.text,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          targetLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        Text(
                          targetAddress,
                          maxLines: session.isNegotiated ? null : 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(
                                color: AppColors.darkText,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${l10n.driverActiveOrderPaymentLabel}: ${_paymentMethodLabel(l10n, session.paymentMethod)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                color: AppColors.darkMuted,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    AppFormatters.formatCurrency(
                      context,
                      session.price,
                      currencyCode: session.currency,
                      decimalDigits:
                          session.isNegotiated && session.currency == 'RUB'
                          ? 2
                          : 0,
                    ),
                    style: Theme.of(
                      context,
                    ).textTheme.titleSmall?.copyWith(color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: _DriverRoundAction(
                      icon: Icons.call_rounded,
                      label: session.clientPhone == null
                          ? '—'
                          : AppFormatters.formatKazakhstanPhone(
                              session.clientPhone!,
                            ),
                      onTap: onCallClient,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DriverRoundAction(
                      icon: Icons.navigation_rounded,
                      label: l10n.driverActiveOrderNavigationAction,
                      onTap: onOpenNavigation,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DriverRoundAction(
                      icon: Icons.chat_bubble_rounded,
                      label: l10n.driverIncomingOrderClientLabel,
                      onTap: onOpenChat,
                    ),
                  ),
                ],
              ),
              if (session.isDelivery && session.status == 'at_door') ...[
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: recipientCodeController,
                  decoration: InputDecoration(
                    labelText: l10n.driverActiveOrderRecipientCodeLabel,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                OutlinedButton.icon(
                  onPressed: incomingState.isSubmitting
                      ? null
                      : onPickProofPhoto,
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: Text(l10n.driverActiveOrderProofPhotoAction),
                ),
                if (proofPhoto != null)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Text(
                      proofPhoto!.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.darkMuted,
                      ),
                    ),
                  ),
              ],
              const SizedBox(height: AppSpacing.sm),
              ...actionButtons,
            ],
          ),
        ),
      ),
    );
  }

  String get _targetLabel {
    if (isPickupNavigation(session.status)) {
      return l10n.driverActiveOrderPickupLabel;
    }
    return l10n.driverActiveOrderDestinationLabel;
  }

  String get _targetAddress {
    if (isPickupNavigation(session.status)) {
      return [
        session.pickupAddress,
        if ((session.pickupEntrance ?? '').isNotEmpty)
          '${l10n.rideEntrance}: ${session.pickupEntrance}',
        if ((session.pickupComment ?? '').isNotEmpty)
          '${l10n.rideComment}: ${session.pickupComment}',
        if (session.isNegotiated)
          '${l10n.ridePassengers}: ${session.passengerCount}',
        if (session.needsChildSeat) l10n.rideChildSeat,
        if (session.sharedRide) l10n.rideTogether,
      ].join('\n');
    }
    return session.destinationAddress;
  }

  String _paymentMethodLabel(AppLocalizations l10n, String method) {
    switch (method) {
      case 'transfer_kaspi':
        return l10n.paymentMethodKaspiTransfer;
      case 'transfer_halyk':
        return l10n.paymentMethodHalykTransfer;
      case 'cash':
        return l10n.taxiPaymentMethodCash;
      default:
        return l10n.taxiPaymentMethodCash;
    }
  }
}

class _DriverRoundAction extends StatelessWidget {
  const _DriverRoundAction({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.darkSurfaceAlt,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Row(
            children: [
              CircleAvatar(
                radius: 17,
                backgroundColor: AppColors.primary,
                child: Icon(icon, size: 17, color: AppColors.text),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppColors.darkText,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
