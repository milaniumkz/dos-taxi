import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/errors/failure.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../auth/presentation/screens/phone_input_screen.dart';
import '../../../legal/presentation/screens/legal_screen.dart';
import '../../../order_history/domain/entities/history_order.dart';
import '../../../order_history/domain/repositories/order_history_repository.dart';
import '../../../profile/presentation/cubit/profile_settings_cubit.dart';
import '../../../support/presentation/screens/support_chat_screen.dart';
import '../../../taxi/presentation/widgets/summary_row.dart';
import '../../domain/entities/executor_profile.dart';
import '../../domain/repositories/executor_repository.dart';
import '../cubit/executor_status_cubit.dart';
import '../cubit/incoming_order_cubit.dart';
import '../vehicle_catalog.dart';
import '../widgets/executor_heat_map.dart';
import '../widgets/driver_bonus_progress_card.dart';
import '../widgets/incoming_order_sheet.dart';
import 'executor_active_order_screen.dart';

class ExecutorHomeScreen extends StatefulWidget {
  const ExecutorHomeScreen({super.key});

  static const routePath = '/driver/home';

  @override
  State<ExecutorHomeScreen> createState() => _ExecutorHomeScreenState();
}

class _ExecutorHomeScreenState extends State<ExecutorHomeScreen> {
  bool _isOfferSheetOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ExecutorStatusCubit>().initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<ExecutorStatusCubit, ExecutorStatusState>(
          listenWhen: (previous, current) =>
              previous.stage != current.stage ||
              previous.profile?.isOnline != current.profile?.isOnline,
          listener: (context, state) {
            final incomingCubit = context.read<IncomingOrderCubit>();
            final profile = state.profile;
            if (state.stage == ExecutorScreenStage.dashboard &&
                profile != null &&
                profile.isOnline) {
              incomingCubit.synchronizeDashboardSession(profile);
              return;
            }
            incomingCubit.stopListening();
          },
        ),
        BlocListener<ExecutorStatusCubit, ExecutorStatusState>(
          listenWhen: (previous, current) =>
              previous.errorMessage != current.errorMessage &&
              current.errorMessage != null,
          listener: (context, state) {
            final l10n = AppLocalizations.of(context)!;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  ErrorMessageLocalizer.resolve(l10n, state.errorMessage),
                ),
              ),
            );
          },
        ),
        BlocListener<IncomingOrderCubit, IncomingOrderState>(
          listenWhen: (previous, current) =>
              previous.currentOffer?.orderId != current.currentOffer?.orderId ||
              previous.errorMessage != current.errorMessage,
          listener: (context, state) {
            if (state.errorMessage != null) {
              final l10n = AppLocalizations.of(context)!;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    ErrorMessageLocalizer.resolve(l10n, state.errorMessage),
                  ),
                ),
              );
            }

            if (state.currentOffer != null && !_isOfferSheetOpen) {
              _isOfferSheetOpen = true;
              showModalBottomSheet<void>(
                context: context,
                isDismissible: false,
                enableDrag: false,
                builder: (_) => BlocProvider.value(
                  value: context.read<IncomingOrderCubit>(),
                  child: const IncomingOrderSheet(),
                ),
              ).whenComplete(() {
                _isOfferSheetOpen = false;
              });
            }

            if (state.currentOffer == null && _isOfferSheetOpen) {
              Navigator.of(context).pop();
              _isOfferSheetOpen = false;
            }
          },
        ),
        BlocListener<IncomingOrderCubit, IncomingOrderState>(
          listenWhen: (previous, current) =>
              previous.activeOrderSession?.orderId !=
                  current.activeOrderSession?.orderId &&
              current.activeOrderSession != null,
          listener: (context, state) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              context.push(ExecutorActiveOrderScreen.routePath);
            });
          },
        ),
      ],
      child: BlocBuilder<ExecutorStatusCubit, ExecutorStatusState>(
        builder: (context, state) {
          switch (state.stage) {
            case ExecutorScreenStage.loading:
              return const _ExecutorLoadingScreen();
            case ExecutorScreenStage.onboarding:
              return const DriverOnboardingScreen();
            case ExecutorScreenStage.verificationPending:
              return const DriverVerificationPendingScreen();
            case ExecutorScreenStage.dashboard:
              return const _ExecutorDashboardScreen();
          }
        },
      ),
    );
  }
}

class DriverOnboardingScreen extends StatefulWidget {
  const DriverOnboardingScreen({super.key});

  @override
  State<DriverOnboardingScreen> createState() => _DriverOnboardingScreenState();
}

class _DriverOnboardingScreenState extends State<DriverOnboardingScreen> {
  final _nameController = TextEditingController();
  final _vehicleMakeController = TextEditingController();
  final _vehicleModelController = TextEditingController();
  final _vehicleYearController = TextEditingController();
  final _vehicleColorController = TextEditingController();
  final _vehiclePlateController = TextEditingController();
  String _executorType = 'driver';
  String? _vehicleType;

  @override
  void dispose() {
    _nameController.dispose();
    _vehicleMakeController.dispose();
    _vehicleModelController.dispose();
    _vehicleYearController.dispose();
    _vehicleColorController.dispose();
    _vehiclePlateController.dispose();
    super.dispose();
  }

