import 'dart:async';
import '../../../core/api/api_client.dart';
import '../../../core/notifications/app_notification_service.dart';
import '../../../core/notifications/web_notification_presenter.dart';
import 'ride_poll_lifecycle.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../../core/utils/app_formatters.dart';
import '../../active_order/data/models/active_order_session_model.dart';
import '../../active_order/presentation/cubit/active_order_cubit.dart';
import '../domain/ride_repository.dart';
import 'ride_poll_cubit.dart';

class RideOffersScreen extends StatelessWidget {
  const RideOffersScreen({super.key, required this.orderId});
  final String orderId;
  @override
  Widget build(BuildContext context) {
    final repository = serviceLocator<RideRepository>();
    WebNotificationPresenter.armAudioOnNextGesture();
    return BlocProvider(
      create: (_) {
        if (serviceLocator.isRegistered<ApiClient>() &&
            serviceLocator.isRegistered<AppNotificationService>()) {
          unawaited(
            serviceLocator<AppNotificationService>().enablePushNotifications(
              serviceLocator<ApiClient>(),
              requestPermission: false,
            ),
          );
        }
        return RidePollCubit(
          repository,
          () => repository.offers(orderId),
          alertInitialItems: true,
          onNewItems: (items) {
            if (!serviceLocator.isRegistered<AppNotificationService>()) return;
            final l = AppLocalizations.of(context)!;
            for (final item in items) {
              final amount = AppFormatters.formatCurrency(
                context,
                double.parse(item['totalPrice'].toString()),
                currencyCode: context
                    .read<ActiveOrderCubit>()
                    .state
                    .session
                    .currency,
              );
              unawaited(
                serviceLocator<AppNotificationService>().showRideOfferAlert(
                  orderId: orderId,
                  offerId: item['id'].toString(),
                  version: '${item['version'] ?? 1}',
                  title: l.rideNewOfferTitle,
                  body: l.rideNewOfferBody(
                    item['driverName']?.toString() ?? '',
                    amount,
                  ),
                ),
              );
            }
          },
        )..start();
      },
      child: RidePollLifecycle(child: _OffersBody(orderId: orderId)),
    );
  }
}

class _OffersBody extends StatelessWidget {
  const _OffersBody({required this.orderId});
  final String orderId;
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return BlocConsumer<RidePollCubit, RidePollState>(
      listener: (context, state) {
        final order = state.data?['order'];
        if (state.selected != null) {
          context.read<ActiveOrderCubit>().applySelection(state.selected!);
        } else if (order is Map<String, dynamic> &&
            order['executorId'] != null &&
            order['status'] != 'searching') {
          context.read<ActiveOrderCubit>().applySelection(
            ActiveOrderSessionModel.fromJson(order),
          );
        }
      },
      builder: (context, state) {
        final items = (state.data?['items'] as List?) ?? [];
        final session = context.watch<ActiveOrderCubit>().state.session;
        final cubit = context.read<RidePollCubit>();
        return Scaffold(
          appBar: AppBar(
            title: Text(l.rideOffersTitle),
            actions: [
              IconButton(
                tooltip: l.rideEnableOfferAlerts,
                icon: const Icon(Icons.notifications_active_outlined),
                onPressed: () async {
                  final notifications =
                      serviceLocator<AppNotificationService>();
                  final soundFuture = notifications.testRideFeedAlert();
                  final pushFuture = notifications.enablePushNotifications(
                    serviceLocator<ApiClient>(),
                  );
                  final push = await pushFuture;
                  final sound = await soundFuture;
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        push && sound
                            ? l.rideOfferAlertsEnabled
                            : push
                            ? l.rideOfferPushOnly
                            : sound
                            ? l.rideOfferSoundOnly
                            : l.rideOfferAlertsBlocked,
                      ),
                    ),
                  );
                },
              ),
              IconButton(
                tooltip: l.rideReload,
                onPressed: cubit.refresh,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.fromAddress.displayTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12),
                          ),
                          Text(
                            session.toAddress.displayTitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (state.loading) const LinearProgressIndicator(),
              if (state.error != null)
                Text(
                  state.error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) => RefreshIndicator(
                    onRefresh: cubit.refresh,
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        if (items.isEmpty && !state.loading)
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(l.rideOffersEmpty),
                          ),
                        for (final item in items)
                          SizedBox(
                            height: constraints.maxHeight / 5,
                            child: _CompactOffer(
                              offer: Map<String, dynamic>.from(item as Map),
                              currency: session.currency,
                              orderId: orderId,
                              disabled: state.actionId != null,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              SafeArea(
                top: false,
                child: TextButton(
                  onPressed:
                      context.watch<ActiveOrderCubit>().state.isCancelling
                      ? null
                      : () => context.read<ActiveOrderCubit>().cancelOrder(),
                  child: Text(l.rideCancel),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CompactOffer extends StatelessWidget {
  const _CompactOffer({
    required this.offer,
    required this.currency,
    required this.orderId,
    required this.disabled,
  });
  final Map<String, dynamic> offer;
  final String currency, orderId;
  final bool disabled;
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final price = AppFormatters.formatCurrency(
      context,
      double.parse(offer['totalPrice'].toString()),
      currencyCode: currency,
      decimalDigits: currency == 'RUB' ? 2 : 0,
    );
    final car = ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehiclePlate']
        .map((k) => offer[k]?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .join(' · ');
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 3),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => BlocProvider.value(
            value: context.read<RidePollCubit>(),
            child: SingleChildScrollView(
              child: _OfferCard(
                offer: offer,
                currency: currency,
                orderId: orderId,
                disabled: disabled,
              ),
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      offer['driverName']?.toString() ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    price,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              Text(
                car,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
              Row(
                children: [
                  const Icon(
                    Icons.star_rounded,
                    color: Color(0xFFFFCC00),
                    size: 16,
                  ),
                  Text(
                    '${offer['driverRating'] ?? '—'}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  if (offer['hasChildSeat'] == true)
                    const Padding(
                      padding: EdgeInsets.only(left: 6),
                      child: Icon(Icons.child_care, size: 16),
                    ),
                  const Spacer(),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 26),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                      textStyle: const TextStyle(fontSize: 11),
                    ),
                    onPressed: disabled
                        ? null
                        : () => context.read<RidePollCubit>().choose(
                            orderId,
                            offer['id'] as String,
                            (offer['version'] as num).toInt(),
                          ),
                    child: Text(l.rideChooseDriver),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.offer,
    required this.currency,
    required this.orderId,
    required this.disabled,
  });
  final Map<String, dynamic> offer;
  final String currency, orderId;
  final bool disabled;
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final car = ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehiclePlate']
        .map((k) => offer[k]?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .join(' · ');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              offer['driverName']?.toString() ?? '',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text('${l.rideRating}: ${offer['driverRating'] ?? '—'}'),
            Text(car),
            Text(
              AppFormatters.formatCurrency(
                context,
                double.parse(offer['totalPrice'].toString()),
                currencyCode: currency,
                decimalDigits: currency == 'RUB' ? 2 : 0,
              ),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (offer['hasChildSeat'] == true) Text(l.rideChildSeat),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: disabled
                  ? null
                  : () => context.read<RidePollCubit>().choose(
                      orderId,
                      offer['id'] as String,
                      (offer['version'] as num).toInt(),
                    ),
              child: Text(l.rideChooseDriver),
            ),
          ],
        ),
      ),
    );
  }
}
