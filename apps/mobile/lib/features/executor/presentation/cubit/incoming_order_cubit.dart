import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/notifications/app_notification_service.dart';
import '../../domain/entities/executor_active_order_session.dart';
import '../../domain/entities/executor_profile.dart';
import '../../domain/entities/incoming_executor_offer.dart';
import '../../domain/repositories/executor_repository.dart';

part 'incoming_order_state.dart';

class IncomingOrderCubit extends Cubit<IncomingOrderState> {
  IncomingOrderCubit({
    required ExecutorRepository executorRepository,
    AppNotificationService? notificationService,
    Duration countdownTick = const Duration(seconds: 1),
    int offerLifetimeSeconds = 20,
  }) : _executorRepository = executorRepository,
       _notificationService = notificationService,
       _countdownTick = countdownTick,
       _offerLifetimeSeconds = offerLifetimeSeconds,
       super(const IncomingOrderState());

  final ExecutorRepository _executorRepository;
  final AppNotificationService? _notificationService;
  final Duration _countdownTick;
  final int _offerLifetimeSeconds;
  StreamSubscription<IncomingExecutorOffer>? _incomingSubscription;
  Timer? _countdownTimer;
  Timer? _activeOrderPollTimer;
  String? _listeningExecutorId;
  ExecutorProfile? _lastProfile;

  Future<void> synchronizeDashboardSession(ExecutorProfile profile) async {
    _lastProfile = profile;
    final result = await _executorRepository.fetchActiveOrder();
    if (isClosed) {
      return;
    }

    Failure? failure;
    ExecutorActiveOrderSession? session;
    result.fold((left) => failure = left, (right) => session = right);

    if (failure != null) {
      _emitFailure(failure!);
      return;
    }

    if (session != null) {
      _cancelCountdown();
      await _incomingSubscription?.cancel();
      _incomingSubscription = null;
      _listeningExecutorId = profile.id;
      emit(
        state.copyWith(
          isListening: false,
          isSubmitting: false,
          currentOffer: null,
          secondsRemaining: 0,
          activeOrderSession: session,
          shouldCloseActiveOrder: false,
          errorMessage: null,
        ),
      );
      _startActiveOrderPolling();
      return;
    }

    await startListening(profile);
  }

  Future<void> startListening(ExecutorProfile profile) async {
    _lastProfile = profile;
    if (state.activeOrderSession != null) {
      return;
    }

    if (_listeningExecutorId == profile.id && state.isListening) {
      return;
    }

    await _incomingSubscription?.cancel();
    emit(state.copyWith(isListening: true, errorMessage: null));
    _listeningExecutorId = profile.id;
    _incomingSubscription = _executorRepository
        .watchIncomingOrders(profile: profile)
        .listen(
          _handleOffer,
          onError: (_) => _emitFailure(
            const Failure(
              code: 'EXECUTOR_INCOMING_ORDERS_FAILED',
              message: 'Не удалось получить входящие заказы',
            ),
          ),
        );
  }

  Future<void> stopListening() async {
    _cancelCountdown();
    _notificationService?.stopDriverIncomingOrderAlarm();
    _cancelActiveOrderPolling();
    _listeningExecutorId = null;
    await _incomingSubscription?.cancel();
    _incomingSubscription = null;
    emit(
      state.copyWith(
        isListening: false,
        currentOffer: null,
        secondsRemaining: 0,
      ),
    );
  }

  Future<void> acceptCurrentOffer() async {
    final offer = state.currentOffer;
    if (offer == null) {
      return;
    }

    emit(state.copyWith(isSubmitting: true, errorMessage: null));
    final result = await _executorRepository.acceptIncomingOrder(offer.orderId);
    if (isClosed) {
      return;
    }

    result.fold(_emitFailure, (_) {
      _cancelCountdown();
      _notificationService?.stopDriverIncomingOrderAlarm();
      emit(
        state.copyWith(
          isSubmitting: false,
          currentOffer: null,
          secondsRemaining: 0,
          activeOrderSession: ExecutorActiveOrderSession.fromOffer(offer),
          shouldCloseActiveOrder: false,
          errorMessage: null,
        ),
      );
      _startActiveOrderPolling();
    });
  }

  Future<void> rejectCurrentOffer() async {
    final offer = state.currentOffer;
    if (offer == null) {
      return;
    }

    emit(state.copyWith(isSubmitting: true, errorMessage: null));
    final result = await _executorRepository.rejectIncomingOrder(offer.orderId);
    if (isClosed) {
      return;
    }

    result.fold(_emitFailure, (_) {
      _cancelCountdown();
      _notificationService?.stopDriverIncomingOrderAlarm();
      emit(
        state.copyWith(
          isSubmitting: false,
          currentOffer: null,
          secondsRemaining: 0,
          errorMessage: null,
        ),
      );
    });
  }

  Future<void> markTaxiArrived({LatLng? location}) =>
      _syncActiveOrderStatus('waiting', location: location);

  Future<void> startTaxiTrip({LatLng? location}) =>
      _syncActiveOrderStatus('in_progress', location: location);

