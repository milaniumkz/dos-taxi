import 'dart:math';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../home/domain/entities/address_suggestion.dart';
import '../../active_order/domain/entities/active_order_session.dart';
import '../domain/ride_repository.dart';

class RideRequestState {
  const RideRequestState({
    this.quote,
    this.busy = false,
    this.error,
    this.created,
  });
  final Map<String, dynamic>? quote;
  final bool busy;
  final String? error;
  final ActiveOrderSession? created;
}

class RideRequestCubit extends Cubit<RideRequestState> {
  RideRequestCubit(
    this.repository,
    this.pickup,
    this.destination,
    this.serviceType,
  ) : super(const RideRequestState());
  final RideRepository repository;
  AddressSuggestion? pickup, destination;
  bool get routeReady => pickup != null && destination != null;
  final String serviceType;
  static const _defaultPayments = ['cash', 'transfer_kaspi', 'transfer_halyk'];
  List<String> availablePaymentMethods = _defaultPayments;
  int passengers = 1, steps = 0;
  String? manualPrice;
  Map? get manualPolicy => state.quote?['manualPricePolicy'] as Map?;
  bool get usesManualPrice =>
      state.quote == null ||
      manualPolicy != null ||
      state.quote?['priceInputMode'] == 'manual';
  int get manualMinor =>
      ((double.tryParse(manualPrice ?? '') ?? 0) * 100).round();
  String get selectedCurrency => manualPolicy != null
      ? (manualMinor <
                (double.parse(manualPolicy!['kztThreshold'].toString()) * 100)
                    .round()
            ? 'RUB'
            : 'KZT')
      : state.quote?['currency']?.toString() ?? 'KZT';
  int get minimumMinor => manualPolicy != null
      ? (double.parse(
                  manualPolicy![selectedCurrency == 'RUB'
                          ? 'rubMinimum'
                          : 'kztMinimum']
                      .toString(),
                ) *
                100)
            .round()
      : (double.parse((state.quote?['minimumUnitPrice'] ?? '0').toString()) *
                100)
            .round();
  bool get validManualPrice =>
      state.quote == null ||
      !usesManualPrice ||
      (RegExp(r'^\d{1,7}$').hasMatch(manualPrice ?? '') &&
          manualMinor >= minimumMinor);
  void changeManualPrice(String value) {
    if (!usesManualPrice || state.busy) return;
    manualPrice = value;
    emit(RideRequestState(quote: state.quote));
  }

  int _revision = 0;
  String? _key;
  Map<String, dynamic>? _submitted;
  Map<String, dynamic> get _route => {
    'serviceType': serviceType,
    'priceIsTotal': true,
    'passengerCount': passengers,
    'routePoints': [pickup!, destination!]
        .map(
          (a) => {
            'lat': a.location.latitude,
            'lng': a.location.longitude,
            'address': a.displayTitle,
          },
        )
        .toList(),
  };
  Future<void> refreshQuote([int? count]) async {
    if (state.busy && _submitted != null) return;
    final preservedSteps = count != null ? steps : 0;
    if (count != null) passengers = count;
    final revision = ++_revision;
    if (!routeReady) {
      availablePaymentMethods = _defaultPayments;
      emit(const RideRequestState());
      return;
    }
    emit(const RideRequestState(busy: true));
    final result = await repository.quote(_route);
    if (isClosed || revision != _revision) return;
    result.fold(
      (f) {
        availablePaymentMethods = _defaultPayments;
        emit(RideRequestState(error: f.message));
      },
      (q) {
        availablePaymentMethods =
            (q['availablePaymentMethods'] as List?)?.cast<String>() ??
            _defaultPayments;
        steps = preservedSteps;
        if (q['manualPricePolicy'] == null && q['priceInputMode'] != 'manual') {
          manualPrice = null;
        } else {
          manualPrice ??= double.parse(
            q['minimumUnitPrice'].toString(),
          ).ceil().toString();
        }
        emit(RideRequestState(quote: q));
      },
    );
  }

  Future<void> changeAddress(
    AddressSuggestion address, {
    required bool isPickup,
  }) {
    if (isPickup) {
      pickup = address;
    } else {
      destination = address;
    }
    return refreshQuote();
  }

  void changePrice(int delta) {
    if (state.busy || state.quote == null) return;
    steps = (steps + delta).clamp(0, 1000);
    emit(RideRequestState(quote: state.quote));
  }

  Future<void> submit({
    required String payment,
    required String entrance,
    required String comment,
    required bool childSeat,
    required bool shared,
  }) async {
    if (!routeReady || state.busy || state.quote == null || !validManualPrice) {
      return;
    }
    if (!availablePaymentMethods.contains(payment)) return;
    final q = state.quote!;
    final data = {
      ..._route,
      'termsKey': q['termsKey'],
      'priceSteps': usesManualPrice ? 0 : steps,
      if (usesManualPrice) 'unitPrice': (manualMinor / 100).toStringAsFixed(2),
      'paymentMethod': payment,
      'pickupEntrance': entrance.trim(),
      'pickupComment': comment.trim(),
      'needsChildSeat': childSeat,
      'sharedRide': shared,
    };
    if (_submitted?.toString() != data.toString()) {
      _submitted = data;
      _key = _uuid();
    }
    emit(RideRequestState(quote: q, busy: true));
    final result = await repository.create(data, _key!);
    if (isClosed) return;
    result.fold((f) {
      if (f.code == 'RIDE_PRICING_CHANGED') {
        _submitted = null;
        _key = null;
        refreshQuote();
      } else {
        emit(RideRequestState(quote: q, error: f.message));
      }
    }, (order) => emit(RideRequestState(quote: q, created: order)));
  }

  static String _uuid() {
    final random = Random.secure();
    final bytes = List.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    final s = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20)}';
  }
}
