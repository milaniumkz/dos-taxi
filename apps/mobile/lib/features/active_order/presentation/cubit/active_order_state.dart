part of 'active_order_cubit.dart';

const _unset = Object();

class ActiveOrderState {
  const ActiveOrderState({
    required this.session,
    required this.orderStatus,
    required this.etaSeconds,
    this.executorLocation,
    this.executorHeading,
    this.executorName,
    this.executorRating,
    this.executorVehicleLabel,
    this.executorPhone,
    this.executorPhoneMasked,
    this.isConnecting = false,
    this.isCancelling = false,
    this.shouldOpenRating = false,
    this.errorMessage,
  });

  final ActiveOrderSession session;
  final String orderStatus;
  final int etaSeconds;
  final LatLng? executorLocation;
  final double? executorHeading;
  final String? executorName;
  final double? executorRating;
  final String? executorVehicleLabel;
  final String? executorPhone;
  final String? executorPhoneMasked;
  final bool isConnecting;
  final bool isCancelling;
  final bool shouldOpenRating;
  final String? errorMessage;

  ActiveOrderState copyWith({
    ActiveOrderSession? session,
    String? orderStatus,
    int? etaSeconds,
    Object? executorLocation = _unset,
    Object? executorHeading = _unset,
    Object? executorName = _unset,
    Object? executorRating = _unset,
    Object? executorVehicleLabel = _unset,
    Object? executorPhone = _unset,
    Object? executorPhoneMasked = _unset,
    bool? isConnecting,
    bool? isCancelling,
    bool? shouldOpenRating,
    Object? errorMessage = _unset,
  }) {
    return ActiveOrderState(
      session: session ?? this.session,
      orderStatus: orderStatus ?? this.orderStatus,
      etaSeconds: etaSeconds ?? this.etaSeconds,
      executorLocation: executorLocation == _unset
          ? this.executorLocation
          : executorLocation as LatLng?,
      executorHeading: executorHeading == _unset
          ? this.executorHeading
          : executorHeading as double?,
      executorName: executorName == _unset
          ? this.executorName
          : executorName as String?,
      executorRating: executorRating == _unset
          ? this.executorRating
          : executorRating as double?,
      executorVehicleLabel: executorVehicleLabel == _unset
          ? this.executorVehicleLabel
          : executorVehicleLabel as String?,
      executorPhone: executorPhone == _unset
          ? this.executorPhone
          : executorPhone as String?,
      executorPhoneMasked: executorPhoneMasked == _unset
          ? this.executorPhoneMasked
          : executorPhoneMasked as String?,
      isConnecting: isConnecting ?? this.isConnecting,
      isCancelling: isCancelling ?? this.isCancelling,
      shouldOpenRating: shouldOpenRating ?? this.shouldOpenRating,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}
