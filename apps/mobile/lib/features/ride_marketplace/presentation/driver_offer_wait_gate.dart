import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/utils/app_formatters.dart';
import 'ride_poll_cubit.dart';

class DriverOfferWaitGate extends StatefulWidget {
  const DriverOfferWaitGate({super.key, required this.child});
  final Widget child;
  @override
  State<DriverOfferWaitGate> createState() => _DriverOfferWaitGateState();
}

class _DriverOfferWaitGateState extends State<DriverOfferWaitGate> {
  DialogRoute<void>? _route;
  NavigatorState? _navigator;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _sync(context.read<RidePollCubit>().state);
    });
  }

  void _sync(RidePollState state) {
    final pending = state.data?['pendingOffer'];
    if (pending is Map && _route == null) {
      _navigator = Navigator.of(context, rootNavigator: true);
      final cubit = context.read<RidePollCubit>();
      _route = DialogRoute<void>(
        context: context,
        barrierDismissible: false,
        builder: (_) =>
            BlocProvider.value(value: cubit, child: const _WaitingOffer()),
      );
      _navigator!.push(_route!);
    } else if (pending == null) {
      _remove();
    }
  }

  void _remove() {
    final route = _route;
    _route = null;
    if (route != null && route.isActive) _navigator?.removeRoute(route);
  }

  @override
  void dispose() {
    final route = _route, navigator = _navigator;
    _route = null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (route != null && route.isActive && navigator?.mounted == true) {
        navigator!.removeRoute(route);
      }
    });
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      BlocListener<RidePollCubit, RidePollState>(
        listener: (_, s) => _sync(s),
        child: widget.child,
      );
}

class _WaitingOffer extends StatelessWidget {
  const _WaitingOffer();
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    child: BlocBuilder<RidePollCubit, RidePollState>(
      builder: (context, state) {
        final l = AppLocalizations.of(context)!,
            offer = state.data?['pendingOffer'];
        if (offer is! Map) return const SizedBox.shrink();
        final seconds = context.read<RidePollCubit>().waitingSeconds;
        final price = AppFormatters.formatCurrency(
          context,
          double.parse(offer['totalPrice'].toString()),
          currencyCode: offer['currency']?.toString() ?? 'KZT',
          decimalDigits: offer['currency'] == 'RUB' ? 2 : 0,
        );
        return AlertDialog(
          title: Text(l.rideWaitTitle),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 20),
              Text(price, style: Theme.of(context).textTheme.headlineSmall),
              Text(l.rideWaitSeconds(seconds)),
              const SizedBox(height: 12),
              Text(l.ridePending),
              if (state.error != null)
                Text(
                  state.error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: state.actionId != null
                  ? null
                  : () => context.read<RidePollCubit>().withdraw(
                      offer['orderId'].toString(),
                    ),
              child: Text(l.rideWithdraw),
            ),
          ],
        );
      },
    ),
  );
}