  Future<void> completeTaxiTrip({
    LatLng? location,
    int? actualDistanceMeters,
  }) => _syncActiveOrderStatus(
    'completed',
    location: location,
    actualDistanceMeters: actualDistanceMeters,
    shouldCloseAfter: true,
  );

  Future<void> pickupDeliveryOrder() => _syncActiveOrderStatus('picked_up');

  Future<void> markDeliveryInTransit() => _syncActiveOrderStatus('in_transit');

  Future<void> markDeliveryAtDoor() => _syncActiveOrderStatus('at_door');

  Future<void> completeDelivery({
    String? proofPhotoPath,
    String? recipientCode,
  }) => _syncActiveOrderStatus(
    'delivered_confirmed',
    proofPhotoPath: proofPhotoPath,
    recipientCode: recipientCode,
    shouldCloseAfter: true,
  );

  Future<void> failDelivery({String? failureReason}) => _syncActiveOrderStatus(
    'delivery_failed',
    failureReason: failureReason,
    shouldCloseAfter: true,
  );

  void clearClosedActiveOrder() {
    _cancelActiveOrderPolling();
    emit(
      state.copyWith(
        activeOrderSession: null,
        shouldCloseActiveOrder: false,
        errorMessage: null,
      ),
    );
    final profile = _lastProfile;
    if (profile != null && profile.isOnline) {
      unawaited(startListening(profile));
    }
  }

  @override
  Future<void> close() async {
    _cancelCountdown();
    _notificationService?.stopDriverIncomingOrderAlarm();
    _cancelActiveOrderPolling();
    await _incomingSubscription?.cancel();
    return super.close();
  }

  void _handleOffer(IncomingExecutorOffer offer) {
    if (state.activeOrderSession != null ||
        state.currentOffer?.orderId == offer.orderId) {
      return;
    }

    unawaited(_notificationService?.showIncomingOrder(offer));
    _cancelCountdown();
    emit(
      state.copyWith(
        currentOffer: offer,
        secondsRemaining: _offerLifetimeSeconds,
        errorMessage: null,
      ),
    );
    _countdownTimer = Timer.periodic(_countdownTick, (timer) {
      final nextValue = state.secondsRemaining - 1;
      if (nextValue <= 0) {
        _handleTimeout();
        return;
      }
      emit(state.copyWith(secondsRemaining: nextValue));
    });
  }

  Future<void> _syncActiveOrderStatus(
    String nextStatus, {
    String? proofPhotoPath,
    String? recipientCode,
    String? failureReason,
    LatLng? location,
    int? actualDistanceMeters,
    bool shouldCloseAfter = false,
  }) async {
    final session = state.activeOrderSession;
    if (session == null) {
      return;
    }

    emit(
      state.copyWith(
        isSubmitting: true,
        shouldCloseActiveOrder: false,
        errorMessage: null,
      ),
    );
    final result = await _executorRepository.syncActiveOrderStatus(
      session: session,
      nextStatus: nextStatus,
      proofPhotoPath: proofPhotoPath,
      recipientCode: recipientCode,
      failureReason: failureReason,
      location: location,
      actualDistanceMeters: actualDistanceMeters,
    );
    if (isClosed) {
      return;
    }

    result.fold(_emitFailure, (_) {
      emit(
        state.copyWith(
          isSubmitting: false,
          activeOrderSession: session.copyWith(
            status: nextStatus,
            proofPhotoPath: proofPhotoPath,
            recipientCode: recipientCode,
          ),
          shouldCloseActiveOrder: shouldCloseAfter,
          errorMessage: null,
        ),
      );
    });
  }

  void _handleTimeout() {
    _cancelCountdown();
    _notificationService?.stopDriverIncomingOrderAlarm();
    emit(
      state.copyWith(
        currentOffer: null,
        secondsRemaining: 0,
        isSubmitting: false,
        errorMessage: null,
      ),
    );
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
  }

  void _startActiveOrderPolling() {
    _cancelActiveOrderPolling();
    _activeOrderPollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      unawaited(_pollActiveOrderSnapshot());
    });
  }

  void _cancelActiveOrderPolling() {
    _activeOrderPollTimer?.cancel();
    _activeOrderPollTimer = null;
  }

  Future<void> _pollActiveOrderSnapshot() async {
    final currentSession = state.activeOrderSession;
    if (currentSession == null || isClosed) {
      return;
    }

    final result = await _executorRepository.fetchActiveOrder();
    if (isClosed) {
      return;
    }

    result.fold((_) {}, (session) {
      if (session == null) {
        _cancelActiveOrderPolling();
        emit(
          state.copyWith(
            activeOrderSession: null,
            shouldCloseActiveOrder: true,
            isSubmitting: false,
            currentOffer: null,
            secondsRemaining: 0,
            errorMessage: null,
          ),
        );
        return;
      }

      if (session.orderId == currentSession.orderId &&
          session != currentSession) {
        emit(
          state.copyWith(
            activeOrderSession: session,
            shouldCloseActiveOrder: false,
            errorMessage: null,
          ),
        );
      }
    });
  }

  void _emitFailure(Failure failure) {
    emit(
      state.copyWith(
        isListening: state.isListening,
        isSubmitting: false,
        errorMessage: failure.message,
      ),
    );
  }
}
