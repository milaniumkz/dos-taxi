import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../home/presentation/widgets/map_widget.dart';
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

  Future<void> _openNavigation(
    BuildContext context,
    AppLocalizations l10n,
    ExecutorActiveOrderSession session,
    LatLng currentLocation,
  ) async {
    final destination = _navigationDestinationFor(session);
    final options = await _availableNavigationOptions(
      l10n: l10n,
      from: currentLocation,
      to: destination,
    );

    if (!context.mounted) {
      return;
    }

    final selected = await showModalBottomSheet<_NavigationMapOption>(
      context: context,
      backgroundColor: AppColors.darkSurface,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Text(
                  l10n.driverActiveOrderNavigationTitle,
                  style: Theme.of(
                    sheetContext,
                  ).textTheme.titleMedium?.copyWith(color: AppColors.darkText),
                ),
              ),
              for (final option in options)
                ListTile(
                  leading: Icon(option.icon, color: AppColors.primary),
                  title: Text(
                    option.label,
                    style: const TextStyle(color: AppColors.darkText),
                  ),
                  onTap: () => Navigator.of(sheetContext).pop(option),
                ),
            ],
          ),
        ),
      ),
    );

    if (selected == null) {
      return;
    }

    final opened = await launchUrl(
      selected.uri,
      mode: LaunchMode.externalApplication,
    );
    if (!context.mounted || opened) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.driverActiveOrderNavigationUnavailable)),
    );
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

          return Scaffold(
            backgroundColor: AppColors.darkBackground,
            body: Stack(
              children: [
                Positioned.fill(
                  child: _ExecutorActiveOrderMap(
                    currentLocation: locationState.currentLocation,
                    pickupLocation: session.pickupLocation,
                    destinationLocation: session.destinationLocation,
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
                        l10n: l10n,
                        session: session,
                        incomingState: incomingState,
                        recipientCodeController: _recipientCodeController,
                        proofPhoto: _proofPhoto,
                        onPickProofPhoto: _pickProofPhoto,
                        onOpenNavigation: () => unawaited(
                          _openNavigation(
                            context,
                            l10n,
                            session,
                            locationState.currentLocation,
                          ),
                        ),
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

  LatLng _navigationDestinationFor(ExecutorActiveOrderSession session) {
    return session.status == 'accepted'
        ? session.pickupLocation
        : session.destinationLocation;
  }

  Future<List<_NavigationMapOption>> _availableNavigationOptions({
    required AppLocalizations l10n,
    required LatLng from,
    required LatLng to,
  }) async {
    final installed = <_NavigationMapOption>[];
    final candidates = <_NavigationMapCandidate>[
      _NavigationMapCandidate(
        label: 'Яндекс Карты',
        icon: Icons.map_rounded,
        uris: [_yandexMapsRouteUri(from, to)],
      ),
      _NavigationMapCandidate(
        label: '2ГИС',
        icon: Icons.location_city_rounded,
        uris: [_twoGisRouteUri(from, to)],
      ),
      _NavigationMapCandidate(
        label: 'Google Maps',
        icon: Icons.assistant_direction_rounded,
        uris: [_googleNavigationUri(to), _googleMapsRouteUri(from, to)],
      ),
      _NavigationMapCandidate(
        label: 'Карты телефона',
        icon: Icons.navigation_rounded,
        uris: [_geoRouteUri(to)],
      ),
    ];

    for (final candidate in candidates) {
      final uri = await candidate.availableUri();
      if (uri != null) {
        installed.add(
          _NavigationMapOption(
            label: candidate.label,
            icon: candidate.icon,
            uri: uri,
          ),
        );
      }
    }

    return [
      ...installed,
      _NavigationMapOption(
        label: l10n.driverActiveOrderNavigationBrowser,
        icon: Icons.public_rounded,
        uri: _webYandexRouteUri(from, to),
      ),
    ];
  }

  Uri _yandexMapsRouteUri(LatLng from, LatLng to) => Uri.parse(
    'yandexmaps://maps.yandex.ru/?rtext=${_latLngText(from)}~${_latLngText(to)}&rtt=auto',
  );

  Uri _twoGisRouteUri(LatLng from, LatLng to) => Uri.parse(
    'dgis://2gis.ru/routeSearch/rsType/car/from/${_lngLatText(from)}/to/${_lngLatText(to)}',
  );

  Uri _googleNavigationUri(LatLng to) =>
      Uri.parse('google.navigation:q=${_latLngText(to)}&mode=d');

  Uri _googleMapsRouteUri(LatLng from, LatLng to) => Uri.parse(
    'comgooglemaps://?saddr=${_latLngText(from)}&daddr=${_latLngText(to)}&directionsmode=driving',
  );

  Uri _geoRouteUri(LatLng to) =>
      Uri.parse('geo:${_latLngText(to)}?q=${_latLngText(to)}');

  Uri _webYandexRouteUri(LatLng from, LatLng to) => Uri.https(
    'yandex.ru',
    '/maps/',
    {'rtext': '${_latLngText(from)}~${_latLngText(to)}', 'rtt': 'auto'},
  );

  String _latLngText(LatLng value) =>
      '${value.latitude.toStringAsFixed(6)},${value.longitude.toStringAsFixed(6)}';

  String _lngLatText(LatLng value) =>
      '${value.longitude.toStringAsFixed(6)},${value.latitude.toStringAsFixed(6)}';

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
    return DosCard(
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
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      targetAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppColors.darkText,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${l10n.driverActiveOrderPaymentLabel}: ${_paymentMethodLabel(l10n, session.paymentMethod)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
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
              onPressed: incomingState.isSubmitting ? null : onPickProofPhoto,
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
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
                ),
              ),
          ],
          const SizedBox(height: AppSpacing.sm),
          ...actionButtons,
        ],
      ),
    );
  }

  String get _targetLabel {
    if (session.status == 'accepted') {
      return l10n.driverActiveOrderPickupLabel;
    }
    return l10n.driverActiveOrderDestinationLabel;
  }

  String get _targetAddress {
    if (session.status == 'accepted') {
      return session.pickupAddress;
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

class _NavigationMapCandidate {
  const _NavigationMapCandidate({
    required this.label,
    required this.icon,
    required this.uris,
  });

  final String label;
  final IconData icon;
  final List<Uri> uris;

  Future<Uri?> availableUri() async {
    for (final uri in uris) {
      if (await canLaunchUrl(uri)) {
        return uri;
      }
    }
    return null;
  }
}

class _NavigationMapOption {
  const _NavigationMapOption({
    required this.label,
    required this.icon,
    required this.uri,
  });

  final String label;
  final IconData icon;
  final Uri uri;
}

class _ExecutorActiveOrderMap extends StatefulWidget {
  const _ExecutorActiveOrderMap({
    required this.currentLocation,
    required this.pickupLocation,
    required this.destinationLocation,
    required this.status,
  });

  final LatLng currentLocation;
  final LatLng pickupLocation;
  final LatLng destinationLocation;
  final String status;

  @override
  State<_ExecutorActiveOrderMap> createState() =>
      _ExecutorActiveOrderMapState();
}

class _ExecutorActiveOrderMapState extends State<_ExecutorActiveOrderMap> {
  final _mapController = MapController();

  @override
  void didUpdateWidget(covariant _ExecutorActiveOrderMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_isSamePoint(oldWidget.currentLocation, widget.currentLocation)) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _mapController.move(widget.currentLocation, _mapController.camera.zoom);
    });
  }

  @override
  Widget build(BuildContext context) {
    final nextTarget = widget.status == 'accepted'
        ? widget.pickupLocation
        : widget.destinationLocation;
    return DarkDriverMap(
      child: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: widget.currentLocation,
          initialZoom: 16,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.dos.dos_mobile',
          ),
          PolylineLayer(
            polylines: [
              Polyline(
                points: [widget.pickupLocation, widget.destinationLocation],
                strokeWidth: 3,
                color: AppColors.darkText.withValues(alpha: 0.35),
              ),
              Polyline(
                points: [widget.currentLocation, nextTarget],
                strokeWidth: 5,
                color: AppColors.primary,
              ),
            ],
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: widget.pickupLocation,
                width: 50,
                height: 50,
                child: const _MapMarker(
                  icon: Icons.trip_origin_rounded,
                  color: AppColors.success,
                ),
              ),
              Marker(
                point: widget.destinationLocation,
                width: 54,
                height: 54,
                child: const _MapMarker(
                  icon: Icons.location_on_rounded,
                  color: AppColors.primary,
                ),
              ),
              Marker(
                point: widget.currentLocation,
                width: 58,
                height: 58,
                child: const _MapMarker(
                  icon: Icons.navigation_rounded,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool _isSamePoint(LatLng first, LatLng second) {
    return (first.latitude - second.latitude).abs() < 0.000001 &&
        (first.longitude - second.longitude).abs() < 0.000001;
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
      ),
      child: Icon(icon, color: Colors.white),
    );
  }
}
