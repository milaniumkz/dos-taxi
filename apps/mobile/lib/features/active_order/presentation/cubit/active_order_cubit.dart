import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../domain/entities/active_order_session.dart';
import '../../domain/entities/active_order_tracking_event.dart';
import '../../domain/repositories/active_order_repository.dart';
import '../../domain/services/executor_position_interpolator.dart';

part 'active_order_state.dart';

class ActiveOrderCubit extends Cubit<ActiveOrderState> {
  ActiveOrderCubit({
    required ActiveOrderSession session,
    required ActiveOrderRepository activeOrderRepository,
    required ExecutorPositionInterpolator positionInterpolator,
  }) : _activeOrderRepository = activeOrderRepository,
       _positionInterpolator = positionInterpolator,
       super(
         ActiveOrderState(
           session: session,
           orderStatus: session.initialOrderStatus,
           etaSeconds: session.initialEtaSeconds,
           executorName: session.executorName,
           executorRating: session.executorRating,
           executorVehicleLabel: session.executorVehicleLabel,
           executorPhone: session.executorPhone,
           executorPhoneMasked: _initialMaskedPhone(session.executorPhone),
         ),
       );

  final ActiveOrderRepository _activeOrderRepository;
  final ExecutorPositionInterpolator _positionInterpolator;
  StreamSubscription<ActiveOrderTrackingEvent>? _subscription;
  bool _hasOpenedRating = false;

  Future<void> startTracking() async {
    await _subscription?.cancel();
    emit(state.copyWith(isConnecting: true, errorMessage: null));
    _subscription = _activeOrderRepository
        .trackOrder(state.session)
        .listen(
          (event) {
            unawaited(_handleTrackingEvent(event));
          },
          onError: (_) {
            _emitFailure(
              const Failure(
                code: 'ACTIVE_ORDER_TRACKING_FAILED',
                message: 'Не удалось подключиться к обновлениям заказа',
              ),
            );
          },
        );
  }

  Future<void> cancelOrder() async {
    emit(state.copyWith(isCancelling: true, errorMessage: null));
    final result = await _activeOrderRepository.cancelOrder(
      state.session.orderId,
    );
    if (isClosed) {
      return;
    }

    result.fold(
      _emitFailure,
      (_) => emit(
        state.copyWith(
          isCancelling: false,
          isConnecting: false,
          orderStatus: 'cancelled_client',
          etaSeconds: 0,
          errorMessage: null,
        ),
      ),
    );
  }

  void markRatingOpened() {
    if (!state.shouldOpenRating) {
      return;
    }

    _hasOpenedRating = true;
    emit(state.copyWith(shouldOpenRating: false));
  }

  @override
  Future<void> close() async {
    await _subscription?.cancel();
    return super.close();
  }

  Future<void> _handleTrackingEvent(ActiveOrderTrackingEvent event) async {
    switch (event.type) {
      case ActiveOrderTrackingEventType.statusChanged:
        final nextStatus = event.orderStatus ?? state.orderStatus;
        final statusChanged = nextStatus != state.orderStatus;
        final shouldOpenRating =
            nextStatus == 'completed' && !_hasOpenedRating && statusChanged;
        emit(
          state.copyWith(
            isConnecting: false,
            orderStatus: nextStatus,
            executorName: event.executorName ?? state.executorName,
            executorRating: event.executorRating ?? state.executorRating,
            executorVehicleLabel:
                event.executorVehicleLabel ?? state.executorVehicleLabel,
            executorPhone: event.executorPhone ?? state.executorPhone,
            executorPhoneMasked: _maskPhone(
              event.executorPhone,
              fallback: state.executorPhoneMasked,
            ),
            shouldOpenRating: shouldOpenRating,
            errorMessage: null,
          ),
        );
      case ActiveOrderTrackingEventType.executorLocationUpdated:
        final nextLocation = event.executorLocation;
        if (nextLocation == null) {
          return;
        }

        final currentLocation = state.executorLocation;
        if (currentLocation == null) {
          emit(
            state.copyWith(
              isConnecting: false,
              executorLocation: nextLocation,
              executorHeading: event.executorHeading,
            ),
          );
          return;
        }

        final points = _positionInterpolator.interpolate(
          currentLocation,
          nextLocation,
        );
        for (final point in points.skip(1)) {
          if (isClosed) {
            return;
          }

          emit(
            state.copyWith(
              isConnecting: false,
              executorLocation: point,
              executorHeading: event.executorHeading ?? state.executorHeading,
            ),
          );
          await Future<void>.delayed(const Duration(milliseconds: 110));
        }
      case ActiveOrderTrackingEventType.etaUpdated:
        emit(
          state.copyWith(
            isConnecting: false,
            etaSeconds: event.etaSeconds ?? state.etaSeconds,
          ),
        );
    }
  }

  void _emitFailure(Failure failure) {
    emit(
      state.copyWith(
        isConnecting: false,
        isCancelling: false,
        errorMessage: failure.message,
      ),
    );
  }

  String? _maskPhone(String? phone, {String? fallback}) {
    final normalized = phone?.trim() ?? '';
    if (normalized.isEmpty) {
      return fallback;
    }

    if (!AppFormatters.isCompleteKazakhstanPhone(normalized)) {
      return fallback ?? normalized;
    }

    return AppFormatters.formatKazakhstanPhone(normalized);
  }

  static String? _initialMaskedPhone(String? phone) {
    final normalized = phone?.trim() ?? '';
    if (normalized.isEmpty) {
      return null;
    }
    if (!AppFormatters.isCompleteKazakhstanPhone(normalized)) {
      return normalized;
    }
    return AppFormatters.formatKazakhstanPhone(normalized);
  }
}
