import 'ride_address_search.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/utils/app_formatters.dart';
import '../../../core/theme/app_colors.dart';
import '../../active_order/presentation/screens/active_order_screen.dart';
import '../../home/domain/entities/address_suggestion.dart';
import 'ride_request_cubit.dart';

class RideRequestArgs {
  const RideRequestArgs(this.pickup, this.destination, this.serviceType);
  final AddressSuggestion pickup, destination;
  final String serviceType;
}

class RideRequestScreen extends StatefulWidget {
  const RideRequestScreen({super.key, this.embedded = false});
  final bool embedded;
  static const routePath = '/ride-request';
  @override
  State<RideRequestScreen> createState() => _RideRequestScreenState();
}

class _RideRequestScreenState extends State<RideRequestScreen> {
  final entrance = TextEditingController(), comment = TextEditingController();
  String payment = 'cash';
  bool child = false, shared = false;
  @override
  void dispose() {
    entrance.dispose();
    comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final cubit = context.read<RideRequestCubit>();
    return BlocConsumer<RideRequestCubit, RideRequestState>(
      listener: (context, s) {
        if (s.created != null) {
          context.go(ActiveOrderScreen.routePath, extra: s.created);
        }
      },
      builder: (context, s) => widget.embedded
          ? _inline(context, cubit, s)
          : Scaffold(
              appBar: AppBar(title: Text(l.rideRequestTitle)),
              bottomNavigationBar: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (s.quote != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Text(
                                l.rideTotal,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const Spacer(),
                              Text(
                                _total(context, cubit, s),
                                key: const ValueKey('ride-total'),
                                style: Theme.of(context).textTheme.headlineSmall
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: s.quote == null || s.busy
                              ? null
                              : () => cubit.submit(
                                  payment: payment,
                                  entrance: entrance.text,
                                  comment: comment.text,
                                  childSeat: child,
                                  shared: shared,
                                ),
                          child: Text(l.rideSubmit),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              body: AbsorbPointer(
                absorbing: s.busy,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                  children: [
                    Card(
                      margin: EdgeInsets.zero,
                      child: Column(
                        children: [
                          _routeRow(
                            context,
                            cubit.pickup.displayTitle,
                            Icons.trip_origin,
                            () => _address(context, cubit, true),
                          ),
                          Divider(
                            height: 1,
                            indent: 42,
                            endIndent: 12,
                            color: Theme.of(context).colorScheme.outlineVariant,
                          ),
                          _routeRow(
                            context,
                            cubit.destination.displayTitle,
                            Icons.place,
                            () => _address(context, cubit, false),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (s.busy) const LinearProgressIndicator(),
                    if (s.error != null) ...[
                      Text(
                        s.error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      if (s.quote == null)
                        TextButton(
                          onPressed: () => cubit.refreshQuote(),
                          child: Text(l.rideRetry),
                        ),
                    ],
                    if (s.quote != null) _pricing(context, cubit, s),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: entrance,
                            maxLength: 100,
                            decoration: InputDecoration(
                              labelText: l.rideEntrance,
                              counterText: '',
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _details(context),
                            icon: const Icon(Icons.tune, size: 18),
                            label: Text(l.rideExtras),
                          ),
                        ),
                      ],
                    ),
                    if (child || shared || comment.text.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          [
                            if (child) l.rideChildSeat,
                            if (shared) l.rideTogether,
                            if (comment.text.trim().isNotEmpty)
                              comment.text.trim(),
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        leading: const Icon(Icons.payments_outlined),
                        title: Text(
                          l.ridePayment,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        subtitle: Text(
                          _payments(l)[payment]!,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _payment(context),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _inline(
    BuildContext context,
    RideRequestCubit cubit,
    RideRequestState s,
  ) {
    final l = AppLocalizations.of(context)!;
    return AbsorbPointer(
      absorbing: s.busy,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (s.busy) const LinearProgressIndicator(minHeight: 2),
          if (s.error != null)
            Row(
              children: [
                Expanded(
                  child: Text(
                    s.error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
                if (s.quote == null)
                  TextButton(
                    onPressed: cubit.refreshQuote,
                    child: Text(l.rideRetry),
                  ),
              ],
            ),
          if (s.quote != null) _pricing(context, cubit, s),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: entrance,
                  maxLength: 100,
                  decoration: InputDecoration(
                    labelText: l.rideEntranceShort,
                    counterText: '',
                    isDense: true,
                    contentPadding: const EdgeInsets.all(10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: comment,
                  maxLength: 1000,
                  decoration: InputDecoration(
                    labelText: l.rideCommentShort,
                    counterText: '',
                    isDense: true,
                    contentPadding: const EdgeInsets.all(10),
                  ),
                ),
              ),
            ],
          ),
          Wrap(
            spacing: 6,
            children: [
              FilterChip(
                label: Text(l.rideChildSeat),
                selected: child,
                onSelected: (v) => setState(() => child = v),
                visualDensity: VisualDensity.compact,
              ),
              FilterChip(
                label: Text(l.rideTogether),
                selected: shared,
                onSelected: (v) => setState(() => shared = v),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          Row(
            children: [
              Icon(
                Icons.payments_outlined,
                size: 18,
                semanticLabel: l.ridePayment,
              ),
              const SizedBox(width: 6),
              for (final entry in _payments(l).entries)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: ChoiceChip(
                      label: SizedBox(
                        width: double.infinity,
                        child: Text(
                          entry.value,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: payment == entry.key,
                      showCheckmark: false,
                      visualDensity: VisualDensity.compact,
                      labelPadding: const EdgeInsets.symmetric(horizontal: 2),
                      onSelected: (_) => setState(() => payment = entry.key),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.rideTotal,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      s.quote == null ? '—' : _total(context, cubit, s),
                      key: const ValueKey('ride-total'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: s.quote == null || s.busy
                      ? null
                      : () => cubit.submit(
                          payment: payment,
                          entrance: entrance.text,
                          comment: comment.text,
                          childSeat: child,
                          shared: shared,
                        ),
                  child: Text(l.rideSubmit),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Map<String, String> _payments(AppLocalizations l) => {
    'cash': l.rideCash,
    'transfer_kaspi': l.rideKaspi,
    'transfer_halyk': l.rideHalyk,
  };

  Widget _routeRow(
    BuildContext context,
    String address,
    IconData icon,
    VoidCallback edit,
  ) => InkWell(
    onTap: edit,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              address,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          const Icon(Icons.edit_outlined, size: 16),
        ],
      ),
    ),
  );

  Future<void> _payment(BuildContext context) async {
    final l = AppLocalizations.of(context)!;
    final selected = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (sheet) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              l.ridePayment,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          for (final entry in _payments(l).entries)
            ListTile(
              title: Text(entry.value),
              leading: Icon(
                payment == entry.key
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
              ),
              onTap: () => Navigator.pop(sheet, entry.key),
            ),
          const SizedBox(height: 16),
        ],
      ),
    );
    if (selected != null && mounted) setState(() => payment = selected);
  }

  Future<void> _details(BuildContext context) async {
    final l = AppLocalizations.of(context)!;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheet) => StatefulBuilder(
        builder: (sheet, refresh) => SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              16,
              16,
              MediaQuery.viewInsetsOf(sheet).bottom + 16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.rideExtras,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: comment,
                  maxLength: 1000,
                  maxLines: 2,
                  decoration: InputDecoration(labelText: l.rideComment),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l.rideChildSeat),
                  value: child,
                  onChanged: (v) => refresh(() => child = v ?? false),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l.rideTogether),
                  subtitle: Text(l.rideTogetherHint),
                  value: shared,
                  onChanged: (v) => refresh(() => shared = v ?? false),
                ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(sheet),
                    child: Text(l.rideExtrasDone),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  String _total(
    BuildContext context,
    RideRequestCubit cubit,
    RideRequestState state,
  ) {
    final q = state.quote!, count = (q['passengerCount'] as num).toInt();
    final unit =
        (double.parse(q['minimumUnitPrice'].toString()) * 100).round() +
        cubit.steps * (double.parse(q['priceStep'].toString()) * 100).round();
    return AppFormatters.formatCurrency(
      context,
      unit * count / 100,
      currencyCode: q['currency'].toString(),
      decimalDigits: q['currency'] == 'RUB' ? 2 : 0,
    );
  }

  Future<void> _address(
    BuildContext context,
    RideRequestCubit cubit,
    bool pickup,
  ) async {
    final l = AppLocalizations.of(context)!;
    final selected = await showSearch<AddressSuggestion?>(
      context: context,
      delegate: RideAddressSearch(
        cubit.pickup,
        pickup ? l.activeOrderDetailFrom : l.activeOrderDetailTo,
      ),
    );
    if (selected != null && !cubit.isClosed) {
      await cubit.changeAddress(selected, isPickup: pickup);
    }
  }

  Widget _inlineStepper(
    BuildContext context, {
    required String label,
    required String value,
    VoidCallback? onMinus,
    VoidCallback? onPlus,
  }) {
    final l = AppLocalizations.of(context)!;
    Widget button(IconData icon, VoidCallback? action, String tooltip) =>
        SizedBox(
          width: 40,
          height: 40,
          child: IconButton.filledTonal(
            onPressed: action,
            tooltip: tooltip,
            padding: EdgeInsets.zero,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.text,
              disabledForegroundColor: AppColors.muted,
              disabledBackgroundColor: AppColors.surfaceAlt,
            ),
            icon: Icon(icon, size: 20),
          ),
        );
    return Column(
      children: [
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            button(Icons.remove, onMinus, l.rideDecrease),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    value,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
            ),
            button(Icons.add, onPlus, l.rideIncrease),
          ],
        ),
      ],
    );
  }

  Widget _pricing(
    BuildContext context,
    RideRequestCubit cubit,
    RideRequestState state,
  ) {
    final l = AppLocalizations.of(context)!;
    final q = state.quote!;
    final seat = q['pricingBasis'] == 'seat';
    final count = (q['passengerCount'] as num).toInt();
    final unit =
        (double.parse(q['minimumUnitPrice'].toString()) * 100).round() +
        cubit.steps * (double.parse(q['priceStep'].toString()) * 100).round();
    final currency = q['currency'].toString();
    String amount(int cents) => AppFormatters.formatCurrency(
      context,
      cents / 100,
      currencyCode: currency,
      decimalDigits: currency == 'RUB' ? 2 : 0,
    );
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    seat ? l.ridePerSeat : l.ridePerSalon,
                    maxLines: 2,
                    style: widget.embedded
                        ? Theme.of(context).textTheme.bodySmall
                        : Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    '${l.rideMinimum}: ${amount((double.parse(q['minimumOrderPrice'].toString()) * 100).round())}',
                    maxLines: 2,
                    textAlign: TextAlign.right,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            if (widget.embedded)
              Row(
                children: [
                  if (seat) ...[
                    Expanded(
                      child: _inlineStepper(
                        context,
                        label: l.ridePassengers,
                        value: '$count',
                        onMinus: count > 1
                            ? () => cubit.refreshQuote(count - 1)
                            : null,
                        onPlus: count < 8
                            ? () => cubit.refreshQuote(count + 1)
                            : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: _inlineStepper(
                      context,
                      label: l.rideYourPrice,
                      value: amount(unit),
                      onMinus: cubit.steps > 0
                          ? () => cubit.changePrice(-1)
                          : null,
                      onPlus: cubit.steps < 1000
                          ? () => cubit.changePrice(1)
                          : null,
                    ),
                  ),
                ],
              )
            else ...[
              if (seat)
                RideStepper(
                  compact: true,
                  label: l.ridePassengers,
                  value: '$count',
                  onMinus: count > 1
                      ? () => cubit.refreshQuote(count - 1)
                      : null,
                  onPlus: count < 8
                      ? () => cubit.refreshQuote(count + 1)
                      : null,
                ),
              RideStepper(
                compact: true,
                label: l.rideYourPrice,
                value: amount(unit),
                onMinus: cubit.steps > 0 ? () => cubit.changePrice(-1) : null,
                onPlus: cubit.steps < 1000 ? () => cubit.changePrice(1) : null,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class RideRouteSummary extends StatelessWidget {
  const RideRouteSummary({
    super.key,
    required this.pickup,
    required this.destination,
  });
  final String pickup, destination;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.trip_origin, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(pickup)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.place, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(destination)),
            ],
          ),
        ],
      ),
    ),
  );
}

class RideStepper extends StatelessWidget {
  const RideStepper({
    super.key,
    required this.label,
    required this.value,
    this.onMinus,
    this.onPlus,
    this.compact = false,
  });
  final String label, value;
  final bool compact;
  final VoidCallback? onMinus, onPlus;
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.symmetric(vertical: compact ? 2 : 8),
    child: compact
        ? Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              SizedBox(width: 180, child: _controls(context)),
            ],
          )
        : Column(children: [Text(label), _controls(context)]),
  );

  Widget _controls(BuildContext context) => Row(
    children: [
      IconButton.filledTonal(
        style: IconButton.styleFrom(
          foregroundColor: AppColors.text,
          backgroundColor: AppColors.primary,
          disabledForegroundColor: AppColors.muted,
          disabledBackgroundColor: AppColors.surfaceAlt,
        ),
        tooltip: AppLocalizations.of(context)!.rideDecrease,
        onPressed: onMinus,
        icon: const Icon(Icons.remove),
      ),
      Expanded(
        child: Text(
          value,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
      IconButton.filledTonal(
        style: IconButton.styleFrom(
          foregroundColor: AppColors.text,
          backgroundColor: AppColors.primary,
          disabledForegroundColor: AppColors.muted,
          disabledBackgroundColor: AppColors.surfaceAlt,
        ),
        tooltip: AppLocalizations.of(context)!.rideIncrease,
        onPressed: onPlus,
        icon: const Icon(Icons.add),
      ),
    ],
  );
}
