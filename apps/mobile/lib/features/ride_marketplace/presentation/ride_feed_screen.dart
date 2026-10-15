import 'ride_poll_lifecycle.dart';
import 'driver_offer_wait_gate.dart';
import '../../executor/presentation/widgets/driver_bonus_progress_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/utils/app_formatters.dart';
import '../../executor/presentation/cubit/executor_status_cubit.dart';
import '../../executor/presentation/cubit/incoming_order_cubit.dart';
import '../domain/ride_repository.dart';
import 'ride_poll_cubit.dart';
import 'ride_request_screen.dart';

class RideFeedScreen extends StatelessWidget {
  const RideFeedScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final status = context.watch<ExecutorStatusCubit>().state;
    final l = AppLocalizations.of(context)!;
    final online = status.profile?.isOnline == true;
    return Column(
      children: [
        Text(
          '${l.driverDashboardBalanceLabel}: ${AppFormatters.formatCurrency(context, status.profile?.balance ?? 0, currencyCode: status.profile?.cityCurrency ?? 'KZT', decimalDigits: status.profile?.cityCurrency == 'RUB' ? 2 : 0)}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        ExpansionTile(
          dense: true,
          visualDensity: VisualDensity.compact,
          tilePadding: EdgeInsets.zero,
          title: Text(l.driverBonusesLabel),
          children: [
            DriverBonusProgressCard(balance: status.profile?.balance ?? 0),
          ],
        ),
        const SizedBox(height: 4),
        Expanded(
          child: online
              ? _onlineFeed(context, status)
              : Center(child: Text(l.rideOffline)),
        ),
      ],
    );
  }

  Widget _onlineFeed(BuildContext context, ExecutorStatusState status) {
    final repo = serviceLocator<RideRepository>();
    var lat = status.currentLocation.latitude,
        lng = status.currentLocation.longitude;
    return BlocProvider(
      key: ValueKey(status.profile!.id),
      create: (_) => RidePollCubit(repo, () async {
        final current = context.read<ExecutorStatusCubit>().state;
        if (current.profile != null) {
          await context.read<IncomingOrderCubit>().synchronizeDashboardSession(
            current.profile!,
          );
        }
        lat = current.currentLocation.latitude;
        lng = current.currentLocation.longitude;
        return repo.feed(lat, lng, 0);
      }, nextPage: (offset) => repo.feed(lat, lng, offset))..start(),
      child: const RidePollLifecycle(
        child: DriverOfferWaitGate(child: _FeedBody()),
      ),
    );
  }
}