  void _submit() {
    final l10n = AppLocalizations.of(context)!;
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.driverOnboardingNameRequired)),
      );
      return;
    }

    if (_executorType == 'courier' && _vehicleType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.driverOnboardingVehicleRequired)),
      );
      return;
    }

    final vehicleYear = _selectedVehicleYear;
    final vehicleMake = _selectedVehicleMake;
    final vehicleModel = _selectedVehicleModel;
    final vehicleColor = _selectedVehicleColor;
    final vehiclePlate = AppFormatters.normalizeVehiclePlate(
      _vehiclePlateController.text,
    );
    if (_executorType == 'driver' &&
        (vehicleMake == null ||
            vehicleModel == null ||
            vehicleYear == null ||
            vehicleColor == null ||
            vehiclePlate.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.driverOnboardingVehicleDetailsRequired)),
      );
      return;
    }

    if (_executorType == 'driver' &&
        !AppFormatters.isValidVehiclePlate(vehiclePlate)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.vehiclePlateFormatHint)));
      return;
    }

    context.read<ExecutorStatusCubit>().submitOnboarding(
      name: _nameController.text.trim(),
      executorType: _executorType,
      vehicleType: _executorType == 'courier' ? _vehicleType : null,
      vehicleMake: _executorType == 'driver' ? vehicleMake : null,
      vehicleModel: _executorType == 'driver' ? vehicleModel : null,
      vehicleYear: _executorType == 'driver' ? vehicleYear : null,
      vehicleColor: _executorType == 'driver' ? vehicleColor : null,
      vehiclePlate: _executorType == 'driver' ? vehiclePlate : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final state = context.watch<ExecutorStatusCubit>().state;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.driverOnboardingTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.driverOnboardingSubtitle,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: _nameController,
              decoration: InputDecoration(labelText: l10n.profileNameLabel),
            ),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _executorType,
              decoration: InputDecoration(
                labelText: l10n.driverOnboardingExecutorTypeLabel,
              ),
              items: [
                DropdownMenuItem(
                  value: 'driver',
                  child: Text(l10n.driverOnboardingExecutorTypeDriver),
                ),
                DropdownMenuItem(
                  value: 'courier',
                  child: Text(l10n.driverOnboardingExecutorTypeCourier),
                ),
              ],
              onChanged: (value) {
                if (value == null) {
                  return;
                }
                setState(() {
                  _executorType = value;
                  if (value == 'driver') {
                    _vehicleType = null;
                  }
                });
              },
            ),
            const SizedBox(height: AppSpacing.md),
            if (_executorType == 'courier')
              DropdownButtonFormField<String>(
                initialValue: _vehicleType,
                decoration: InputDecoration(
                  labelText: l10n.driverOnboardingVehicleLabel,
                ),
                items: [
                  DropdownMenuItem(
                    value: 'bicycle',
                    child: Text(l10n.deliveryVehicleBicycle),
                  ),
                  DropdownMenuItem(
                    value: 'moped',
                    child: Text(l10n.deliveryVehicleMoped),
                  ),
                  DropdownMenuItem(
                    value: 'scooter',
                    child: Text(l10n.deliveryVehicleScooter),
                  ),
                  DropdownMenuItem(
                    value: 'car',
                    child: Text(l10n.deliveryVehicleCar),
                  ),
                ],
                onChanged: (value) => setState(() => _vehicleType = value),
              )
            else
              Column(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _selectedVehicleMake,
                    decoration: InputDecoration(
                      labelText: l10n.driverOnboardingVehicleMakeLabel,
                    ),
                    items: VehicleCatalog.makes
                        .map(
                          (make) => DropdownMenuItem(
                            value: make.name,
                            child: Text(make.name),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      setState(() {
                        _vehicleMakeController.text = value ?? '';
                        _vehicleModelController.clear();
                      });
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedVehicleModel,
                    decoration: InputDecoration(
                      labelText: l10n.driverOnboardingVehicleModelLabel,
                    ),
                    items: VehicleCatalog.modelsFor(_selectedVehicleMake)
                        .map(
                          (model) => DropdownMenuItem(
                            value: model,
                            child: Text(model),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: _selectedVehicleMake == null
                        ? null
                        : (value) {
                            setState(() {
                              _vehicleModelController.text = value ?? '';
                            });
                          },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<int>(
                    initialValue: _selectedVehicleYear,
                    decoration: InputDecoration(
                      labelText: l10n.driverOnboardingVehicleYearLabel,
                    ),
                    items: VehicleCatalog.years
                        .map(
                          (year) => DropdownMenuItem(
                            value: year,
                            child: Text(year.toString()),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      setState(() {
                        _vehicleYearController.text = value?.toString() ?? '';
                      });
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedVehicleColor,
                    decoration: InputDecoration(
                      labelText: l10n.driverVehicleColorLabel,
                    ),
                    items: VehicleCatalog.colors
                        .map(
                          (color) => DropdownMenuItem(
                            value: color,
                            child: Text(color),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      setState(() {
                        _vehicleColorController.text = value ?? '';
                      });
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _vehiclePlateController,
                    decoration: InputDecoration(
                      labelText: l10n.driverOnboardingVehiclePlateLabel,
                      helperText: l10n.vehiclePlateFormatHint,
                    ),
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: const [VehiclePlateInputFormatter()],
                  ),
                ],
              ),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: state.isSubmittingOnboarding ? null : _submit,
                child: state.isSubmittingOnboarding
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.driverOnboardingSubmitAction),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? get _selectedVehicleMake {
    return VehicleCatalog.makeValue(_vehicleMakeController.text);
  }

  String? get _selectedVehicleModel {
    return VehicleCatalog.modelValue(
      _selectedVehicleMake,
      _vehicleModelController.text,
    );
  }

  int? get _selectedVehicleYear {
    final year = int.tryParse(_vehicleYearController.text.trim());
    return VehicleCatalog.years.contains(year) ? year : null;
  }

  String? get _selectedVehicleColor {
    return VehicleCatalog.colorValue(_vehicleColorController.text);
  }
}

class DriverVerificationPendingScreen extends StatelessWidget {
  const DriverVerificationPendingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final state = context.watch<ExecutorStatusCubit>().state;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.driverVerificationPendingTitle)),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  l10n.driverVerificationPendingTitle,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  l10n.driverVerificationPendingDescription,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: state.isLoading
                        ? null
                        : () => context
                              .read<ExecutorStatusCubit>()
                              .refreshVerification(),
                    child: Text(l10n.driverVerificationPendingRefreshAction),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ExecutorDashboardScreen extends StatefulWidget {
  const _ExecutorDashboardScreen();

  @override
  State<_ExecutorDashboardScreen> createState() =>
      _ExecutorDashboardScreenState();
}

class _ExecutorDashboardScreenState extends State<_ExecutorDashboardScreen> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final statusState = context.watch<ExecutorStatusCubit>().state;
    final incomingState = context.watch<IncomingOrderCubit>().state;
    final profile = statusState.profile;

    if (profile == null) {
      return const _ExecutorLoadingScreen();
    }

    final heartbeatLabel = statusState.lastPresenceAt == null
        ? '—'
        : AppFormatters.formatTime(context, statusState.lastPresenceAt!);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: Stack(
        children: [
          if (_tabIndex == 0)
            Positioned.fill(
              child: ExecutorHeatMap(
                currentLocation: statusState.currentLocation,
                recenterRequestId: statusState.recenterRequestId,
              ),
            )
          else
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFF07090B), Color(0xFF101419)],
                  ),
                ),
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                children: [
                  Row(
                    children: [
                      const SizedBox(width: 40, height: 40),
                      const Spacer(),
                      _OnlineSwitchPill(
                        isOnline: profile.isOnline,
                        isBusy:
                            incomingState.activeOrderSession != null ||
                            statusState.isUpdatingOnline,
                        onChanged: (value) => context
                            .read<ExecutorStatusCubit>()
                            .updateOnline(value),
                      ),
                      const Spacer(),
                      CircleAvatar(
                        backgroundColor: AppColors.darkSurface,
                        child: IconButton(
                          onPressed: () {
                            context.read<IncomingOrderCubit>().stopListening();
                            context
                                .read<ExecutorStatusCubit>()
                                .resetLocalSession();
                            context.read<AuthCubit>().signOut();
                            context.go(PhoneInputScreen.routePath);
                          },
                          icon: const Icon(
                            Icons.logout_rounded,
                            color: AppColors.darkText,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Expanded(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      child: _DriverTabBody(
                        key: ValueKey(_tabIndex),
                        tabIndex: _tabIndex,
                        profile: profile,
                        heartbeatLabel: heartbeatLabel,
                        hasActiveOrder:
                            incomingState.activeOrderSession != null,
                        onOpenActiveOrder: () =>
                            context.push(ExecutorActiveOrderScreen.routePath),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  DosBottomNav(
                    selectedIndex: _tabIndex,
                    dark: true,
                    items: [
                      DosBottomNavItem(
                        icon: Icons.home_rounded,
                        label: l10n.navTaxi,
                        onTap: () => setState(() => _tabIndex = 0),
                      ),
                      DosBottomNavItem(
                        icon: Icons.bar_chart_rounded,
                        label: l10n.driverEarningsTitle,
                        onTap: () => setState(() => _tabIndex = 1),
                      ),
                      DosBottomNavItem(
                        icon: Icons.receipt_long_rounded,
                        label: l10n.driverHistoryTitle,
                        onTap: () => setState(() => _tabIndex = 2),
                      ),
                      DosBottomNavItem(
                        icon: Icons.person_rounded,
                        label: l10n.navProfile,
                        onTap: () => setState(() => _tabIndex = 3),
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
  }
}

class _DriverTabBody extends StatelessWidget {
  const _DriverTabBody({
    required this.tabIndex,
    required this.profile,
    required this.heartbeatLabel,
    required this.hasActiveOrder,
    required this.onOpenActiveOrder,
    super.key,
  });

  final int tabIndex;
  final ExecutorProfile profile;
  final String heartbeatLabel;
  final bool hasActiveOrder;
  final VoidCallback onOpenActiveOrder;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    switch (tabIndex) {
      case 1:
        return _DriverEarningsTab(currencyCode: profile.cityCurrency);
      case 2:
        return const _DriverHistoryTab();
      case 3:
        return _DriverProfileTab(profile: profile);
      default:
        return Align(
          alignment: Alignment.bottomCenter,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: FloatingActionButton.small(
                    heroTag: 'driver-location',
                    tooltip: l10n.commonCurrentLocation,
                    backgroundColor: AppColors.surface,
                    foregroundColor: AppColors.text,
                    onPressed:
                        context.watch<ExecutorStatusCubit>().state.isLocating
                        ? null
                        : context
                              .read<ExecutorStatusCubit>()
                              .centerOnCurrentLocation,
                    child: context.watch<ExecutorStatusCubit>().state.isLocating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                DosCard(
                  color: AppColors.darkSurface,
                  borderColor: const Color(0x22FFFFFF),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.driverDashboardTitle,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: _DriverMetric(
                              label: l10n.driverDashboardBalanceLabel,
                              value: AppFormatters.formatCurrency(
                                context,
                                profile.balance,
                                currencyCode: profile.cityCurrency,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: _DriverMetric(
                              label: l10n.driverDashboardHeartbeatLabel,
                              value: heartbeatLabel,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      DriverBonusProgressCard(balance: profile.balance),
                      const SizedBox(height: AppSpacing.md),
                      if (hasActiveOrder)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: onOpenActiveOrder,
                            child: Text(l10n.driverDashboardOpenActiveOrder),
                          ),
                        )
                      else
                        Text(
                          l10n.driverDashboardWaitingOffer,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.darkMuted),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
    }
  }
}

class _DriverEarningsTab extends StatelessWidget {
  const _DriverEarningsTab({required this.currencyCode});

  final String currencyCode;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _DriverHistoryFuture(
      builder: (context, page) {
        final todayOrders = page.items.where(_isTodayCompleted).toList();
        final total = todayOrders.fold<double>(
          0,
          (sum, order) => sum + order.price,
        );
        return ListView(
          padding: const EdgeInsets.only(top: AppSpacing.xxl),
          children: [
            Text(
              l10n.driverEarningsTitle,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(color: AppColors.darkText),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                DosPill(
                  label: l10n.driverPeriodDay,
                  selected: true,
                  dark: true,
                ),
                const SizedBox(width: AppSpacing.sm),
                DosPill(label: l10n.driverPeriodWeek, dark: true),
                const SizedBox(width: AppSpacing.sm),
                DosPill(label: l10n.driverPeriodMonth, dark: true),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              AppFormatters.formatCurrency(
                context,
                total,
                currencyCode: _resolvedCurrency(todayOrders),
              ),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                color: AppColors.darkText,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              '${todayOrders.length} ${l10n.driverOrdersLabel.toLowerCase()}',
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
            ),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(height: 150, child: _DriverBars(orders: todayOrders)),
            const SizedBox(height: AppSpacing.md),
            DosCard(
              color: AppColors.darkSurface,
              borderColor: const Color(0x22FFFFFF),
              child: Column(
                children: [
                  SummaryRow(
                    label: l10n.driverOrdersLabel,
                    value: AppFormatters.formatCurrency(
                      context,
                      total,
                      currencyCode: _resolvedCurrency(todayOrders),
                    ),
                    dark: true,
                  ),
                  SummaryRow(
                    label: l10n.driverBonusesLabel,
                    value: AppFormatters.formatCurrency(
                      context,
                      0,
                      currencyCode: _resolvedCurrency(todayOrders),
                    ),
                    dark: true,
                  ),
                  SummaryRow(
                    label: l10n.driverTipsLabel,
                    value: AppFormatters.formatCurrency(
                      context,
                      0,
                      currencyCode: _resolvedCurrency(todayOrders),
                    ),
                    dark: true,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  bool _isTodayCompleted(HistoryOrder order) {
    final now = DateTime.now();
    final date = order.createdAt.toLocal();
    return order.status == 'completed' &&
        date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  String _resolvedCurrency(List<HistoryOrder> orders) {
    return orders.isEmpty ? currencyCode : orders.first.currency;
  }
}

class _DriverHistoryTab extends StatefulWidget {
  const _DriverHistoryTab();

  @override
  State<_DriverHistoryTab> createState() => _DriverHistoryTabState();
}

class _DriverHistoryTabState extends State<_DriverHistoryTab> {
  _DriverHistoryFilter _filter = _DriverHistoryFilter.all;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _DriverHistoryFuture(
      builder: (context, page) {
        final items = page.items.where(_matchesFilter).toList();
        return ListView(
          padding: const EdgeInsets.only(top: AppSpacing.xl),
          children: [
            Text(
              l10n.driverHistoryTitle,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(color: AppColors.darkText),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                DosPill(
                  label: l10n.orderHistoryFilterAll,
                  selected: _filter == _DriverHistoryFilter.all,
                  dark: true,
                  onTap: () =>
                      setState(() => _filter = _DriverHistoryFilter.all),
                ),
                const SizedBox(width: AppSpacing.sm),
                DosPill(
                  label: l10n.driverCompletedFilter,
                  selected: _filter == _DriverHistoryFilter.completed,
                  dark: true,
                  onTap: () =>
                      setState(() => _filter = _DriverHistoryFilter.completed),
                ),
                const SizedBox(width: AppSpacing.sm),
                DosPill(
                  label: l10n.driverCancelledFilter,
                  selected: _filter == _DriverHistoryFilter.cancelled,
                  dark: true,
                  onTap: () =>
                      setState(() => _filter = _DriverHistoryFilter.cancelled),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (items.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.xxl),
                  child: Text(
                    l10n.orderHistoryEmpty,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.darkMuted,
                    ),
                  ),
                ),
              )
            else
              for (final item in items) ...[
                DosCard(
                  color: AppColors.darkSurface,
                  borderColor: const Color(0x22FFFFFF),
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: AppColors.primary,
                        child: Icon(
                          item.serviceType == 'delivery'
                              ? Icons.local_shipping_rounded
                              : Icons.local_taxi_rounded,
                          color: AppColors.text,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              AppFormatters.formatShortDateTime(
                                context,
                                item.createdAt,
                              ),
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(color: AppColors.darkMuted),
                            ),
                            Text(
                              item.fromTitle.isEmpty
                                  ? item.toTitle
                                  : item.fromTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyLarge
                                  ?.copyWith(color: AppColors.darkText),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        AppFormatters.formatCurrency(
                          context,
                          item.price,
                          currencyCode: item.currency,
                        ),
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
          ],
        );
      },
    );
  }

  bool _matchesFilter(HistoryOrder order) {
    switch (_filter) {
      case _DriverHistoryFilter.completed:
        return order.status == 'completed';
      case _DriverHistoryFilter.cancelled:
        return order.status.startsWith('cancelled');
      case _DriverHistoryFilter.all:
        return true;
    }
  }
}

enum _DriverHistoryFilter { all, completed, cancelled }

class _DriverHistoryFuture extends StatelessWidget {
  const _DriverHistoryFuture({required this.builder});

  final Widget Function(BuildContext context, OrderHistoryPage page) builder;

  @override
  Widget build(BuildContext context) {
    final repository = serviceLocator<ExecutorRepository>();
    return FutureBuilder(
      future: repository.fetchOrderHistory(limit: 50),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final result = snapshot.data!;
        return result.fold(
          (Failure failure) => Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                ErrorMessageLocalizer.resolve(
                  AppLocalizations.of(context)!,
                  failure.message,
                ),
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
              ),
            ),
          ),
          (page) => builder(context, page),
        );
      },
    );
  }
}

class _DriverProfileTab extends StatelessWidget {
  const _DriverProfileTab({required this.profile});

  final ExecutorProfile profile;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final name = profile.name.trim().isEmpty
        ? l10n.driverDefaultName
        : profile.name.trim();
    final vehicleSubtitle = _vehicleSubtitle(l10n, profile);
    return ListView(
      padding: const EdgeInsets.only(top: AppSpacing.xl),
      children: [
        DosCard(
          color: AppColors.primary,
          borderColor: AppColors.primary,
          child: Column(
            children: [
              const DosAvatar(initials: 'A', radius: 36),
              const SizedBox(height: AppSpacing.md),
              Text(name, style: Theme.of(context).textTheme.titleLarge),
              Text(
                AppFormatters.formatKazakhstanPhone(profile.phone),
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AppColors.text),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _DriverStat(
                      label: l10n.driverRatingLabel,
                      value: '4.92',
                    ),
                  ),
                  Expanded(
                    child: _DriverStat(
                      label: l10n.driverActivityLabel,
                      value: '85%',
                    ),
                  ),
                  Expanded(
                    child: _DriverStat(
                      label: l10n.driverTripsLabel,
                      value: '120',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        DosCard(
          color: AppColors.surface,
          child: Column(
            children: [
              _DriverProfileTile(
                icon: Icons.person_rounded,
                title: l10n.profileTitle,
                subtitle: l10n.driverProfilePersonalSubtitle,
                onTap: () => _showDriverProfileEditSheet(context),
              ),
              _DriverProfileTile(
                icon: Icons.account_balance_wallet_rounded,
                title: l10n.driverBalanceTopUpTitle,
                subtitle: l10n.driverBalanceTopUpSubtitle,
                onTap: () => _showBalanceTopUpSheet(context),
              ),
              _DriverProfileTile(
                icon: Icons.directions_car_rounded,
                title: l10n.driverCarLabel,
                subtitle: vehicleSubtitle,
                onTap: () => _showVehicleSettingsSheet(context),
              ),
              _DriverProfileTile(
                icon: Icons.support_agent_rounded,
                title: l10n.commonSupport,
                subtitle: l10n.driverProfileSupportSubtitle,
                onTap: () => context.push(SupportChatScreen.routePath),
              ),
              _DriverProfileTile(
                icon: Icons.settings_rounded,
                title: l10n.commonSettings,
                subtitle: l10n.driverProfileSettingsSubtitle,
                onTap: () => _showSettingsSheet(context),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _vehicleSubtitle(AppLocalizations l10n, ExecutorProfile profile) {
    if (profile.isCourier && profile.vehicleType != null) {
      return switch (profile.vehicleType) {
        'bicycle' => l10n.deliveryVehicleBicycle,
        'moped' => l10n.deliveryVehicleMoped,
        'scooter' => l10n.deliveryVehicleScooter,
        'car' => l10n.deliveryVehicleCar,
        _ => l10n.driverDefaultCar,
      };
    }

    final parts = [
      profile.vehicleMake,
      profile.vehicleModel,
      if (profile.vehicleYear != null) profile.vehicleYear.toString(),
      profile.vehicleColor,
    ].whereType<String>().where((item) => item.trim().isNotEmpty).join(' ');
    final plate = profile.vehiclePlate?.trim();
    if (parts.isNotEmpty && plate != null && plate.isNotEmpty) {
      return '$parts · $plate';
    }
    if (parts.isNotEmpty) {
      return parts;
    }
    if (plate != null && plate.isNotEmpty) {
      return plate;
    }

    return l10n.driverDefaultCar;
  }

  void _showSettingsSheet(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.darkSurface,
      builder: (sheetContext) => BlocProvider.value(
        value: context.read<ProfileSettingsCubit>(),
        child: _DriverProfileDetailsSheet(
          title: l10n.commonSettings,
          subtitle: l10n.driverProfileSettingsSubtitle,
          icon: Icons.settings_rounded,
          rows: [
            (l10n.profileLanguageLabel, l10n.profileLanguageRu),
            (
              l10n.driverProfileAppVersionLabel,
              l10n.driverProfileAppVersionValue,
            ),
          ],
          actions: [
            BlocBuilder<ProfileSettingsCubit, ProfileSettingsState>(
              builder: (context, settingsState) {
                final settingsCubit = context.read<ProfileSettingsCubit>();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      l10n.profileLanguageLabel,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => settingsCubit.changeLocale('ru'),
                            child: Text(l10n.profileLanguageRu),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => settingsCubit.changeLocale('kk'),
                            child: Text(l10n.profileLanguageKk),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      l10n.profileThemeLabel,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor:
                                  settingsState.themeMode == ThemeMode.light
                                  ? AppColors.primary
                                  : null,
                            ),
                            onPressed: () =>
                                settingsCubit.changeThemeMode(ThemeMode.light),
                            child: Text(l10n.profileThemeLight),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor:
                                  settingsState.themeMode == ThemeMode.dark
                                  ? AppColors.primary
                                  : null,
                            ),
                            onPressed: () =>
                                settingsCubit.changeThemeMode(ThemeMode.dark),
                            child: Text(l10n.profileThemeDark),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  context.push(LegalScreen.privacyRoutePath);
                },
                icon: const Icon(Icons.privacy_tip_rounded),
                label: Text(l10n.legalPrivacyTitle),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  context.push(LegalScreen.termsRoutePath);
                },
                icon: const Icon(Icons.description_rounded),
                label: Text(l10n.legalTermsTitle),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () async {
                  final confirmed = await _confirmDeleteAccount(context);
                  if (!context.mounted || confirmed != true) {
                    return;
                  }
                  Navigator.of(sheetContext).pop();
                  context.read<IncomingOrderCubit>().stopListening();
                  context.read<ExecutorStatusCubit>().resetLocalSession();
                  await context.read<AuthCubit>().deleteAccount();
                  if (context.mounted) {
                    context.go(PhoneInputScreen.routePath);
                  }
                },
                icon: const Icon(Icons.delete_forever_rounded),
                label: Text(l10n.accountDeleteTitle),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  context.read<IncomingOrderCubit>().stopListening();
                  context.read<ExecutorStatusCubit>().resetLocalSession();
                  context.read<AuthCubit>().signOut();
                  context.go(PhoneInputScreen.routePath);
                },
                icon: const Icon(Icons.logout_rounded),
                label: Text(l10n.profileSignOutAction),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool?> _confirmDeleteAccount(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.accountDeleteConfirmTitle),
        content: Text(l10n.accountDeleteConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(l10n.commonCancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(l10n.accountDeleteAction),
          ),
        ],
      ),
    );
  }

  void _showVehicleSettingsSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppColors.darkSurface,
      builder: (_) => BlocProvider.value(
        value: context.read<ExecutorStatusCubit>(),
        child: _DriverVehicleSettingsSheet(profile: profile),
      ),
    );
  }

  void _showDriverProfileEditSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppColors.darkSurface,
      builder: (_) => BlocProvider.value(
        value: context.read<ExecutorStatusCubit>(),
        child: _DriverPersonalSettingsSheet(profile: profile),
      ),
    );
  }

  void _showBalanceTopUpSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppColors.darkSurface,
      builder: (_) => BlocProvider.value(
        value: context.read<ExecutorStatusCubit>(),
        child: const _DriverBalanceTopUpSheet(),
      ),
    );
  }
}

class _DriverPersonalSettingsSheet extends StatefulWidget {
  const _DriverPersonalSettingsSheet({required this.profile});

  final ExecutorProfile profile;

  @override
  State<_DriverPersonalSettingsSheet> createState() =>
      _DriverPersonalSettingsSheetState();
}

class _DriverPersonalSettingsSheetState
    extends State<_DriverPersonalSettingsSheet> {
  late final TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profile.name);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final isLoading = context.watch<ExecutorStatusCubit>().state.isLoading;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md + bottomInset,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.person_rounded),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.profileTitle,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                      Text(
                        l10n.driverProfilePersonalSubtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.darkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            _DarkTextField(
              controller: _nameController,
              label: l10n.profileNameLabel,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: AppSpacing.sm),
            _DriverReadonlyRow(
              label: l10n.profilePhoneLabel,
              value: AppFormatters.formatKazakhstanPhone(widget.profile.phone),
            ),
            const SizedBox(height: AppSpacing.sm),
            _DriverReadonlyRow(
              label: l10n.driverProfileVerificationStatusLabel,
              value: _verificationStatusLabel(
                widget.profile.verificationStatus,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              l10n.driverProfileReviewNotice,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: AppColors.darkMuted),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isLoading
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: Text(l10n.commonCancel),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _save,
                    child: isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.commonSave),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final name = _nameController.text.trim();
    if (name.length < 2) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.profileNameRequired)));
      return;
    }

    final saved = await context.read<ExecutorStatusCubit>().updateDriverProfile(
      name: name,
    );
    if (!mounted || !saved) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n.driverProfileSaveSuccess)));
    Navigator.of(context).pop();
  }

  String _verificationStatusLabel(String status) {
    return switch (status) {
      'verified' => 'Одобрен',
      'rejected' => 'Отклонён',
      'pending' => 'На проверке',
      _ => 'На проверке',
    };
  }
}

class _DriverReadonlyRow extends StatelessWidget {
  const _DriverReadonlyRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurfaceAlt,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.darkText),
            ),
          ),
        ],
      ),
    );
  }
}

class _DriverBalanceTopUpSheet extends StatefulWidget {
  const _DriverBalanceTopUpSheet();

  @override
  State<_DriverBalanceTopUpSheet> createState() =>
      _DriverBalanceTopUpSheetState();
}

class _DriverBalanceTopUpSheetState extends State<_DriverBalanceTopUpSheet> {
  final _amountController = TextEditingController();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final isLoading = context.watch<ExecutorStatusCubit>().state.isLoading;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md + bottomInset,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.driverBalanceTopUpTitle,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppColors.darkText,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              l10n.driverBalanceTopUpSubtitle,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
            ),
            const SizedBox(height: AppSpacing.md),
            _DarkTextField(
              controller: _amountController,
              label: l10n.driverBalanceTopUpAmountLabel,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            ),
            const SizedBox(height: AppSpacing.sm),
            _DarkTextField(
              controller: _phoneController,
              label: l10n.driverBalanceTopUpPhoneLabel,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s()\-]')),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(
              onPressed: isLoading ? null : _submit,
              child: isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.driverBalanceTopUpSubmit),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    final phone = _phoneController.text.trim();
    if (amount < 100 || phone.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.driverBalanceTopUpInvalid)));
      return;
    }
    final sent = await context.read<ExecutorStatusCubit>().requestBalanceTopUp(
      amount: amount,
      phone: phone,
    );
    if (!mounted || !sent) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n.driverBalanceTopUpSuccess)));
    Navigator.of(context).pop();
  }
}

