import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

enum ActiveOrderTrackingEventType {
  statusChanged,
  executorLocationUpdated,
  etaUpdated,
}

class ActiveOrderTrackingEvent extends Equatable {
  const ActiveOrderTrackingEvent._({
    required this.type,
    this.orderStatus,
    this.executorLocation,
    this.executorHeading,
    this.etaSeconds,
    this.executorName,
    this.executorRating,
    this.executorVehicleLabel,
    this.executorPhone,
  });

  const ActiveOrderTrackingEvent.statusChanged({
    required String orderStatus,
    String? executorName,
    double? executorRating,
    String? executorVehicleLabel,
    String? executorPhone,
  }) : this._(
         type: ActiveOrderTrackingEventType.statusChanged,
         orderStatus: orderStatus,
         executorName: executorName,
         executorRating: executorRating,
         executorVehicleLabel: executorVehicleLabel,
         executorPhone: executorPhone,
       );

  const ActiveOrderTrackingEvent.executorLocationUpdated({
    required LatLng executorLocation,
    double? executorHeading,
  }) : this._(
         type: ActiveOrderTrackingEventType.executorLocationUpdated,
         executorLocation: executorLocation,
         executorHeading: executorHeading,
       );

  const ActiveOrderTrackingEvent.etaUpdated({required int etaSeconds})
    : this._(
        type: ActiveOrderTrackingEventType.etaUpdated,
        etaSeconds: etaSeconds,
      );

  final ActiveOrderTrackingEventType type;
  final String? orderStatus;
  final LatLng? executorLocation;
  final double? executorHeading;
  final int? etaSeconds;
  final String? executorName;
  final double? executorRating;
  final String? executorVehicleLabel;
  final String? executorPhone;

  @override
  List<Object?> get props => [
    type,
    orderStatus,
    executorLocation,
    executorHeading,
    etaSeconds,
    executorName,
    executorRating,
    executorVehicleLabel,
    executorPhone,
  ];
}
