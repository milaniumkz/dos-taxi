part of 'incoming_order_cubit.dart';

class IncomingOrderState extends Equatable {
  const IncomingOrderState({
    this.currentOffer,
    this.secondsRemaining = 0,
    this.isListening = false,
    this.isSubmitting = false,
    this.activeOrderSession,
    this.shouldCloseActiveOrder = false,
    this.errorMessage,
  });

  final IncomingExecutorOffer? currentOffer;
  final int secondsRemaining;
  final bool isListening;
  final bool isSubmitting;
  final ExecutorActiveOrderSession? activeOrderSession;
  final bool shouldCloseActiveOrder;
  final String? errorMessage;

  IncomingOrderState copyWith({
    Object? currentOffer = _unset,
    int? secondsRemaining,
    bool? isListening,
    bool? isSubmitting,
    Object? activeOrderSession = _unset,
    bool? shouldCloseActiveOrder,
    Object? errorMessage = _unset,
  }) {
    return IncomingOrderState(
      currentOffer: currentOffer == _unset
          ? this.currentOffer
          : currentOffer as IncomingExecutorOffer?,
      secondsRemaining: secondsRemaining ?? this.secondsRemaining,
      isListening: isListening ?? this.isListening,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      activeOrderSession: activeOrderSession == _unset
          ? this.activeOrderSession
          : activeOrderSession as ExecutorActiveOrderSession?,
      shouldCloseActiveOrder:
          shouldCloseActiveOrder ?? this.shouldCloseActiveOrder,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [
    currentOffer,
    secondsRemaining,
    isListening,
    isSubmitting,
    activeOrderSession,
    shouldCloseActiveOrder,
    errorMessage,
  ];
}

const _unset = Object();