class _DriverVehicleSettingsSheet extends StatefulWidget {
  const _DriverVehicleSettingsSheet({required this.profile});

  final ExecutorProfile profile;

  @override
  State<_DriverVehicleSettingsSheet> createState() =>
      _DriverVehicleSettingsSheetState();
}

class _DriverVehicleSettingsSheetState
    extends State<_DriverVehicleSettingsSheet> {
  late final TextEditingController _makeController;
  late final TextEditingController _modelController;
  late final TextEditingController _yearController;
  late final TextEditingController _colorController;
  late final TextEditingController _plateController;
  late Set<String> _enabledTariffs;

  @override
  void initState() {
    super.initState();
    _makeController = TextEditingController(
      text: widget.profile.vehicleMake ?? '',
    );
    _modelController = TextEditingController(
      text: widget.profile.vehicleModel ?? '',
    );
    _yearController = TextEditingController(
      text: widget.profile.vehicleYear?.toString() ?? '',
    );
    _colorController = TextEditingController(
      text: widget.profile.vehicleColor ?? '',
    );
    _plateController = TextEditingController(
      text: widget.profile.vehiclePlate ?? '',
    );
    _enabledTariffs = widget.profile.enabledTariffs.toSet();
    if (_enabledTariffs.isEmpty) {
      _enabledTariffs.add('economy');
    }
  }

  @override
  void dispose() {
    _makeController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _plateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md + bottomInset,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.directions_car_rounded),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.driverVehicleSettingsTitle,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                      Text(
                        l10n.driverProfileVehicleSubtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.darkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            _DarkDropdownField<String>(
              value: _selectedMake,
              label: l10n.driverOnboardingVehicleMakeLabel,
              items: VehicleCatalog.makes
                  .map(
                    (make) => DropdownMenuItem(
                      value: make.name,
                      child: Text(make.name),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) {
                setState(() {
                  _makeController.text = value ?? '';
                  _modelController.clear();
                });
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            _DarkDropdownField<String>(
              value: _selectedModel,
              label: l10n.driverOnboardingVehicleModelLabel,
              items: VehicleCatalog.modelsFor(_selectedMake)
                  .map(
                    (model) =>
                        DropdownMenuItem(value: model, child: Text(model)),
                  )
                  .toList(growable: false),
              onChanged: _selectedMake == null
                  ? null
                  : (value) {
                      setState(() {
                        _modelController.text = value ?? '';
                      });
                    },
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _DarkDropdownField<int>(
                    value: _selectedYear,
                    label: l10n.driverOnboardingVehicleYearLabel,
                    items: VehicleCatalog.years
                        .map(
                          (year) => DropdownMenuItem(
                            value: year,
                            child: Text(year.toString()),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      setState(() {
                        _yearController.text = value?.toString() ?? '';
                      });
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _DarkDropdownField<String>(
                    value: _selectedColor,
                    label: l10n.driverVehicleColorLabel,
                    items: VehicleCatalog.colors
                        .map(
                          (color) => DropdownMenuItem(
                            value: color,
                            child: Text(color),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      setState(() {
                        _colorController.text = value ?? '';
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            _DarkTextField(
              controller: _plateController,
              label: l10n.driverOnboardingVehiclePlateLabel,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: const [VehiclePlateInputFormatter()],
              helperText: l10n.vehiclePlateFormatHint,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              l10n.driverTariffsTitle,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.darkText,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              l10n.driverChildSeatNotice,
              style: const TextStyle(color: AppColors.darkMuted),
            ),
            for (final tariff in _tariffKeys)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _enabledTariffs.contains(tariff),
                activeColor: AppColors.primary,
                checkColor: AppColors.text,
                title: Text(
                  _tariffLabel(l10n, tariff),
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(color: AppColors.darkText),
                ),
                onChanged: (value) {
                  setState(() {
                    if (value == true) {
                      _enabledTariffs.add(tariff);
                    } else {
                      _enabledTariffs.remove(tariff);
                    }
                    if (_enabledTariffs.isEmpty) {
                      _enabledTariffs.add('economy');
                    }
                  });
                },
              ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(l10n.commonCancel),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _save,
                    child: Text(l10n.commonSave),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final make = _selectedMake;
    final model = _selectedModel;
    final year = _selectedYear;
    final color = _selectedColor;
    final plate = AppFormatters.normalizeVehiclePlate(_plateController.text);
    if (make == null ||
        model == null ||
        year == null ||
        color == null ||
        plate.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.driverOnboardingVehicleDetailsRequired)),
      );
      return;
    }
    if (!AppFormatters.isValidVehiclePlate(plate)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.vehiclePlateFormatHint)));
      return;
    }
    final saved = await context
        .read<ExecutorStatusCubit>()
        .updateVehicleSettings(
          vehicleMake: make,
          vehicleModel: model,
          vehicleYear: year,
          vehicleColor: color,
          vehiclePlate: plate,
          enabledTariffs: _enabledTariffs.toList(growable: false),
        );
    if (!mounted) {
      return;
    }
    if (!saved) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n.driverVehicleSaveSuccess)));
    Navigator.of(context).pop();
  }

  String _tariffLabel(AppLocalizations l10n, String tariff) {
    return switch (tariff) {
      'comfort' => l10n.taxiClassComfort,
      'comfort_plus' => l10n.taxiClassComfortPlus,
      'business' => l10n.taxiClassBusiness,
      'together' => l10n.taxiClassTogether,
      'child' => l10n.taxiClassChild,
      _ => l10n.taxiClassEconomy,
    };
  }

  String? get _selectedMake => VehicleCatalog.makeValue(_makeController.text);

  String? get _selectedModel {
    return VehicleCatalog.modelValue(_selectedMake, _modelController.text);
  }

  int? get _selectedYear {
    final year = int.tryParse(_yearController.text.trim());
    return VehicleCatalog.years.contains(year) ? year : null;
  }

  String? get _selectedColor =>
      VehicleCatalog.colorValue(_colorController.text);

  static const _tariffKeys = [
    'economy',
    'comfort',
    'comfort_plus',
    'business',
    'together',
    'child',
  ];
}

class _DarkTextField extends StatelessWidget {
  const _DarkTextField({
    required this.controller,
    required this.label,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.helperText,
  });

  final TextEditingController controller;
  final String label;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final String? helperText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textCapitalization: textCapitalization,
      inputFormatters: inputFormatters,
      style: const TextStyle(color: AppColors.darkText),
      decoration: InputDecoration(
        labelText: label,
        helperText: helperText,
        helperStyle: const TextStyle(color: AppColors.darkMuted),
        labelStyle: const TextStyle(color: AppColors.darkMuted),
        filled: true,
        fillColor: AppColors.darkSurfaceAlt,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0x22FFFFFF)),
        ),
      ),
    );
  }
}

