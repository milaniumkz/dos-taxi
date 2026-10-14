import 'ride_address_search.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/utils/app_formatters.dart';
import '../../active_order/presentation/screens/active_order_screen.dart';
import '../../home/domain/entities/address_suggestion.dart';
import 'ride_request_cubit.dart';

class RideRequestArgs {
  const RideRequestArgs(this.pickup, this.destination, this.serviceType);
  final AddressSuggestion pickup, destination;
  final String serviceType;
}

class RideRequestScreen extends StatefulWidget {
  const RideRequestScreen({super.key});
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
      builder: (context, s) => Scaffold(
        appBar: AppBar(title: Text(l.rideRequestTitle)),
        body: AbsorbPointer(
          absorbing: s.busy,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.trip_origin),
                      title: Text(cubit.pickup.displayTitle),
                      onTap: () => _address(context, cubit, true),
                    ),
                    ListTile(
                      leading: const Icon(Icons.place),
                      title: Text(cubit.destination.displayTitle),
                      onTap: () => _address(context, cubit, false),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (s.busy) const LinearProgressIndicator(),
              if (s.error != null) ...[
                Text(
                  s.error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                if (s.quote == null)
                  TextButton(
                    onPressed: () => cubit.refreshQuote(),
                    child: Text(l.rideRetry),
                  ),
              ],
              if (s.quote != null) _pricing(context, cubit, s),
              TextField(
                controller: entrance,
                maxLength: 100,
                decoration: InputDecoration(labelText: l.rideEntrance),
              ),
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
                onChanged: (v) => setState(() => child = v ?? false),
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(l.rideTogether),
                subtitle: Text(l.rideTogetherHint),
                value: shared,
                onChanged: (v) => setState(() => shared = v ?? false),
              ),
              const SizedBox(height: 16),
              Text(
                l.ridePayment,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              for (final entry in {
                'cash': l.rideCash,
                'transfer_kaspi': l.rideKaspi,
                'transfer_halyk': l.rideHalyk,
              }.entries)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry.value),
                  leading: Icon(
                    payment == entry.key
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                  ),
                  onTap: () => setState(() => payment = entry.key),
                ),
              const SizedBox(height: 20),
              FilledButton(
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
            ],
          ),
        ),
      ),
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              seat ? l.ridePerSeat : l.ridePerSalon,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (seat)
              RideStepper(
                label: l.ridePassengers,
                value: '$count',
                onMinus: count > 1 ? () => cubit.refreshQuote(count - 1) : null,
                onPlus: count < 8 ? () => cubit.refreshQuote(count + 1) : null,
              ),
            RideStepper(
              label: l.rideYourPrice,
              value: amount(unit),
              onMinus: cubit.steps > 0 ? () => cubit.changePrice(-1) : null,
              onPlus: cubit.steps < 1000 ? () => cubit.changePrice(1) : null,
            ),
            Text(
              '${l.rideTotal}: ${amount(unit * count)}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            Text(
              '${l.rideMinimum}: ${q['minimumOrderPrice']} ${currency == 'RUB' ? '₽' : '₸'}',
            ),
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
  });
  final String label, value;
  final VoidCallback? onMinus, onPlus;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(
      children: [
        Text(label),
        Row(
          children: [
            IconButton.filledTonal(
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
              tooltip: AppLocalizations.of(context)!.rideIncrease,
              onPressed: onPlus,
              icon: const Icon(Icons.add),
            ),
          ],
        ),
      ],
    ),
  );
}
