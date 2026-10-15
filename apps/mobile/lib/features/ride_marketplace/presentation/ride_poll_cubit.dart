import 'dart:async';
import 'package:dartz/dartz.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/errors/failure.dart';
import '../../active_order/domain/entities/active_order_session.dart';
import '../domain/ride_repository.dart';

class RidePollState {
  const RidePollState({
    this.data,
    this.error,
    this.loading = false,
    this.actionId,
    this.selected,
  });
  final Map<String, dynamic>? data;
  final String? error, actionId;
  final bool loading;
  final ActiveOrderSession? selected;
}

class RidePollCubit extends Cubit<RidePollState> {
  RidePollCubit(
    this.repository,
    this.load, {
    this.nextPage,
    this.onNewRequests,
    this.onNewItems,
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now,
       super(const RidePollState());
  final DateTime Function() _now;
  final RideRepository repository;
  final Future<Either<Failure, Map<String, dynamic>>> Function() load;
  final Future<Either<Failure, Map<String, dynamic>>> Function(int offset)?
  nextPage;
  final void Function()? onNewRequests;
  final void Function(List<Map<String, dynamic>> items)? onNewItems;
  String _identity(Map row) => "${row['id']}:${row['version'] ?? 1}";
  final Set<String> _seenRequests = {};
  bool _feedInitialized = false;
  int _pages = 1;
  Timer? _timer, _clock;
  bool _fetching = false;
  int _generation = 0;
  void start() {
    refresh();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => refresh());
    _clock?.cancel();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    _tick();
  }

  void pause() {
    _timer?.cancel();
    _timer = null;
    _clock?.cancel();
    _clock = null;
  }

  Future<void> refresh() async {
    if (_fetching || state.actionId != null || isClosed) return;
    _fetching = true;
    final generation = _generation;
    if (state.data == null) emit(const RidePollState(loading: true));
    try {
      var result = await load();
      final firstPage = result.fold(
        (_) => <dynamic>[],
        (data) => data['items'] as List? ?? <dynamic>[],
      );
      for (var page = 1; page < _pages && nextPage != null; page++) {
        Map<String, dynamic>? current;
        result.fold((_) {}, (data) => current = data);
        final offset = current?['nextOffset'] as int?;
        if (offset == null) break;
        final following = await nextPage!(offset);
        result = following.map(
          (data) => {
            ...data,
            'items': [...current!['items'] as List, ...data['items'] as List],
          },
        );
      }
      if (isClosed || generation != _generation) return;
      result.fold(
        (f) => emit(RidePollState(data: state.data, error: f.message)),
        (data) {
          final newItems = _feedInitialized
              ? firstPage
                    .where((r) => !_seenRequests.contains(_identity(r as Map)))
                    .map((r) => Map<String, dynamic>.from(r as Map))
                    .toList()
              : <Map<String, dynamic>>[];
          final hasNew = newItems.isNotEmpty;
          _seenRequests.addAll(
            (data['items'] as List? ?? []).map((r) => _identity(r as Map)),
          );
          _feedInitialized = true;
          emit(RidePollState(data: _waitingData(data)));
          if (hasNew) {
            onNewRequests?.call();
            onNewItems?.call(newItems);
          }
        },
      );
    } finally {
      _fetching = false;
    }
  }

  Future<void> more() async {
    if (_fetching ||
        state.actionId != null ||
        state.data?['nextOffset'] == null) {
      return;
    }
    _pages++;
    await refresh();
  }

  Future<void> choose(String order, String offer, int version) async {
    if (state.actionId != null) return;
    _generation++;
    emit(RidePollState(data: state.data, actionId: offer));
    final result = await repository.accept(order, offer, version);
    if (isClosed) return;
    result.fold(
      (f) => emit(RidePollState(data: state.data, error: f.message)),
      (s) {
        pause();
        emit(RidePollState(data: state.data, selected: s));
      },
    );
  }

  Future<void> propose(String id, int steps, bool child) =>
      _action(id, () => repository.propose(id, steps, child), proposal: true);
  Future<void> withdraw(String id) =>
      _action(id, () => repository.withdraw(id));
  Future<void> _action(
    String id,
    Future<Either<Failure, Map<String, dynamic>>> Function() action, {
    bool proposal = false,
  }) async {
    if (state.actionId != null) return;
    _generation++;
    emit(RidePollState(data: state.data, actionId: id));
    final result = await action();
    if (isClosed) return;
    result.fold(
      (f) => emit(RidePollState(data: state.data, error: f.message)),
      (response) {
        final data = {...?state.data};
        data['pendingOffer'] = proposal && response['expiresAt'] != null
            ? {...response, 'orderId': id}
            : null;
        data['serverTime'] = response['serverTime'];
        emit(RidePollState(data: _waitingData(data)));
      },
    );
    if (state.error == null) await refresh();
  }

  Map<String, dynamic> _waitingData(Map<String, dynamic> data) {
    final pending = data['pendingOffer'];
    if (pending is! Map) return data;
    final expires = DateTime.tryParse(pending['expiresAt']?.toString() ?? '');
    final server =
        DateTime.tryParse(data['serverTime']?.toString() ?? '') ?? _now();
    if (expires == null) return {...data, 'pendingOffer': null};
    final ms = expires.difference(server).inMilliseconds.clamp(0, 30000);
    return {
      ...data,
      'pendingOffer': {
        ...pending,
        'clientExpiresAt': _now()
            .add(Duration(milliseconds: ms))
            .toIso8601String(),
      },
    };
  }

  int get waitingSeconds {
    final offer = state.data?['pendingOffer'];
    final deadline = offer is Map
        ? DateTime.tryParse(offer['clientExpiresAt']?.toString() ?? '')
        : null;
    return deadline == null
        ? 0
        : (deadline.difference(_now()).inMilliseconds / 1000).ceil().clamp(
            0,
            30,
          );
  }

  void _tick() {
    if (isClosed || state.data?['pendingOffer'] == null) return;
    final data = {...state.data!};
    final pending = Map<String, dynamic>.from(data['pendingOffer'] as Map);
    final expiry = DateTime.tryParse(
      pending['clientExpiresAt']?.toString() ?? '',
    );
    if (expiry == null || !expiry.isAfter(_now())) {
      data['pendingOffer'] = null;
      emit(
        RidePollState(data: data, error: state.error, actionId: state.actionId),
      );
      unawaited(refresh());
    } else {
      emit(
        RidePollState(data: data, error: state.error, actionId: state.actionId),
      );
    }
  }

  @override
  Future<void> close() {
    pause();
    return super.close();
  }
}