class _DarkDropdownField<T> extends StatelessWidget {
  const _DarkDropdownField({
    required this.value,
    required this.label,
    required this.items,
    required this.onChanged,
  });

  final T? value;
  final String label;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: AppColors.darkSurfaceAlt,
      style: const TextStyle(color: AppColors.darkText),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.darkMuted),
        filled: true,
        fillColor: AppColors.darkSurfaceAlt,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0x22FFFFFF)),
        ),
      ),
      items: items,
      onChanged: onChanged,
    );
  }
}

class _DriverStat extends StatelessWidget {
  const _DriverStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleMedium),
        Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: AppColors.text, fontSize: 11),
        ),
      ],
    );
  }
}

class _DriverProfileTile extends StatelessWidget {
  const _DriverProfileTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: AppColors.text),
      title: Text(title),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: const Icon(Icons.chevron_right_rounded),
    );
  }
}

class _DriverProfileDetailsSheet extends StatelessWidget {
  const _DriverProfileDetailsSheet({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.rows,
    this.actions = const [],
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final List<(String, String)> rows;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(icon, color: AppColors.text),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppColors.darkText,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.darkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            for (final row in rows)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  row.$1,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.darkMuted),
                ),
                subtitle: Text(
                  row.$2,
                  style: Theme.of(
                    context,
                  ).textTheme.titleMedium?.copyWith(color: AppColors.darkText),
                ),
              ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              ...actions,
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.commonClose),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DriverBars extends StatelessWidget {
  const _DriverBars({required this.orders});

  final List<HistoryOrder> orders;

  @override
  Widget build(BuildContext context) {
    final buckets = List<double>.filled(12, 0);
    for (final order in orders) {
      final hour = order.createdAt.toLocal().hour;
      buckets[(hour / 2).floor().clamp(0, buckets.length - 1)] += order.price;
    }
    final maxValue = buckets.fold<double>(0, (max, value) {
      return value > max ? value : max;
    });
    final values = maxValue <= 0
        ? List<double>.filled(12, 0.08)
        : buckets.map((value) => (value / maxValue).clamp(0.08, 1.0)).toList();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (final value in values)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: FractionallySizedBox(
                heightFactor: value,
                alignment: Alignment.bottomCenter,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _OnlineSwitchPill extends StatelessWidget {
  const _OnlineSwitchPill({
    required this.isOnline,
    required this.isBusy,
    required this.onChanged,
  });

  final bool isOnline;
  final bool isBusy;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return InkWell(
      onTap: isBusy ? null : () => onChanged(!isOnline),
      borderRadius: BorderRadius.circular(20),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: isOnline ? AppColors.success : AppColors.darkSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x22FFFFFF)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isOnline
                    ? l10n.driverDashboardStatusOnline
                    : l10n.driverDashboardStatusOffline,
                style: Theme.of(
                  context,
                ).textTheme.labelLarge?.copyWith(color: AppColors.darkText),
              ),
              const SizedBox(width: AppSpacing.sm),
              Icon(
                isOnline ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
                color: AppColors.darkText,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriverMetric extends StatelessWidget {
  const _DriverMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.darkSurfaceAlt,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(color: AppColors.darkText),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.darkMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ignore: unused_element
class _ExecutorDashboardScreenLegacy extends StatelessWidget {
  const _ExecutorDashboardScreenLegacy();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final statusState = context.watch<ExecutorStatusCubit>().state;
    final incomingState = context.watch<IncomingOrderCubit>().state;
    final profile = statusState.profile;

    if (profile == null) {
      return const _ExecutorLoadingScreen();
    }

    final modeLabel = statusState.demoDashboardEnabled
        ? l10n.driverDashboardModeDemo
        : l10n.driverDashboardModeVerified;

    final heartbeatLabel = statusState.lastPresenceAt == null
        ? '—'
        : AppFormatters.formatTime(context, statusState.lastPresenceAt!);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.driverDashboardTitle),
        actions: [
          IconButton(
            onPressed: () {
              context.read<IncomingOrderCubit>().stopListening();
              context.read<ExecutorStatusCubit>().resetLocalSession();
              context.read<AuthCubit>().signOut();
              context.go(PhoneInputScreen.routePath);
            },
            icon: const Icon(Icons.logout_rounded),
            tooltip: l10n.profileSignOutAction,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        profile.isOnline
                            ? l10n.driverDashboardStatusOnline
                            : l10n.driverDashboardStatusOffline,
                      ),
                      subtitle: Text(
                        incomingState.activeOrderSession != null
                            ? l10n.driverDashboardOpenActiveOrder
                            : l10n.driverDashboardWaitingOffer,
                      ),
                      value: profile.isOnline,
                      onChanged:
                          incomingState.activeOrderSession != null ||
                              statusState.isUpdatingOnline
                          ? null
                          : (value) => context
                                .read<ExecutorStatusCubit>()
                                .updateOnline(value),
                    ),
                    SummaryRow(
                      label: l10n.driverDashboardBalanceLabel,
                      value: AppFormatters.formatCurrency(
                        context,
                        profile.balance,
                        currencyCode: profile.cityCurrency,
                      ),
                      isHighlighted: true,
                    ),
                    SummaryRow(
                      label: l10n.driverDashboardModeLabel,
                      value: modeLabel,
                    ),
                    SummaryRow(
                      label: l10n.driverDashboardHeartbeatLabel,
                      value: heartbeatLabel,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              height: 320,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: ExecutorHeatMap(
                  currentLocation: statusState.currentLocation,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                _LegendChip(
                  color: const Color(0xFFD94F3D),
                  label: l10n.driverDashboardHeatZoneHot,
                ),
                _LegendChip(
                  color: const Color(0xFFF5A623),
                  label: l10n.driverDashboardHeatZoneWarm,
                ),
                _LegendChip(
                  color: const Color(0xFF50B8E7),
                  label: l10n.driverDashboardHeatZoneCool,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            if (incomingState.activeOrderSession != null)
              Card(
                child: ListTile(
                  title: Text(l10n.driverActiveOrderTitle),
                  subtitle: Text(
                    incomingState.activeOrderSession!.destinationAddress,
                  ),
                  trailing: ElevatedButton(
                    onPressed: () =>
                        context.push(ExecutorActiveOrderScreen.routePath),
                    child: Text(l10n.driverDashboardOpenActiveOrder),
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Text(
                  l10n.driverDashboardWaitingOffer,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: CircleAvatar(backgroundColor: color, radius: 8),
      label: Text(label),
    );
  }
}

class _ExecutorLoadingScreen extends StatelessWidget {
  const _ExecutorLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
