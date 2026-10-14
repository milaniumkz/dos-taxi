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
  RidePollCubit(this.repository, this.load, {this.nextPage})
    : super(const RidePollState());
  final RideRepository repository;
  final Future<Either<Failure, Map<String, dynamic>>> Function() load;
  final Future<Either<Failure, Map<String, dynamic>>> Function(int offset)?
  nextPage;
  int _pages = 1;
  Timer? _timer;
  bool _fetching = false;
  int _generation = 0;
  void start() {
    refresh();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => refresh());
  }

  void pause() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> refresh() async {
    if (_fetching || state.actionId != null || isClosed) return;
    _fetching = true;
    final generation = _generation;
    if (state.data == null) emit(const RidePollState(loading: true));
    try {
      var result = await load();
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
        (data) => emit(RidePollState(data: data)),
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
      _action(id, () => repository.propose(id, steps, child));
  Future<void> withdraw(String id) =>
      _action(id, () => repository.withdraw(id));
  Future<void> _action(
    String id,
    Future<Either<Failure, Map<String, dynamic>>> Function() action,
  ) async {
    if (state.actionId != null) return;
    _generation++;
    emit(RidePollState(data: state.data, actionId: id));
    final result = await action();
    if (isClosed) return;
    result.fold(
      (f) => emit(RidePollState(data: state.data, error: f.message)),
      (_) => emit(RidePollState(data: state.data)),
    );
    if (state.error == null) await refresh();
  }

  @override
  Future<void> close() {
    pause();
    return super.close();
  }
}
