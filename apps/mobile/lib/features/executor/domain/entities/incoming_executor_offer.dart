import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

class IncomingExecutorOffer extends Equatable {
  const IncomingExecutorOffer({
    required this.orderId,
    required this.serviceType,
    required this.currency,
    required this.paymentMethod,
    required this.price,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.pickupAddress,
    required this.pickupLocation,
    required this.destinationAddress,
    required this.destinationLocation,
    required this.offeredAt,
    this.clientName,
    this.clientPhone,
  });

  final String orderId;
  final String serviceType;
  final String currency;
  final String paymentMethod;
  final double price;
  final int distanceMeters;
  final int durationSeconds;
  final String pickupAddress;
  final LatLng pickupLocation;
  final String destinationAddress;
  final LatLng destinationLocation;
  final DateTime offeredAt;
  final String? clientName;
  final String? clientPhone;

  bool get isDelivery => serviceType == 'delivery';

  @override
  List<Object?> get props => [
    orderId,
    serviceType,
    currency,
    paymentMethod,
    price,
    distanceMeters,
    durationSeconds,
    pickupAddress,
    pickupLocation,
    destinationAddress,
    destinationLocation,
    offeredAt,
    clientName,
    clientPhone,
  ];
}