class _FeedBody extends StatelessWidget {
  const _FeedBody();
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return BlocBuilder<RidePollCubit, RidePollState>(
      builder: (context, state) {
        final cubit = context.read<RidePollCubit>();
        final items = state.data?['items'] as List? ?? [];
        return LayoutBuilder(
          builder: (context, constraints) => RefreshIndicator(
            onRefresh: cubit.refresh,
            child: ListView(
              padding: EdgeInsets.zero,
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (state.loading) const LinearProgressIndicator(),
                if (state.error != null)
                  Text(
                    state.error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                if (items.isEmpty && !state.loading)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(l.rideFeedEmpty),
                  ),
                for (final raw in items)
                  SizedBox(
                    height: constraints.maxHeight / 4,
                    child: _CompactRequestCard(
                      key: ValueKey((raw as Map)['id']),
                      request: Map<String, dynamic>.from(raw),
                      disabled: state.actionId != null,
                    ),
                  ),
                if (state.data?['nextOffset'] != null)
                  TextButton(
                    onPressed: state.actionId != null ? null : cubit.more,
                    child: Text(l.rideNext),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CompactRequestCard extends StatelessWidget {
  const _CompactRequestCard({
    super.key,
    required this.request,
    required this.disabled,
  });
  final Map<String, dynamic> request;
  final bool disabled;
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!,
        points = request['routePoints'] as List;
    final price = AppFormatters.formatCurrency(
      context,
      double.parse(request['totalPrice'].toString()),
      currencyCode: request['currency'] as String,
      decimalDigits: request['currency'] == 'RUB' ? 2 : 0,
    );
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 2),
      child: InkWell(
        onTap: disabled ? null : () => _details(context),
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.trip_origin, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      (points.first as Map)['address'].toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, height: 1.1),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(Icons.place, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      (points.last as Map)['address'].toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, height: 1.1),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Text(
                    price,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.people_outline, size: 14),
                  Text(
                    ' ${request['passengerCount']} · ${((request['pickupDistanceMeters'] as num) / 1000).toStringAsFixed(1)} ${l.rideKilometres}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  const Icon(Icons.chevron_right, size: 18),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _details(BuildContext context) async {
    final cubit = context.read<RidePollCubit>();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => BlocProvider.value(
        value: cubit,
        child: BlocConsumer<RidePollCubit, RidePollState>(
          listener: (_, state) {
            if (state.data?['pendingOffer'] != null) {
              final route = ModalRoute.of(sheetContext);
              if (route != null && route.isActive) {
                Navigator.of(sheetContext).removeRoute(route);
              }
            }
          },
          builder: (context, state) {
            final items = state.data?['items'] as List? ?? [];
            final current = items
                .cast<Map>()
                .where((r) => r['id'] == request['id'])
                .firstOrNull;
            return ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(context).height * .9,
              ),
              child: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.paddingOf(context).bottom + 16,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 12),
                      const Icon(Icons.drag_handle),
                      if (state.error != null)
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(
                            state.error!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                      _RequestDetails(
                        request: current == null
                            ? request
                            : Map<String, dynamic>.from(current),
                        disabled: state.actionId != null,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RequestDetails extends StatefulWidget {
  const _RequestDetails({required this.request, required this.disabled});
  final Map<String, dynamic> request;
  final bool disabled;
  @override
  State<_RequestDetails> createState() => _RequestDetailsState();
}

class _RequestDetailsState extends State<_RequestDetails> {
  int steps = 0;
  bool childSeat = false;
  @override
  void initState() {
    super.initState();
    steps =
        ((widget.request['myOffer'] as Map?)?['priceSteps'] as num?)?.toInt() ??
        0;
    childSeat = (widget.request['myOffer'] as Map?)?['hasChildSeat'] == true;
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.request,
        l = AppLocalizations.of(context)!,
        cubit = context.read<RidePollCubit>();
    final points = r['routePoints'] as List;
    final unit = (double.parse(r['unitPrice'].toString()) * 100).round(),
        step = (double.parse(r['priceStep'].toString()) * 100).round();
    final minimum = (double.parse(r['minimumUnitPrice'].toString()) * 100)
        .round();
    final count = (r['passengerCount'] as num).toInt(),
        price = unit + step * steps;
    String amount(int cents) => AppFormatters.formatCurrency(
      context,
      cents / 100,
      currencyCode: r['currency'] as String,
      decimalDigits: r['currency'] == 'RUB' ? 2 : 0,
    );
    final offer = r['myOffer'] as Map?;
    final pending =
        offer?['status'] == 'pending' &&
        DateTime.tryParse(
              offer?['expiresAt']?.toString() ?? '',
            )?.isAfter(DateTime.now()) ==
            true;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${l.ridePickupDistance}: ${((r['pickupDistanceMeters'] as num) / 1000).toStringAsFixed(1)} ${l.rideKilometres}',
            ),
            RideRouteSummary(
              pickup: (points.first as Map)['address'].toString(),
              destination: (points.last as Map)['address'].toString(),
            ),
            if (r['pricingBasis'] == 'seat')
              Text('${l.ridePassengers}: $count'),
            if ((r['pickupEntrance']?.toString() ?? '').isNotEmpty)
              Text('${l.rideEntrance}: ${r['pickupEntrance']}'),
            if ((r['pickupComment']?.toString() ?? '').isNotEmpty)
              Text('${l.rideComment}: ${r['pickupComment']}'),
            if (r['sharedRide'] == true) Text(l.rideTogether),
            Text(switch (r['paymentMethod']) {
              'transfer_kaspi' => l.rideKaspi,
              'transfer_halyk' => l.rideHalyk,
              _ => l.rideCash,
            }),
            RideStepper(
              label: r['pricingBasis'] == 'seat'
                  ? l.ridePerSeat
                  : l.ridePerSalon,
              value: amount(price),
              onMinus:
                  widget.disabled || price - step < minimum || steps <= -1000
                  ? null
                  : () => setState(() => steps--),
              onPlus: widget.disabled || steps >= 1000
                  ? null
                  : () => setState(() => steps++),
            ),
            Text(
              '${l.rideTotal}: ${amount(price * count)}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (r['needsChildSeat'] == true)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(l.rideConfirmChildSeat),
                value: childSeat,
                onChanged: widget.disabled
                    ? null
                    : (v) => setState(() => childSeat = v ?? false),
              ),
            if (pending) Text(l.ridePending),
            FilledButton(
              onPressed:
                  widget.disabled || (r['needsChildSeat'] == true && !childSeat)
                  ? null
                  : () => cubit.propose(r['id'] as String, steps, childSeat),
              child: Text(l.ridePropose),
            ),
            if (pending)
              TextButton(
                onPressed: widget.disabled
                    ? null
                    : () => cubit.withdraw(r['id'] as String),
                child: Text(l.rideWithdraw),
              ),
          ],
        ),
      ),
    );
  }
}
